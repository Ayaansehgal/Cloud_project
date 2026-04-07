'use client'

import { useState, useEffect } from 'react'
import {
    GitBranch, Plus, Globe, Lock, LogOut, Search, Loader2,
    FolderGit2, Clock, Home, Settings, X,
    Check, Linkedin, Instagram, ChevronDown
} from 'lucide-react'
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
    const [tab, setTab] = useState<'repos' | 'settings'>('repos')
    const [settingsTab, setSettingsTab] = useState<'profile' | 'appearance' | 'notification' | 'account'>('appearance')
    const [themeColor, setThemeColor] = useState('#818CF8')
    const [interfaceTheme, setInterfaceTheme] = useState<'light'|'dark'|'system'>('dark')
    const [transparentSidebar, setTransparentSidebar] = useState(false)
    const [fontFamily, setFontFamily] = useState('Inter')
    const [linkedin, setLinkedin] = useState('')
    const [instagram, setInstagram] = useState('')
    const [savingProfile, setSavingProfile] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        setUser(u)
        fetchRepos(u.id)

        // Load settings from localStorage
        const settings = JSON.parse(localStorage.getItem('userSettings') || '{}')
        if (settings.theme) setInterfaceTheme(settings.theme)
        if (settings.themeColor) setThemeColor(settings.themeColor)
        if (settings.transparentSidebar !== undefined) setTransparentSidebar(settings.transparentSidebar)
        if (settings.fontFamily) setFontFamily(settings.fontFamily)

        // Load profile from API
        fetch('/api/profile', { headers: { 'x-user-id': u.id } })
            .then(res => res.json())
            .then(data => {
                if (data.linkedin_url) setLinkedin(data.linkedin_url)
                if (data.instagram_handle) setInstagram(data.instagram_handle)
            })
            .catch(() => {})
    }, [router])

    useEffect(() => {
        if (!user) return
        localStorage.setItem('userSettings', JSON.stringify({ theme: interfaceTheme, themeColor, transparentSidebar, fontFamily }))

        if (interfaceTheme === 'light' || (interfaceTheme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches)) {
            document.documentElement.setAttribute('data-theme', 'light')
        } else {
            document.documentElement.removeAttribute('data-theme')
        }

        if (themeColor && themeColor !== '#818CF8') {
            document.documentElement.style.setProperty('--accent', themeColor)
            document.documentElement.style.setProperty('--gradient-accent', `linear-gradient(135deg, ${themeColor} 0%, #C084FC 100%)`)
        } else {
            document.documentElement.style.removeProperty('--accent')
            document.documentElement.style.removeProperty('--gradient-accent')
        }

        document.documentElement.style.setProperty('--font-body', fontFamily)

    }, [interfaceTheme, themeColor, transparentSidebar, fontFamily, user])

    async function saveProfileChanges() {
        if (!user) return
        setSavingProfile(true)
        try {
            await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
                body: JSON.stringify({ linkedin_url: linkedin, instagram_handle: instagram })
            })
            alert('Profile updated successfully!')
        } catch (e) {
            alert('Failed to update profile')
        } finally {
            setSavingProfile(false)
        }
    }

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
            } else {
                alert(`Error: ${data.error || 'Failed to create repository'}`)
            }
        } catch (e: any) { 
            alert(`Error: ${e.message || 'Network error'}`)
        }
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
        return `${Math.floor(hrs / 24)}d ago`
    }

    const filtered = repos.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase())
    )

    const userInitial = user?.email?.[0]?.toUpperCase() || '?'

    return (
        <div className="app-shell">
            {/* Sidebar */}
            <aside className={`sidebar ${transparentSidebar ? 'sidebar-transparent' : ''}`}>
                {/* Logo */}
                <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
                    <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: '9px',
                            background: 'var(--gradient-accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 3px 10px rgba(99,102,241,.3)'
                        }}>
                            <GitBranch size={16} color="#fff" />
                        </div>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                            Cloud<span className="gradient-text">VCS</span>
                        </span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav style={{ padding: '12px 12px', flex: 1 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', padding: '0 8px', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Main
                    </div>
                    <button className={`nav-item ${tab === 'repos' ? 'active' : ''}`} style={{ marginBottom: '2px' }} onClick={() => setTab('repos')}>
                        <Home size={16} /> Repositories
                    </button>
                    <button className="nav-item" style={{ marginBottom: '2px' }} onClick={() => setShowCreate(true)}>
                        <Plus size={16} /> New Repository
                    </button>
                    <button className={`nav-item ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
                        <Settings size={16} /> Settings
                    </button>
                </nav>

                {/* User area */}
                <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: 'var(--radius)',
                        background: 'var(--bg-hover)'
                    }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: 'var(--gradient-accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0
                        }}>
                            {userInitial}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user?.email}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Free plan</div>
                        </div>
                        <button onClick={handleLogout} title="Logout" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px', display: 'flex', transition: 'all 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="main-content">
                {tab === 'repos' ? (
                    <>
                        {/* Top bar */}
                        <div className="topbar">
                            <div>
                                <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Repositories</h1>
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                    {repos.length} {repos.length === 1 ? 'repository' : 'repositories'}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input className="input-field" placeholder="Search repositories..."
                                        value={search} onChange={e => setSearch(e.target.value)}
                                        style={{ paddingLeft: '36px', width: '240px', padding: '8px 12px 8px 36px', fontSize: '13px', borderRadius: 'var(--radius-full)' }} />
                                </div>
                                <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ padding: '8px 18px', fontSize: '13px' }}>
                                    <Plus size={15} /> New Repo
                                </button>
                            </div>
                        </div>

                        {/* Content area */}
                        <div style={{ padding: '28px 32px' }}>
                            {loading ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: '160px' }} />)}
                                </div>
                            ) : filtered.length === 0 ? (
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    padding: '80px 20px', textAlign: 'center'
                                }}>
                                    <div style={{
                                        width: 72, height: 72, borderRadius: '20px', background: 'var(--accent-light)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
                                        boxShadow: '0 4px 16px rgba(99,102,241,.12)'
                                    }}>
                                        <FolderGit2 size={34} color="var(--accent)" />
                                    </div>
                                    <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px', letterSpacing: '-0.01em' }}>
                                        {search ? 'No repositories found' : 'Create your first repository'}
                                    </h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '380px', lineHeight: 1.7, marginBottom: '24px' }}>
                                        {search ? `No repos match "${search}"` : 'Your code needs a home. Repositories store files, track changes, and give you AI-powered insights.'}
                                    </p>
                                    {!search && (
                                        <button className="btn-primary" onClick={() => setShowCreate(true)}>
                                            <Plus size={16} /> Create Repository
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                    {filtered.map(repo => (
                                        <Link href={`/repo/${repo.id}`} key={repo.id} style={{ textDecoration: 'none' }}>
                                            <div className="repo-card">
                                                {/* Repo icon row */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{
                                                        width: 40, height: 40, borderRadius: '11px',
                                                        background: 'var(--accent-light)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        <FolderGit2 size={20} color="var(--accent)" />
                                                    </div>
                                                    <span className={repo.is_public ? 'badge badge-info' : 'badge badge-warning'} style={{ fontSize: '11px' }}>
                                                        {repo.is_public ? <><Globe size={10} /> Public</> : <><Lock size={10} /> Private</>}
                                                    </span>
                                                </div>

                                                {/* Name & description */}
                                                <div>
                                                    <h3 style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.01em' }}>
                                                        {repo.name}
                                                    </h3>
                                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                                                        {repo.description || 'No description provided'}
                                                    </p>
                                                </div>

                                                {/* Footer */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    <Clock size={12} />
                                                    Updated {timeAgo(repo.updated_at || repo.created_at)}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* SETTINGS VIEW */
                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh', background: '#111113' }}>
                        <div className="topbar" style={{ paddingBottom: 0, paddingTop: '40px', background: 'transparent', borderBottom: 'none' }}>
                            <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                                <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: '24px' }}>Settings</h1>
                                {/* Settings Tabs */}
                                <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid var(--border)' }}>
                                    {[
                                        { id: 'profile', label: 'Profile' },
                                        { id: 'appearance', label: 'Appearance' },
                                        { id: 'notification', label: 'Notification' },
                                        { id: 'account', label: 'Account' }
                                    ].map(t => (
                                        <button key={t.id} onClick={() => setSettingsTab(t.id as any)} style={{
                                            background: 'none', border: 'none', padding: '0 0 14px 0', cursor: 'pointer',
                                            fontSize: '14px', fontWeight: settingsTab === t.id ? 600 : 500,
                                            color: settingsTab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                                            borderBottom: settingsTab === t.id ? '2px solid white' : '2px solid transparent',
                                            transition: 'all 0.2s', position: 'relative', top: '1px'
                                        }}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '40px 32px', flex: 1, overflowY: 'auto' }}>
                            <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                                
                                {settingsTab === 'appearance' && (
                                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                        {/* Theme Color */}
                                        <div>
                                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Theme Color</h3>
                                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>Personalize your dashboard using your brand palette.</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                {['#27272a', '#2563eb', '#3b82f6', '#0ea5e9', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#818CF8'].map(color => (
                                                    <button key={color} onClick={() => setThemeColor(color)} style={{
                                                        width: '32px', height: '32px', borderRadius: '50%', background: color, border: 'none', cursor: 'pointer',
                                                        boxShadow: themeColor === color ? `0 0 0 2px var(--bg-hover), 0 0 0 4px ${color}` : 'none',
                                                        transition: 'all 0.2s', margin: themeColor === color ? '0 3px' : 0
                                                    }} />
                                                ))}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '16px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Custom</span>
                                                    <div style={{ position: 'relative' }}>
                                                        <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{
                                                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
                                                        }} />
                                                        <div style={{ padding: '6px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                                            {themeColor.toUpperCase()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Interface Theme */}
                                        <div>
                                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Interface Theme</h3>
                                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>Select or customize your UI theme.</p>
                                            <div style={{ display: 'flex', gap: '20px' }}>
                                                {['light', 'dark', 'system'].map(theme => (
                                                    <div key={theme} onClick={() => setInterfaceTheme(theme as any)} style={{ cursor: 'pointer', flex: 1, maxWidth: '260px' }}>
                                                        <div style={{
                                                            height: '160px', borderRadius: '12px', border: interfaceTheme === theme ? `2px solid ${themeColor}` : '1px solid var(--border)',
                                                            background: theme === 'light' ? '#f4f4f5' : theme === 'dark' ? '#27272a' : 'linear-gradient(to right, #f4f4f5 50%, #27272a 50%)',
                                                            position: 'relative', overflow: 'hidden', transition: 'all 0.2s'
                                                        }}>
                                                            {interfaceTheme === theme && (
                                                                <div style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: '50%', background: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Check size={14} color="#fff" />
                                                                </div>
                                                            )}
                                                            {/* Mini Dashboard Map inside card */}
                                                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -46%) scale(0.65)`, width: '320px', height: '200px',
                                                                background: theme === 'light' ? '#fff' : '#18181b', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }}>
                                                                <div style={{ height: '40px', borderBottom: `1px solid ${theme==='light'?'#e4e4e7':'#3f3f46'}`, display: 'flex', alignItems:'center', padding: '0 16px', gap: '8px' }}>
                                                                    <div style={{display:'flex', gap:'6px'}}><div style={{width:8,height:8,borderRadius:'50%',background:'#ef4444'}}/><div style={{width:8,height:8,borderRadius:'50%',background:'#eab308'}}/><div style={{width:8,height:8,borderRadius:'50%',background:'#22c55e'}}/></div>
                                                                    <div style={{flex:1, textAlign:'center', fontSize:'11px', fontWeight:700, color: theme==='light'?'#18181b':'#fff'}}>Your dashboard</div>
                                                                    <div style={{width:24,height:12,borderRadius:'6px',background:theme==='light'?'#e4e4e7':'#3f3f46'}}/>
                                                                    <div style={{width:24,height:12,borderRadius:'6px',background:themeColor}}/>
                                                                </div>
                                                                <div style={{ display: 'flex', flex: 1, padding: '16px', gap: '16px' }}>
                                                                    <div style={{ width: '60px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                        <div style={{height:6, width:'100%', background:theme==='light'?'#e4e4e7':'#3f3f46', borderRadius:4}}/>
                                                                        <div style={{height:6, width:'80%', background:theme==='light'?'#e4e4e7':'#3f3f46', borderRadius:4}}/>
                                                                        <div style={{height:6, width:'90%', background:theme==='light'?'#e4e4e7':'#3f3f46', borderRadius:4}}/>
                                                                    </div>
                                                                    <div style={{ flex: 1, background: theme==='light'?'#f4f4f5':'#27272a', borderRadius:'8px' }}/>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ marginTop: '16px', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{theme} Theme</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Toggles */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Transparent Sidebar</h3>
                                                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Make the desktop sidebar transparent.</p>
                                                </div>
                                                <div onClick={() => setTransparentSidebar(!transparentSidebar)} style={{
                                                    width: '46px', height: '26px', borderRadius: '13px', background: transparentSidebar ? themeColor : 'var(--bg-hover)', border: '1px solid var(--border)',
                                                    position: 'relative', cursor: 'pointer', transition: 'all 0.2s'
                                                }}>
                                                    <div style={{ position: 'absolute', top: 2, left: transparentSidebar ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Sidebar Feature</h3>
                                                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Select what you'd like displayed in the sidebar.</p>
                                                </div>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                                                    fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer'
                                                }}>
                                                    Recent changes <ChevronDown size={14} color="var(--text-muted)" />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Font Style</h3>
                                                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Style of texts and heading</p>
                                                </div>
                                                <div style={{ display: 'flex', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                                    {[
                                                        { name: 'Inter', show: 'Aa' },
                                                        { name: 'Georgia, serif', show: 'Aa' },
                                                        { name: 'JetBrains Mono, monospace', show: 'Aa' }
                                                    ].map((font, i) => (
                                                        <div key={i} onClick={() => setFontFamily(font.name)} style={{
                                                            padding: '10px 16px', fontSize: '14px', fontWeight: fontFamily === font.name ? 600 : 400, color: fontFamily === font.name ? 'var(--accent)' : 'var(--text-secondary)', fontFamily: font.name,
                                                            background: fontFamily === font.name ? 'var(--bg-card)' : 'transparent', borderRight: i < 2 ? '1px solid var(--border)' : 'none', cursor: 'pointer'
                                                        }}>{font.show}</div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Language</h3>
                                                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Select the language of the platform.</p>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                                    🇬🇧 English <ChevronDown size={14} color="var(--text-muted)" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {settingsTab === 'profile' && (
                                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                                                <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>Personal Information</h3>
                                            </div>
                                            <div style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                                                <div style={{ flex: '1 1 300px' }}>
                                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Email Address</label>
                                                    <input className="input-field" disabled value={user?.email || ''} style={{ width: '100%', cursor: 'not-allowed', opacity: 0.7 }} />
                                                </div>
                                                <div style={{ flex: '1 1 300px' }}>
                                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>User ID</label>
                                                    <input className="input-field" disabled value={user?.id || ''} style={{ width: '100%', fontFamily: 'monospace', cursor: 'not-allowed', opacity: 0.7 }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                                                <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>Social & Professional Links</h3>
                                            </div>
                                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '-10px' }}>Connect your profiles to build your developer portfolio.</p>
                                                
                                                <div>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                                        <Linkedin size={18} color="#0a66c2" /> LinkedIn Profile
                                                    </label>
                                                    <input className="input-field" placeholder="https://linkedin.com/in/username" value={linkedin} onChange={e => setLinkedin(e.target.value)} style={{ width: '100%', maxWidth: '500px' }} />
                                                </div>

                                                <div>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                                        <Instagram size={18} color="#e1306c" /> Instagram Handle
                                                    </label>
                                                    <div style={{ position: 'relative', maxWidth: '500px' }}>
                                                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>@</span>
                                                        <input className="input-field" placeholder="username" value={instagram} onChange={e => setInstagram(e.target.value)} style={{ width: '100%', paddingLeft: '36px' }} />
                                                    </div>
                                                </div>

                                                <button onClick={saveProfileChanges} disabled={savingProfile} className="btn-primary" style={{ width: 'fit-content', padding: '10px 20px', fontSize: '14px', background: themeColor }}>
                                                    {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {settingsTab === 'account' && (
                                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>Cloud Infrastructure Status</h3>
                                                <span style={{ fontSize: '12px', background: 'var(--success-bg)', color: 'var(--success)', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{width:6, height:6, borderRadius:'50%', background:'var(--success)', animation: 'pulse 2s infinite'}}/> Connected
                                                </span>
                                            </div>
                                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>This project is actively communicating with the following serverless AWS services behind the scenes:</p>
                                                
                                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, auto) 1fr', gap: '16px', alignItems: 'center', fontSize: '14px' }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Region</div>
                                                    <div style={{ fontFamily: 'monospace', color: 'var(--accent)', background: 'var(--accent-light)', padding: '6px 10px', borderRadius: '6px', display: 'inline-block', width: 'fit-content' }}>eu-north-1</div>

                                                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Blob Storage</div>
                                                    <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)', background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '6px' }}>Amazon S3</div>

                                                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Event Queue</div>
                                                    <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)', background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '6px' }}>Amazon SQS Standard</div>

                                                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>NoSQL Analytics</div>
                                                    <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)', background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '6px' }}>Amazon DynamoDB (PROVISIONED)</div>

                                                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>AI Code Mentor</div>
                                                    <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)', background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '6px' }}>Google Gemini Pro + Serverless Worker</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {settingsTab === 'notification' && (
                                    <div className="fade-in" style={{ textAlign: 'center', padding: '100px 0' }}>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Push and email notifications configuration coming soon.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Create repo modal */}
            {showCreate && (
                <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
                    <div className="modal fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.01em' }}>New Repository</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>Create a new cloud-native project</p>
                            </div>
                            <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: 'var(--radius-sm)', display: 'flex' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={createRepo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>Repository name *</label>
                                <input className="input-field" placeholder="e.g. my-project" value={newName}
                                    onChange={e => setNewName(e.target.value)} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>Description</label>
                                <input className="input-field" placeholder="Optional: describe what this repo is for" value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)} />
                            </div>

                            <div style={{
                                display: 'flex', gap: '10px'
                            }}>
                                {[
                                    { val: true, label: 'Public', icon: Globe, desc: 'Anyone can view' },
                                    { val: false, label: 'Private', icon: Lock, desc: 'Only you can see' }
                                ].map(opt => (
                                    <button key={String(opt.val)} type="button" onClick={() => setIsPublic(opt.val)} style={{
                                        flex: 1, padding: '12px', borderRadius: 'var(--radius)',
                                        border: `1.5px solid ${isPublic === opt.val ? 'var(--accent)' : 'var(--border)'}`,
                                        background: isPublic === opt.val ? 'var(--accent-light)' : 'var(--bg-input)',
                                        cursor: 'pointer', textAlign: 'left' as const, transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', gap: '10px'
                                    }}>
                                        <opt.icon size={16} color={isPublic === opt.val ? 'var(--accent)' : 'var(--text-muted)'} />
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: isPublic === opt.val ? 'var(--accent)' : 'var(--text-primary)' }}>{opt.label}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                <button className="btn-primary" type="submit" disabled={creating} style={{ flex: 1, justifyContent: 'center', padding: '12px', borderRadius: 'var(--radius)' }}>
                                    {creating ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={15} /> Create Repository</>}
                                </button>
                                <button className="btn-secondary" type="button" onClick={() => setShowCreate(false)} style={{ borderRadius: 'var(--radius)' }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
