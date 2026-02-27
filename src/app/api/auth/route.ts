import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    const supabase = createServerClient()
    const body = await req.json()
    const { action, email, password } = body

    if (action === 'signup') {
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        })
        if (error) {
            console.error('Signup error:', error.message)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        if (data.user) {
            await supabase.from('profiles').upsert({
                id: data.user.id,
                email: data.user.email,
                username: data.user.email?.split('@')[0] || 'user'
            }, { onConflict: 'id' })
        }

        return NextResponse.json({ user: data.user }, { status: 201 })
    }

    if (action === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return NextResponse.json({ error: error.message }, { status: 401 })

        if (data.user) {
            const { data: profile } = await supabase.from('profiles').select('id').eq('id', data.user.id).single()
            if (!profile) {
                await supabase.from('profiles').upsert({
                    id: data.user.id,
                    email: data.user.email,
                    username: data.user.email?.split('@')[0] || 'user'
                }, { onConflict: 'id' })
            }
        }

        return NextResponse.json({
            user: data.user,
            session: data.session
        })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
