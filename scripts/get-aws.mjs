import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { SQSClient, ListQueuesCommand } from "@aws-sdk/client-sqs";
import { SNSClient, ListTopicsCommand } from "@aws-sdk/client-sns";

async function main() {
    const region = "eu-north-1";
    const s3 = new S3Client({ region });
    const sqs = new SQSClient({ region });
    const sns = new SNSClient({ region });

    const s3res = await s3.send(new ListBucketsCommand({}));
    const bucket = s3res.Buckets.find(b => b.Name.includes("cloudvcs"));
    
    const sqsres = await sqs.send(new ListQueuesCommand({QueueNamePrefix: "cloudvcs"}));
    const queue = sqsres.QueueUrls ? sqsres.QueueUrls[0] : null;

    const snsres = await sns.send(new ListTopicsCommand({}));
    const topic = snsres.Topics.find(t => t.TopicArn.includes("cloudvcs"));

    console.log("---- RESULTS ----");
    console.log(`AWS_S3_BUCKET_NAME=${bucket ? bucket.Name : 'NOT_FOUND'}`);
    console.log(`AWS_SQS_QUEUE_URL=${queue ? queue : 'NOT_FOUND'}`);
    console.log(`AWS_SNS_TOPIC_ARN=${topic ? topic.TopicArn : 'NOT_FOUND'}`);
}
main();
