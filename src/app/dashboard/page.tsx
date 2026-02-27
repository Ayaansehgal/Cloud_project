'use client'

import { useState, useEffect } from 'react'
import { GitBranch, Plus, Globe, Lock, LogOut, Search, Loader2, FolderGit2, Clock, MoreVertical } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Repository } from '@/lib/types'

export default function DashboardPage() {
    const [repos, setRepos] = useState<Repository[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState('')
    const [newDesc, setNewDesc] = useState('')
    const [isPublic, setIsPublic] = useState(true)
    const [creating, setCreating] = useState(false)
    const [search, setSearch] = useState('')
    const [user, setUser] = useState<{ id: string; email: string } | null>(null)
    const router = useRouter()

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        setUser(u)
        fetchRepos(u.id)
    }, [router])

    async function fetchRepos(userId: string) {
        try {
            const res = await fetch('/api/repos', { headers: { 'x-user-id': userId } })
            const data = await res.json()
            setRepos(Array.isArray(data) ? data : [])
        } catch { setRepos([]) }
        finally { setLoading(false) }
    }

    async function createRepo(e: React.FormEvent) {
        e.preventDefault()
        if (!user) return
        setCreating(true)
        try {
            const res = await fetch('/api/repos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
                body: JSON.stringify({ name: newName, description: newDesc, is_public: isPublic })
            })
            const data = await res.json()
            if (res.ok) {
                setRepos([data, ...repos])
                setShowCreate(false)
                setNewName('')
                setNewDesc('')
            }
        } catch { }
        finally { setCreating(false) }
    }

    function handleLogout() {
        localStorage.removeItem('user')
        localStorage.removeItem('session')
        router.push('/')
    }

    function timeAgo(dateStr: string) {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'Just now'
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        const days = Math.floor(hrs / 24)
        return `${days}d ago`
    }

    const filtered = repos.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
            <nav style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 40px', background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100
            }}>
                <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <GitBranch size={24} color="var(--accent)" />
                    <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Cloud<span style={{ color: 'var(--accent)' }}>VCS</span>
                    </span>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{user?.email}</span>
                    <button className="btn-secondary" onClick={handleLogout} style={{ padding: '8px 16px' }}>
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </nav>

            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px' }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '28px'
                }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Your Repositories</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                            Manage your version-controlled projects
                        </p>
                    </div>
                    <button className="btn-primary" onClick={() => setShowCreate(true)}>
                        <Plus size={18} /> New Repository
                    </button>
                </div>

                {showCreate && (
                    <div className="glass-card fade-in" style={{ padding: '28px', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Create New Repository</h3>
                        <form onSubmit={createRepo} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <input className="input-field" placeholder="Repository name" value={newName}
                                onChange={e => setNewName(e.target.value)} required />
                            <input className="input-field" placeholder="Description (optional)" value={newDesc}
                                onChange={e => setNewDesc(e.target.value)} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                                    color: 'var(--text-secondary)', fontSize: '14px'
                                }}>
                                    <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                                    {isPublic ? <><Globe size={14} /> Public</> : <><Lock size={14} /> Private</>}
                                </label>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-primary" type="submit" disabled={creating}>
                                    {creating ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
                                </button>
                                <button className="btn-secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                <div style={{ position: 'relative', marginBottom: '28px' }}>
                    <Search size={18} style={{
                        position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                    }} />
                    <input className="input-field" placeholder="Search repositories..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: '42px' }} />
                </div>

                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: '160px' }} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)', padding: '60px 20px',
                        textAlign: 'center', boxShadow: 'var(--shadow-sm)'
                    }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: '14px', background: 'var(--accent-light)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <FolderGit2 size={28} color="var(--accent)" />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                            Let&apos;s create your first repository
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px', margin: '0 auto 20px' }}>
                            Your code needs a home! Repositories store your files, track changes, and provide AI-powered insights.
                        </p>
                        <button className="btn-primary" onClick={() => setShowCreate(true)}>
                            Create repository
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                        {filtered.map(repo => (
                            <Link href={`/repo/${repo.id}`} key={repo.id}>
                                <div className="glass-card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{repo.name}</h3>
                                        <MoreVertical size={18} color="var(--text-muted)" />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <FolderGit2 size={16} color="var(--accent)" />
                                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                            {repo.description || 'No description'}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className={repo.is_public ? 'badge badge-info' : 'badge badge-warning'}>
                                            {repo.is_public ? 'Public' : 'Private'}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                            <Clock size={12} />
                                            {timeAgo(repo.updated_at || repo.created_at)}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
