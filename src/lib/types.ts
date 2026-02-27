export interface Repository {
    id: string
    name: string
    description: string
    owner_id: string
    is_public: boolean
    created_at: string
    updated_at: string
}

export interface Commit {
    id: string
    repo_id: string
    message: string
    ai_summary: string | null
    author_id: string
    parent_commit_id: string | null
    tree_hash: string
    integrity_hash: string
    created_at: string
    author_email?: string
}

export interface Blob {
    hash: string
    size: number
    storage_path: string
    created_at: string
}

export interface TreeEntry {
    id: string
    commit_id: string
    path: string
    blob_hash: string
    content?: string
}

export interface Collaborator {
    id: string
    repo_id: string
    user_id: string
    role: 'owner' | 'editor' | 'viewer'
    created_at: string
}

export interface Profile {
    id: string
    email: string
    username: string
    avatar_url: string | null
    created_at: string
}

export interface AIReviewResult {
    summary: string
    bugs: string[]
    suggestions: string[]
    security: string[]
}

export interface DiffEntry {
    path: string
    status: 'added' | 'modified' | 'deleted'
    oldContent?: string
    newContent?: string
}
