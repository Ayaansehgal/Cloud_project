import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const supabase = createServerClient()
    const userId = req.headers.get('x-user-id')

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
        .from('repositories')
        .select('*')
        .or(`owner_id.eq.${userId},is_public.eq.true`)
        .order('updated_at', { ascending: false })

    if (error) {
        console.error('GET /api/repos error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
    const supabase = createServerClient()
    const body = await req.json()
    const userId = req.headers.get('x-user-id')

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).single()
    if (!profile) {
        const { data: authUser } = await supabase.auth.admin.getUserById(userId)
        const email = authUser?.user?.email || 'unknown'
        await supabase.from('profiles').upsert({
            id: userId,
            email,
            username: email.split('@')[0]
        })
    }

    const { data, error } = await supabase
        .from('repositories')
        .insert({
            name: body.name,
            description: body.description || '',
            owner_id: userId,
            is_public: body.is_public ?? true
        })
        .select()
        .single()

    if (error) {
        console.error('POST /api/repos error:', JSON.stringify(error))
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase.from('collaborators').insert({
        repo_id: data.id,
        user_id: userId,
        role: 'owner'
    })

    return NextResponse.json(data, { status: 201 })
}
