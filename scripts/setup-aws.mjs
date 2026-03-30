import { S3Client, CreateBucketCommand } from "@aws-sdk/client-s3";
import { SQSClient, CreateQueueCommand } from "@aws-sdk/client-sqs";
import { SNSClient, CreateTopicCommand, SubscribeCommand } from "@aws-sdk/client-sns";
import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";
import crypto from 'crypto';
import readline from 'readline';

// Initialize CLI Interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
    console.log("🚀 Starting CloudVCS AWS Setup (AWS Free-Tier Optimized)");
    console.log("---------------------------------------------------------");
    console.log("All services being created are strictly within the AWS Always-Free or 12-Month Free limits!");
    
    // 1. Verify Credentials Available
    const region = process.env.AWS_REGION || 'us-east-1';
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error("❌ ERROR: Missing AWS credentials in environment.");
        console.log("Please ensure .env.local has AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY defined.");
        process.exit(1);
    }
    console.log(`✅ AWS Credentials loaded. Using Region: ${region}`);

    // Create Clients
    const s3 = new S3Client({ region });
    const sqs = new SQSClient({ region });
    const sns = new SNSClient({ region });
    const dynamodb = new DynamoDBClient({ region });

    // 2. Setup S3 (Object Storage)
    const bucketPrefix = "cloudvcs-blobs-";
    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    const bucketName = `${bucketPrefix}${uniqueSuffix}`;

    console.log(`\n📦 1. Creating S3 Bucket: ${bucketName}...`);
    try {
        await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log("✅ S3 Bucket created successfully! (First 5GB/month is Always Free)");
    } catch (e) {
        console.error("❌ Failed to create S3 bucket:", e.message);
    }

    // 3. Setup SQS (Queueing)
    const queueName = "cloudvcs-mentor-queue";
    let queueUrl = "";
    console.log(`\n📨 2. Creating SQS Queue: ${queueName}...`);
    try {
        const res = await sqs.send(new CreateQueueCommand({ QueueName: queueName }));
        queueUrl = res.QueueUrl;
        console.log(`✅ SQS Queue created successfully! (First 1 Million requests/month are Always Free)`);
        console.log(`   URL: ${queueUrl}`);
    } catch (e) {
        console.error("❌ Failed to create SQS Queue:", e.message);
    }

    // 4. Setup SNS (Topic Notifications)
    const topicName = "cloudvcs-alerts";
    let topicArn = "";
    console.log(`\n📬 3. Creating SNS Topic: ${topicName}...`);
    try {
        const res = await sns.send(new CreateTopicCommand({ Name: topicName }));
        topicArn = res.TopicArn;
        console.log(`✅ SNS Topic created successfully! (First 1,000 emails/month are Always Free)`);
        console.log(`   ARN: ${topicArn}`);
        console.log(`   (You can subscribe an email to this topic via the AWS Console later)`);
    } catch (e) {
        console.error("❌ Failed to create SNS Topic:", e.message);
    }

    // 5. Setup DynamoDB (Analytics Persistence)
    const tableName = "CloudVCS_Analytics";
    console.log(`\n⚡ 4. Creating DynamoDB Table: ${tableName}...`);
    try {
        await dynamodb.send(new CreateTableCommand({
            TableName: tableName,
            AttributeDefinitions: [
                { AttributeName: "repo_id", AttributeType: "S" },
                { AttributeName: "commit_timestamp", AttributeType: "S" }
            ],
            KeySchema: [
                { AttributeName: "repo_id", KeyType: "HASH" }, // Partition key
                { AttributeName: "commit_timestamp", KeyType: "RANGE" } // Sort key
            ],
            // Hardcoding 5 Write/Read capacity ensures we stay heavily below the 25 limit of Always Free.
            ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
            }
        }));
        console.log(`✅ DynamoDB Table created successfully! (First 25 GB/month and 25 RCU/WCU are Always Free)`);
    } catch (e) {
        if (e.name === 'ResourceInUseException') {
            console.log(`✅ DynamoDB Table '${tableName}' already exists.`);
        } else {
            console.error("❌ Failed to create DynamoDB Table:", e.message);
        }
    }

    // Summary
    console.log("\n=========================================================");
    console.log("🎉 SUCCESS! Please add these to your .env.local file:");
    console.log("=========================================================");
    console.log(`NEXT_PUBLIC_AWS_REGION=${region}`);
    console.log(`AWS_S3_BUCKET_NAME=${bucketName}`);
    console.log(`AWS_SQS_QUEUE_URL=${queueUrl}`);
    console.log(`AWS_SNS_TOPIC_ARN=${topicArn}`);
    console.log("=========================================================");
    
    rl.close();
}

main().catch(console.error);
