import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const supabase = createServerClient()
    const { data: repos, error } = await supabase
        .from('repositories')
        .select('*')
        .order('updated_at', { ascending: false })
    
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter repos that belong to the user or are public
    const accessibleRepos = repos.filter(r => r.is_public || r.owner_id === userId)
    
    // add a dummy commit_count temporarily or calculate it if needed
    const enrichedRepos = accessibleRepos.map(r => ({ ...r, commit_count: 0 }))
    return NextResponse.json(enrichedRepos)
}

export async function POST(req: NextRequest) {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    
    const supabase = createServerClient()
    const { data: newRepo, error } = await supabase
        .from('repositories')
        .insert({
            name: body.name,
            description: body.description || '',
            owner_id: userId,
            is_public: body.is_public ?? true,
        })
        .select()
        .single()
        
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ...newRepo, commit_count: 0 }, { status: 201 })
}
