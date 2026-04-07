import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServerClient()
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const supabase = createServerClient()

    const updates: Record<string, unknown> = {}
    if (body.linkedin_url !== undefined) updates.linkedin_url = body.linkedin_url
    if (body.instagram_handle !== undefined) updates.instagram_handle = body.instagram_handle
    if (body.username !== undefined) updates.username = body.username

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
