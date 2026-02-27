import { NextRequest, NextResponse } from 'next/server'
import { reviewCode, explainCode, suggestFix, chatWithAI } from '@/lib/ai-review'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    const body = await req.json()
    const { action, diffs, code, filename, issue, question, codeContext } = body

    try {
        switch (action) {
            case 'review': {
                const result = await reviewCode(diffs)
                return NextResponse.json(result)
            }
            case 'explain': {
                const explanation = await explainCode(code, filename)
                return NextResponse.json({ explanation })
            }
            case 'fix': {
                const fix = await suggestFix(code, issue)
                return NextResponse.json({ fix })
            }
            case 'chat': {
                const answer = await chatWithAI(question, codeContext)
                return NextResponse.json({ answer })
            }
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'AI service error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
