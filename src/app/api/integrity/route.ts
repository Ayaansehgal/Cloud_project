import { NextRequest, NextResponse } from 'next/server'
import { verifyChain } from '@/lib/integrity'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const repoId = searchParams.get('repoId')

    if (!repoId) {
        return NextResponse.json({ error: 'repoId required' }, { status: 400 })
    }

    const result = await verifyChain(repoId)
    return NextResponse.json(result)
}
