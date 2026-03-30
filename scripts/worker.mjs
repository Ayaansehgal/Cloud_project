import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const region = process.env.NEXT_PUBLIC_AWS_REGION || process.env.AWS_REGION || "eu-north-1";
const creds = { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY };

const sqs = new SQSClient({ region, credentials: creds });
const s3 = new S3Client({ region, credentials: creds });
const dynamodb = new DynamoDBClient({ region, credentials: creds });
const sns = new SNSClient({ region, credentials: creds });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function processMessage(msg) {
    console.log(`\n📨 Received SQS Message: ${msg.MessageId}`);
    const body = JSON.parse(msg.Body);
    const { repoId, commitId, userId } = body;

    console.log(`[Worker] Started processing PR for Commit: ${commitId}`);

    // 1. Fetch Tree Entries from Supabase
    const { data: entries } = await supabase.from('tree_entries').select('*').eq('commit_id', commitId);
    if (!entries || entries.length === 0) {
        console.log("No files to review.");
        return;
    }

    // 2. Fetch Blobs from S3
    let combinedContext = '';
    for (const entry of entries) {
        try {
            const { Body } = await s3.send(new GetObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: entry.blob_hash
            }));
            const code = await Body.transformToString();
            combinedContext += `\n--- File: ${entry.path} ---\n${code}\n`;
        } catch (e) {
            console.error(`Error fetching blob ${entry.blob_hash} from S3:`, e.message);
        }
    }

    // 3. Gemini "AI Mentor" Prompt
    const prompt = `You are an expert AI Programming Mentor helping a non-CS beginner.
Review the following code commit. 
Calculate a "Readability Score" from 0 to 100 representing how clean, readable, and beginner-friendly the code is.
Determine if there are any critical bugs or security risks (is_critical_bug: boolean).
Write an "Explain Like I'm 5" summary of what this code does and how to improve it.

Code Context:
${combinedContext}

Return ONLY valid JSON in this exact structure:
{
  "readability_score": number,
  "is_critical_bug": boolean,
  "summary": "Short 1 sentence summary",
  "mentor_feedback": "Detailed paragraph explaining the code and improvements as if talking to a beginner.",
  "bugs_found": ["bug 1", "bug 2"]
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: 'application/json' } });
    let aiResult;
    try {
        const result = await model.generateContent(prompt);
        const rawText = result.response.text();
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        aiResult = JSON.parse(cleanedText);
        console.log(`✅ AI Mentor Review Complete. Score: ${aiResult.readability_score}/100`);
    } catch (e) {
        console.error("AI Review failed:", e.message);
        return;
    }

    // 4. Update the Commit in Supabase with the AI Summary
    await supabase.from('commits').update({ ai_summary: aiResult.summary }).eq('id', commitId);

    // 5. Write Analytics to DynamoDB (Polyglot Persistence)
    await dynamodb.send(new PutItemCommand({
        TableName: "CloudVCS_Analytics",
        Item: {
            "repo_id": { S: repoId },
            "commit_timestamp": { S: new Date().toISOString() },
            "commit_id": { S: commitId },
            "user_id": { S: userId },
            "readability_score": { N: String(aiResult.readability_score || 0) },
            "mentor_feedback": { S: aiResult.mentor_feedback || "No feedback." },
            "critical_bug": { BOOL: !!aiResult.is_critical_bug }
        }
    }));
    console.log(`✅ Saved readbility score ${aiResult.readability_score} to DynamoDB.`);

    // 6. Push to SNS if critical bug found
    if (aiResult.is_critical_bug || (aiResult.bugs_found && aiResult.bugs_found.length > 0)) {
        console.log("⚠️ Critical bug detected! Publishing to Amazon SNS...");
        await sns.send(new PublishCommand({
            TopicArn: process.env.AWS_SNS_TOPIC_ARN,
            Subject: `CloudVCS AI Mentor Alert!`,
            Message: `Hi there! Your AI Mentor noticed a bug in your latest commit.\n\nSummary: ${aiResult.summary}\n\nFeedback:\n${aiResult.mentor_feedback}\n\nBugs Found:\n- ${aiResult.bugs_found.join('\n- ')}\n\nHappy coding!`
        }));
    }
}

async function pollQueue() {
    console.log("☁️  CloudVCS Serverless Mentor Worker is listening to SQS...");
    const queueUrl = process.env.AWS_SQS_QUEUE_URL;

    while (true) {
        try {
            const { Messages } = await sqs.send(new ReceiveMessageCommand({
                QueueUrl: queueUrl,
                WaitTimeSeconds: 20, // Long polling
                MaxNumberOfMessages: 1
            }));

            if (Messages && Messages.length > 0) {
                for (const msg of Messages) {
                    await processMessage(msg);
                    await sqs.send(new DeleteMessageCommand({
                        QueueUrl: queueUrl,
                        ReceiptHandle: msg.ReceiptHandle
                    }));
                    console.log(`[Worker] SQS Message deleted from queue.`);
                }
            }
        } catch (e) {
            console.error("SQS Polling Error:", e.message);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

pollQueue();
