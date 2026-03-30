import { NextRequest, NextResponse } from 'next/server'
import { createCommit, getCommitHistory, getCommitFiles, computeDiff, rollbackToCommit } from '@/lib/versioning'
import { generateCommitSummary } from '@/lib/ai-review'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const repoId = searchParams.get('repoId')
    const commitId = searchParams.get('commitId')

    if (commitId) {
        const files = await getCommitFiles(commitId)
        return NextResponse.json(files)
    }

    if (!repoId) {
        return NextResponse.json({ error: 'repoId required' }, { status: 400 })
    }

    const history = await getCommitHistory(repoId)
    return NextResponse.json(history)
}

export async function POST(req: NextRequest) {
    const body = await req.json()
    const userId = req.headers.get('x-user-id')

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { repoId, message, files } = body

    if (!repoId || !files || files.length === 0) {
        return NextResponse.json({ error: 'repoId and files required' }, { status: 400 })
    }

    // 1. Instantly save the raw commit data
    const commit = await createCommit(repoId, message, files, userId)

    // 2. Offload heavy AI Mentorship processing to Amazon SQS
    try {
        const { SQSClient, SendMessageCommand } = await import('@aws-sdk/client-sqs')
        const sqs = new SQSClient({
            region: process.env.NEXT_PUBLIC_AWS_REGION || process.env.AWS_REGION || 'eu-north-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            }
        })

        await sqs.send(new SendMessageCommand({
            QueueUrl: process.env.AWS_SQS_QUEUE_URL || 'cloudvcs-mentor-queue',
            MessageBody: JSON.stringify({
                repoId,
                commitId: commit.id,
                userId
            })
        }))
        console.log(`[SQS] Sent commit ${commit.id} to Mentor Queue.`)
    } catch (e) {
        console.error('[SQS ERROR] Failed to notify SQS:', e)
    }

    return NextResponse.json(commit, { status: 201 })
}

export async function PUT(req: NextRequest) {
    const body = await req.json()
    const userId = req.headers.get('x-user-id')

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { repoId, targetCommitId } = body
    const commit = await rollbackToCommit(repoId, targetCommitId, userId)
    return NextResponse.json(commit)
}
