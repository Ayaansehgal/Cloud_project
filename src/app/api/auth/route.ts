import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    const body = await req.json()
    const { action, email, password } = body

    if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabase = createServerClient()

    if (action === 'signup') {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        })
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ user: data.user }, { status: 201 })
    }

    if (action === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ user: data.user, session: data.session })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
