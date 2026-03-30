import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const repoId = searchParams.get('repoId')

    if (!repoId) {
        return NextResponse.json({ error: 'repoId required' }, { status: 400 })
    }

    try {
        const dynamodb = new DynamoDBClient({
            region: process.env.NEXT_PUBLIC_AWS_REGION || process.env.AWS_REGION || 'eu-north-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            }
        })

        const command = new QueryCommand({
            TableName: "CloudVCS_Analytics",
            KeyConditionExpression: "repo_id = :rId",
            ExpressionAttributeValues: {
                ":rId": { S: repoId }
            },
            ScanIndexForward: false, // Descending by sort key (commit_timestamp)
            Limit: 20
        })

        const data = await dynamodb.send(command)
        
        // Map DynamoDB structure back to clean JSON
        const items = (data.Items || []).map(item => ({
            timestamp: item.commit_timestamp?.S,
            commitId: item.commit_id?.S,
            readabilityScore: parseInt(item.readability_score?.N || '0'),
            mentorFeedback: item.mentor_feedback?.S,
            criticalBug: item.critical_bug?.BOOL
        }))

        return NextResponse.json(items)
    } catch (e) {
        console.error('DynamoDB Error:', e)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}
