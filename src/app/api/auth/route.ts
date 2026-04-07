import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Ensure the profiles row exists so foreign keys (commits.author_id, etc.) never fail
async function ensureProfile(supabase: ReturnType<typeof createServerClient>, userId: string, email: string) {
    try {
        const baseUsername = email.split('@')[0]
        const { error } = await supabase.from('profiles').upsert({
            id: userId,
            email,
            username: baseUsername,
        }, { onConflict: 'id' })
        
        // If unique constraint violation on username (23505)
        if (error && error.code === '23505') {
            await supabase.from('profiles').upsert({
                id: userId,
                email,
                username: `${baseUsername}_${Math.floor(Math.random() * 10000)}`,
            }, { onConflict: 'id' })
        } else if (error) {
            console.warn('[AUTH] ensureProfile Supabase error:', error.message)
        }
    } catch (e) {
        console.warn('[AUTH] Profile upsert warning (non-fatal):', e)
    }
}

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
        // Ensure profile row exists (trigger may not fire in all Supabase configs)
        if (data.user) {
            await ensureProfile(supabase, data.user.id, data.user.email || email)
        }
        // Return session too — email confirmation is disabled so session is available immediately
        return NextResponse.json({ user: data.user, session: data.session }, { status: 201 })
    }

    if (action === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        // Ensure profile row exists (handles accounts created before trigger was set up)
        if (data.user) {
            await ensureProfile(supabase, data.user.id, data.user.email || email)
        }
        return NextResponse.json({ user: data.user, session: data.session })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
