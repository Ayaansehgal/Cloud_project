import { supabase } from './supabase'
import { TreeEntry, DiffEntry, Commit } from './types'

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
    const { data: latestCommit } = await supabase
        .from('commits')
        .select('id, integrity_hash')
        .eq('repo_id', repoId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    const treeHash = await computeTreeHash(files)
    const parentId = latestCommit?.id || null
    const parentIntegrity = latestCommit?.integrity_hash || '0'.repeat(64)

    const timestamp = new Date().toISOString()
    const integrityInput = `${treeHash}${parentIntegrity}${message}${timestamp}`
    const integrityHash = await hashContent(integrityInput)

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

    if (commitError) throw commitError

    for (const file of files) {
        const blobHash = await hashContent(file.content)

        const { data: existingBlob } = await supabase
            .from('blobs')
            .select('hash')
            .eq('hash', blobHash)
            .single()

        if (!existingBlob) {
            const storagePath = `blobs/${blobHash}`
            const fileBlob = new Blob([file.content], { type: 'text/plain' })
            await supabase.storage
                .from('vcs-files')
                .upload(storagePath, fileBlob, { upsert: true })

            await supabase.from('blobs').insert({
                hash: blobHash,
                size: file.content.length,
                storage_path: storagePath
            })
        }

        await supabase.from('tree_entries').insert({
            commit_id: commit.id,
            path: file.path,
            blob_hash: blobHash
        })
    }

    return commit
}

export async function getCommitHistory(repoId: string): Promise<Commit[]> {
    const { data, error } = await supabase
        .from('commits')
        .select('*, profiles:author_id(email)')
        .eq('repo_id', repoId)
        .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(c => ({
        ...c,
        author_email: c.profiles?.email
    }))
}

export async function getCommitFiles(commitId: string): Promise<TreeEntry[]> {
    const { data: entries, error } = await supabase
        .from('tree_entries')
        .select('*')
        .eq('commit_id', commitId)

    if (error) throw error

    const filesWithContent = await Promise.all(
        (entries || []).map(async (entry: TreeEntry) => {
            const { data } = await supabase.storage
                .from('vcs-files')
                .download(entry.blob_hash ? `blobs/${entry.blob_hash}` : entry.path)

            const content = data ? await data.text() : ''
            return { ...entry, content }
        })
    )

    return filesWithContent
}

export async function computeDiff(
    repoId: string,
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
    const { data: target } = await supabase
        .from('commits')
        .select('message')
        .eq('id', targetCommitId)
        .single()

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
