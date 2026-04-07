import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const supabase = createServerClient()
    
    // Only fetch repos that belong to this user (owned) or where they are a collaborator
    const [ownedResult, collabResult] = await Promise.all([
        supabase
            .from('repositories')
            .select('*')
            .eq('owner_id', userId)
            .order('updated_at', { ascending: false }),
        supabase
            .from('collaborators')
            .select('repo_id')
            .eq('user_id', userId)
    ])
    
    const ownedRepos = ownedResult.data || []
    const collabRepoIds = (collabResult.data || []).map(c => c.repo_id)
    
    // Fetch any repos the user collaborates on (but doesn't own)
    let collabRepos: typeof ownedRepos = []
    if (collabRepoIds.length > 0) {
        const ownedIds = new Set(ownedRepos.map(r => r.id))
        const missingIds = collabRepoIds.filter(id => !ownedIds.has(id))
        if (missingIds.length > 0) {
            const { data } = await supabase
                .from('repositories')
                .select('*')
                .in('id', missingIds)
                .order('updated_at', { ascending: false })
            collabRepos = data || []
        }
    }
    
    const allRepos = [...ownedRepos, ...collabRepos]
    const enrichedRepos = allRepos.map(r => ({ ...r, commit_count: 0 }))
    return NextResponse.json(enrichedRepos)
}

export async function POST(req: NextRequest) {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    
    const supabase = createServerClient()
    const repoData = {
        name: body.name,
        description: body.description || '',
        owner_id: userId,
        is_public: body.is_public ?? true,
    }

    let { data: newRepo, error } = await supabase
        .from('repositories')
        .insert(repoData)
        .select()
        .single()
        
    // If foreign key violation (23503) on owner_id, profile is missing. Auto-sync from auth.
    if (error && error.code === '23503') {
        const { data: userAuth } = await supabase.auth.admin.getUserById(userId)
        if (userAuth?.user) {
            const email = userAuth.user.email || 'unknown@domain.com'
            await supabase.from('profiles').upsert({
                id: userId,
                email,
                username: `${email.split('@')[0]}_${Math.floor(Math.random() * 10000)}`,
            }, { onConflict: 'id' })
            
            // Retry repo insert
            const retry = await supabase.from('repositories').insert(repoData).select().single()
            newRepo = retry.data
            error = retry.error as any
        }
    }

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ...newRepo, commit_count: 0 }, { status: 201 })
}
