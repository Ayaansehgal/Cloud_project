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

    let aiSummary: string | undefined
    try {
        const history = await getCommitHistory(repoId)
        if (history.length > 0) {
            const diffs = await computeDiff(repoId, history[0].id, '')
            if (diffs.length > 0) {
                aiSummary = await generateCommitSummary(diffs)
            }
        }
    } catch {
        // AI summary is optional
    }

    const commit = await createCommit(repoId, message, files, userId, aiSummary)
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
