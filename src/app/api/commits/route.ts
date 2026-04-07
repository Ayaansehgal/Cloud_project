import { NextRequest, NextResponse } from 'next/server'
import { createCommit, getCommitHistory, getCommitFiles, computeDiff, rollbackToCommit } from '@/lib/versioning'
import { generateCommitSummary } from '@/lib/ai-review'
import { createServerClient } from '@/lib/supabase'

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
        return NextResponse.json({ error: 'Unauthorized — please log in again.' }, { status: 401 })
    }

    const { repoId, message, files } = body

    if (!repoId || !files || files.length === 0) {
        return NextResponse.json({ error: 'repoId and files are required.' }, { status: 400 })
    }

    // Safety net: ensure profile exists before committing (prevents FK violation)
    // The frontend sends x-user-email so we can upsert without needing admin API
    const userEmail = req.headers.get('x-user-email') || 'unknown@user.com'
    try {
        const supabase = createServerClient()
        const { error: upsertError } = await supabase.from('profiles').upsert({
            id: userId,
            email: userEmail,
            username: userEmail.split('@')[0],
        }, { onConflict: 'id', ignoreDuplicates: false })
        if (upsertError) {
            console.error('[COMMIT] Profile upsert error:', upsertError.message)
            // If email uniqueness fails, try a plain insert (profile might already exist)
            try {
                await supabase.from('profiles')
                    .insert({ id: userId, email: userEmail, username: userEmail.split('@')[0] })
            } catch { /* profile already exists, safe to ignore */ }
        }
    } catch (e) {
        console.warn('[COMMIT] Profile upsert warning:', e)
    }

    // 1. Save the commit data to Supabase + S3
    let commit
    try {
        commit = await createCommit(repoId, message, files, userId)
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save commit'
        console.error('[COMMIT ERROR]', msg)
        return NextResponse.json({ error: `Commit failed: ${msg}` }, { status: 500 })
    }

    // 2. Offload heavy AI Mentorship processing to Amazon SQS (non-blocking)
    // Fire-and-forget: don't block the HTTP response on SQS
    ;(async () => {
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
            console.error('[SQS WARNING] Failed to notify SQS (commit was saved successfully):', e)
        }
    })()

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
