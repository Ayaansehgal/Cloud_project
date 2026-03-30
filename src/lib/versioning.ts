import { TreeEntry, DiffEntry, Commit } from './types'
import { createServerClient } from './supabase'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
    region: process.env.NEXT_PUBLIC_AWS_REGION || process.env.AWS_REGION || 'eu-north-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    }
})

export async function hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function computeTreeHash(files: { path: string; content: string }[]): Promise<string> {
    const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path))
    const combined = sorted.map(f => `${f.path}:${f.content}`).join('\n')
    return hashContent(combined)
}

export async function createCommit(
    repoId: string,
    message: string,
    files: { path: string; content: string }[],
    authorId: string,
    aiSummary?: string
): Promise<Commit> {
    const supabase = createServerClient()
    
    // Get existing latest commit
    const { data: existing } = await supabase
        .from('commits')
        .select('id, tree_hash, integrity_hash')
        .eq('repo_id', repoId)
        .order('created_at', { ascending: false })
        .limit(1)

    const treeHash = await computeTreeHash(files)
    const timestamp = new Date().toISOString()
    const parentId = existing && existing.length > 0 ? existing[0].id : null
    const previousIntegrity = existing && existing.length > 0 ? existing[0].integrity_hash : '0'.repeat(64)
    
    const integrityHash = await hashContent(`${treeHash}${previousIntegrity}${message}${timestamp}`)

    const { data: commit, error: commitError } = await supabase
        .from('commits')
        .insert({
            repo_id: repoId,
            message,
            ai_summary: aiSummary || null,
            author_id: authorId,
            parent_commit_id: parentId,
            tree_hash: treeHash,
            integrity_hash: integrityHash,
            created_at: timestamp
        })
        .select()
        .single()
        
    if (commitError) throw new Error(commitError.message)

    // Ensure bucket exists or simply upload
    for (const f of files) {
        const bHash = await hashContent(f.content)
        
        // Upload to storage (Amazon S3)
        await s3.send(new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME || 'cloudvcs-blobs-02aa5720',
            Key: bHash,
            Body: f.content,
            ContentType: 'text/plain'
        }))
            
        // insert into blobs table
        const { data: blobExists } = await supabase.from('blobs').select('hash').eq('hash', bHash).single()
        if (!blobExists) {
            await supabase.from('blobs').insert({
                hash: bHash,
                size: new TextEncoder().encode(f.content).length,
                storage_path: bHash
            })
        }

        // insert tree entry
        await supabase.from('tree_entries').insert({
            commit_id: commit.id,
            path: f.path,
            blob_hash: bHash
        })
    }

    return commit
}

export async function getCommitHistory(repoId: string): Promise<Commit[]> {
    const supabase = createServerClient()
    const { data: commits, error } = await supabase
        .from('commits')
        .select(`
            *,
            profiles:author_id ( email )
        `)
        .eq('repo_id', repoId)
        .order('created_at', { ascending: false })
        
    if (error || !commits) return []
    
    // Any is used temporarily for type alignment on profiles relation unwrap
    return commits.map((c: any) => ({
        ...c,
        author_email: c.profiles?.email || 'unknown@example.com'
    })) as Commit[]
}

export async function getCommitFiles(commitId: string): Promise<TreeEntry[]> {
    const supabase = createServerClient()
    const { data: entries, error } = await supabase
        .from('tree_entries')
        .select('*')
        .eq('commit_id', commitId)
        
    if (error || !entries) return []
    
    // Fetch content from storage (Amazon S3)
    const resolvedEntries = await Promise.all(entries.map(async (entry) => {
        try {
            const { Body } = await s3.send(new GetObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME || 'cloudvcs-blobs-02aa5720',
                Key: entry.blob_hash
            }))
            const content = await Body?.transformToString() || ''
            return { ...entry, content }
        } catch (err) {
            console.error('S3 GetObject Error:', err)
            return { ...entry, content: '' }
        }
    }))
    
    return resolvedEntries
}

export async function computeDiff(
    _repoId: string,
    commitIdA: string | null,
    commitIdB: string
): Promise<DiffEntry[]> {
    const filesB = await getCommitFiles(commitIdB)
    const filesA = commitIdA ? await getCommitFiles(commitIdA) : []

    const diff: DiffEntry[] = []
    const mapA = new Map(filesA.map(f => [f.path, f]))
    const mapB = new Map(filesB.map(f => [f.path, f]))

    for (const [path, fileB] of mapB) {
        const fileA = mapA.get(path)
        if (!fileA) {
            diff.push({ path, status: 'added', newContent: fileB.content })
        } else if (fileA.blob_hash !== fileB.blob_hash) {
            diff.push({ path, status: 'modified', oldContent: fileA.content, newContent: fileB.content })
        }
    }

    for (const [path, fileA] of mapA) {
        if (!mapB.has(path)) {
            diff.push({ path, status: 'deleted', oldContent: fileA.content })
        }
    }

    return diff
}

export async function rollbackToCommit(
    repoId: string,
    targetCommitId: string,
    authorId: string
): Promise<Commit> {
    const files = await getCommitFiles(targetCommitId)
    const supabase = createServerClient()
    const { data: target } = await supabase.from('commits').select('message').eq('id', targetCommitId).single()

    const rollbackFiles = files.map(f => ({
        path: f.path,
        content: f.content || ''
    }))

    return createCommit(
        repoId,
        `Rollback to: ${target?.message || targetCommitId}`,
        rollbackFiles,
        authorId
    )
}
