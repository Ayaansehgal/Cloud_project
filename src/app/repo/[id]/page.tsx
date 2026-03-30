'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    GitBranch, GitCommit, Upload, Clock, Shield, ShieldCheck, ShieldAlert,
    FileCode, Brain, MessageSquare, Send, RotateCcw, Loader2, ArrowLeft, Sparkles, Bug, Lightbulb,
    AlertTriangle, X, Plus, Edit3, Save, Trash2, Play, ChevronRight, Check, FolderOpen
} from 'lucide-react'
import { Repository, Commit, TreeEntry, AIReviewResult } from '@/lib/types'
import { supabase } from '@/lib/supabase'

export default function RepoPage() {
    const params = useParams()
    const router = useRouter()
    const repoId = params.id as string
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [user, setUser] = useState<{ id: string; email: string } | null>(null)
    const [repo, setRepo] = useState<Repository | null>(null)
    const [commits, setCommits] = useState<Commit[]>([])
    const [files, setFiles] = useState<TreeEntry[]>([])
    const [selectedFile, setSelectedFile] = useState<TreeEntry | null>(null)
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'files' | 'history' | 'ai'>('files')

    const [editMode, setEditMode] = useState(false)
    const [editContent, setEditContent] = useState('')
    const [newFileName, setNewFileName] = useState('')
    const [showNewFile, setShowNewFile] = useState(false)
    const [newFileContent, setNewFileContent] = useState('')

    const [stagedChanges, setStagedChanges] = useState<{ path: string; content: string }[]>([])
    const [commitMsg, setCommitMsg] = useState('')
    const [pushing, setPushing] = useState(false)
    const [showUpload, setShowUpload] = useState(false)

    const [sliderValue, setSliderValue] = useState(0)
    const [sliderFiles, setSliderFiles] = useState<TreeEntry[]>([])

    const [integrityStatus, setIntegrityStatus] = useState<{ isValid: boolean; totalCommits: number; verifiedCommits: number } | null>(null)
    const [checkingIntegrity, setCheckingIntegrity] = useState(false)

    const [aiReview, setAiReview] = useState<AIReviewResult | null>(null)
    const [aiExplanation, setAiExplanation] = useState('')
    const [aiLoading, setAiLoading] = useState(false)
    const [mentorAnalytics, setMentorAnalytics] = useState<{ timestamp: string, commitId: string, readabilityScore: number, mentorFeedback: string, criticalBug: boolean }[]>([])
    const [chatMessages, setChatMessages] = useState<{
        role: string; text: string;
        fixData?: { fix: string; path: string; originalContent: string }
    }[]>([])
    const [chatInput, setChatInput] = useState('')

    const [onlineUsers, setOnlineUsers] = useState<{ email: string; current_file: string | null }[]>([])

    const fetchRepo = useCallback(async (userId: string) => {
        try {
            const [repoRes, commitsRes, analyticsRes] = await Promise.all([
                supabase.from('repositories').select('*').eq('id', repoId).single(),
                fetch(`/api/commits?repoId=${repoId}`),
                fetch(`/api/analytics?repoId=${repoId}`)
            ])
            if (analyticsRes.ok) {
                const analyticsData = await analyticsRes.json()
                if (Array.isArray(analyticsData)) setMentorAnalytics(analyticsData)
            }
            if (repoRes.data) setRepo(repoRes.data)
            const commitsData = await commitsRes.json()
            if (Array.isArray(commitsData)) {
                setCommits(commitsData)
                setSliderValue(commitsData.length > 0 ? commitsData.length - 1 : 0)
                if (commitsData.length > 0) {
                    const filesRes = await fetch(`/api/commits?commitId=${commitsData[0].id}`)
                    const filesData = await filesRes.json()
                    setFiles(Array.isArray(filesData) ? filesData : [])
                }
            }
        } catch { }
        finally { setLoading(false) }
    }, [repoId])

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        setUser(u)
        fetchRepo(u.id)
        const channel = supabase.channel(`repo:${repoId}`)
        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState()
                const users = Object.values(state).flat().map((s: Record<string, unknown>) => ({
                    email: s.email as string, current_file: s.current_file as string | null
                }))
                setOnlineUsers(users)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ user_id: u.id, email: u.email, current_file: null, online_at: new Date().toISOString() })
                }
            })
        return () => { supabase.removeChannel(channel) }
    }, [repoId, router, fetchRepo])

    function stageEdit() {
        if (!selectedFile) return
        setStagedChanges(prev => {
            const existing = prev.findIndex(f => f.path === selectedFile.path)
            if (existing >= 0) {
                const updated = [...prev]
                updated[existing] = { path: selectedFile.path, content: editContent }
                return updated
            }
            return [...prev, { path: selectedFile.path, content: editContent }]
        })
        setSelectedFile({ ...selectedFile, content: editContent })
        setEditMode(false)
    }

    function addNewFile() {
        if (!newFileName.trim()) return
        const newFile: TreeEntry = { id: `new-${Date.now()}`, commit_id: '', path: newFileName, blob_hash: '', content: newFileContent }
        setFiles(prev => [...prev, newFile])
        setStagedChanges(prev => [...prev, { path: newFileName, content: newFileContent }])
        setSelectedFile(newFile)
        setShowNewFile(false)
        setNewFileName('')
        setNewFileContent('')
    }

    function removeStaged(path: string) {
        setStagedChanges(prev => prev.filter(f => f.path !== path))
    }

    async function handlePush(e: React.FormEvent) {
        e.preventDefault()
        if (!user || stagedChanges.length === 0) return
        setPushing(true)
        try {
            const allFiles = files.map(f => {
                const staged = stagedChanges.find(s => s.path === f.path)
                return staged || { path: f.path, content: f.content || '' }
            })
            stagedChanges.forEach(s => {
                if (!allFiles.find(f => f.path === s.path)) allFiles.push(s)
            })
            const res = await fetch('/api/commits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
                body: JSON.stringify({ repoId, message: commitMsg || 'Update files', files: allFiles })
            })
            if (res.ok) {
                setStagedChanges([])
                setCommitMsg('')
                setShowUpload(false)
                fetchRepo(user.id)
            }
        } catch { }
        finally { setPushing(false) }
    }

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const uploadedFiles = e.target.files
        if (!uploadedFiles) return
        Array.from(uploadedFiles).forEach(file => {
            const reader = new FileReader()
            reader.onload = () => {
                const content = reader.result as string
                const newFile: TreeEntry = { id: `upload-${Date.now()}`, commit_id: '', path: file.name, blob_hash: '', content }
                setFiles(prev => [...prev.filter(f => f.path !== file.name), newFile])
                setStagedChanges(prev => [...prev.filter(f => f.path !== file.name), { path: file.name, content }])
            }
            reader.readAsText(file)
        })
    }

    async function handleSliderChange(idx: number) {
        setSliderValue(idx)
        const commit = commits[commits.length - 1 - idx]
        if (!commit) return
        try {
            const res = await fetch(`/api/commits?commitId=${commit.id}`)
            const data = await res.json()
            setSliderFiles(Array.isArray(data) ? data : [])
        } catch { }
    }

    async function checkIntegrity() {
        setCheckingIntegrity(true)
        try {
            const res = await fetch(`/api/integrity?repoId=${repoId}`)
            const data = await res.json()
            setIntegrityStatus(data)
        } catch { }
        finally { setCheckingIntegrity(false) }
    }

    async function handleRollback(commitId: string) {
        if (!user || !confirm('Rollback to this commit? A new commit will be created.')) return
        try {
            await fetch('/api/commits', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
                body: JSON.stringify({ repoId, targetCommitId: commitId })
            })
            fetchRepo(user.id)
        } catch { }
    }

    async function handleAIExplain(file: TreeEntry) {
        setAiLoading(true)
        setAiExplanation('')
        try {
            const res = await fetch('/api/ai-review', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'explain', code: file.content, filename: file.path })
            })
            const data = await res.json()
            setAiExplanation(data.explanation || 'Could not explain.')
        } catch { setAiExplanation('AI service unavailable.') }
        finally { setAiLoading(false) }
    }

    async function handleAIReview() {
        if (files.length === 0) return
        setAiLoading(true)
        setAiReview(null)
        setTab('ai')
        const diffs = files.map(f => ({ path: f.path, status: 'added' as const, newContent: f.content }))
        try {
            const res = await fetch('/api/ai-review', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'review', diffs })
            })
            const data = await res.json()
            setAiReview(data)
        } catch { }
        finally { setAiLoading(false) }
    }

    async function handleAIFix(issue: string) {
        // Use the selected file if available, otherwise use the first file
        const targetFile = selectedFile || files[0] || null
        const codeForFix = targetFile ? targetFile.content || '' : ''
        const filenameForFix = targetFile?.path || ''

        if (!codeForFix.trim()) {
            setChatMessages(prev => [...prev, { role: 'ai', text: 'No code found to fix. Please select a file first.' }])
            setTab('ai')
            return
        }

        setAiLoading(true)
        setTab('ai')
        // First post a "thinking" message
        setChatMessages(prev => [...prev, { role: 'ai', text: `Generating fix for: "${issue}"...` }])
        try {
            const res = await fetch('/api/ai-review', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'fix', code: codeForFix, filename: filenameForFix, issue })
            })
            const data = await res.json()
            const fixCode = data.fix
            if (!fixCode || data.error) {
                setChatMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = { role: 'ai', text: `${data.error || 'Could not generate fix.'}` }
                    return updated
                })
                return
            }
            // Replace thinking message with confirmation prompt + the fix code + action buttons
            setChatMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                    role: 'ai',
                    text: `Fix suggestion for "${issue}" in \`${filenameForFix}\`:\n\n\`\`\`\n${fixCode}\n\`\`\`\n\nShould I apply this fix to the file?`,
                    fixData: { fix: fixCode, path: filenameForFix, originalContent: codeForFix }
                }
                return updated
            })
        } catch {
            setChatMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'ai', text: 'Failed to generate fix. Please try again.' }
                return updated
            })
        }
        finally { setAiLoading(false) }
    }

    function applyFix(msgIndex: number) {
        const msg = chatMessages[msgIndex]
        if (!msg?.fixData) return
        const { fix, path } = msg.fixData
        // Apply to files state
        setFiles(prev => prev.map(f => f.path === path ? { ...f, content: fix } : f))
        if (selectedFile?.path === path) {
            setSelectedFile(prev => prev ? { ...prev, content: fix } : prev)
            setEditContent(fix)
        }
        // Stage the change
        setStagedChanges(prev => {
            const without = prev.filter(s => s.path !== path)
            return [...without, { path, content: fix }]
        })
        // Confirm in chat + remove the fix data so buttons disappear
        setChatMessages(prev => prev.map((m, i) =>
            i === msgIndex
                ? { role: 'ai', text: `Fix applied to \`${path}\`. The change is staged — commit when ready.` }
                : m
        ))
    }

    function dismissFix(msgIndex: number) {
        setChatMessages(prev => prev.map((m, i) =>
            i === msgIndex
                ? { role: 'ai', text: 'Fix dismissed.' }
                : m
        ))
    }

    async function handleChat(e: React.FormEvent) {
        e.preventDefault()
        if (!chatInput.trim()) return
        const question = chatInput
        setChatMessages(prev => [...prev, { role: 'user', text: question }])
        setChatInput('')
        setAiLoading(true)
        try {
            const codeContext = files.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n')
            const res = await fetch('/api/ai-review', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'chat', question, codeContext })
            })
            const data = await res.json()
            setChatMessages(prev => [...prev, { role: 'ai', text: data.answer || 'No response' }])
        } catch {
            setChatMessages(prev => [...prev, { role: 'ai', text: 'AI service unavailable.' }])
        }
        finally { setAiLoading(false) }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-page)', flexDirection: 'column', gap: '16px' }}>
                <Loader2 size={32} className="animate-spin" color="var(--accent)" />
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading repository...</p>
            </div>
        )
    }

    const activeSliderFiles = sliderFiles.length > 0 ? sliderFiles : files

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
            {/* Top navigation bar */}
            <nav style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 28px',
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--border)',
                position: 'sticky', top: 0, zIndex: 100,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', transition: 'color 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        <ArrowLeft size={18} />
                    </Link>
                    <div style={{ width: '1px', height: '18px', background: 'var(--border)' }} />
                    <div style={{
                        width: 28, height: 28, borderRadius: '8px',
                        background: 'var(--gradient-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <GitBranch size={14} color="#fff" />
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{repo?.name || 'Repository'}</span>
                    {stagedChanges.length > 0 && (
                        <span className="badge badge-warning">{stagedChanges.length} unsaved</span>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Online presence */}
                    {onlineUsers.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px', borderRadius: 'var(--radius-full)', background: 'var(--success-bg)', border: '1px solid rgba(22,163,74,.2)' }}>
                            <div className="presence-dot" />
                            <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>{onlineUsers.length} online</span>
                            <div style={{ display: 'flex', marginLeft: '2px' }}>
                                {onlineUsers.slice(0, 3).map((u, i) => (
                                    <div key={i} title={u.email} className="avatar" style={{ marginLeft: i > 0 ? '-8px' : '0', width: 24, height: 24, fontSize: '10px' }}>
                                        {u.email[0].toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <button className="btn-ghost" onClick={checkIntegrity} disabled={checkingIntegrity} style={{ padding: '7px 14px', fontSize: '13px' }}>
                        {checkingIntegrity ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />} Verify
                    </button>
                    <button className="btn-ghost" onClick={handleAIReview} disabled={aiLoading || files.length === 0} style={{ padding: '7px 14px', fontSize: '13px' }}>
                        <Sparkles size={14} /> AI Review
                    </button>
                    <button className="btn-primary" onClick={() => setShowUpload(!showUpload)} style={{ padding: '7px 16px', fontSize: '13px' }}>
                        <Upload size={14} /> Commit
                    </button>
                </div>
            </nav>

            {/* Integrity banner */}
            {integrityStatus && (
                <div className="fade-in" style={{
                    padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: integrityStatus.isValid ? 'var(--success-bg)' : 'var(--danger-bg)',
                    borderBottom: `1px solid ${integrityStatus.isValid ? 'rgba(22,163,74,.2)' : 'rgba(220,38,38,.2)'}`,
                    fontSize: '14px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {integrityStatus.isValid
                            ? <ShieldCheck size={18} color="var(--success)" />
                            : <ShieldAlert size={18} color="var(--danger)" />}
                        <span style={{ fontWeight: 600, color: integrityStatus.isValid ? 'var(--success)' : 'var(--danger)' }}>
                            {integrityStatus.isValid ? 'All commits verified — blockchain chain intact' : 'Chain Broken — Potential tampering detected!'}
                        </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {integrityStatus.verifiedCommits}/{integrityStatus.totalCommits} verified
                    </span>
                </div>
            )}

            {/* Commit panel */}
            {showUpload && (
                <div className="fade-in" style={{
                    margin: '16px 28px 0',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-md)'
                }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-hover)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <GitCommit size={16} color="var(--accent)" />
                            <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Commit & Push</h3>
                        </div>
                        <button onClick={() => setShowUpload(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                            <X size={16} />
                        </button>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                        {stagedChanges.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staged Changes</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {stagedChanges.map(f => (
                                        <div key={f.path} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '7px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)',
                                            border: '1px solid rgba(22,163,74,.15)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Check size={12} color="var(--success)" />
                                                <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>{f.path}</span>
                                            </div>
                                            <button onClick={() => removeStaged(f.path)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <form onSubmit={handlePush} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input type="file" multiple onChange={handleFileUpload} style={{ fontSize: '13px', color: 'var(--text-secondary)' }} />
                                <input className="input-field" placeholder="Commit message (e.g. 'Fix login bug')" value={commitMsg}
                                    onChange={e => setCommitMsg(e.target.value)} style={{ fontSize: '13px' }} />
                            </div>
                            <button className="btn-primary" type="submit" disabled={pushing || stagedChanges.length === 0} style={{ padding: '11px 20px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                {pushing ? <Loader2 size={14} className="animate-spin" /> : <><GitCommit size={14} /> Commit {stagedChanges.length} file{stagedChanges.length !== 1 ? 's' : ''}</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Main IDE area */}
            <div style={{ padding: '16px 28px 28px' }}>
                {/* Tab bar */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <div className="tab-bar">
                        {(
                            [
                                { key: 'files' as const, label: 'Files', icon: FileCode, count: undefined },
                                { key: 'history' as const, label: 'History', icon: Clock, count: commits.length },
                                { key: 'ai' as const, label: 'AI Review', icon: Brain, count: undefined },
                            ]
                        ).map(t => (
                            <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`}
                                onClick={() => setTab(t.key)}>
                                <t.icon size={14} />
                                {t.label}
                                {t.count !== undefined && t.count > 0 && (
                                    <span style={{
                                        fontSize: '10px', fontWeight: 700, padding: '1px 6px',
                                        borderRadius: 'var(--radius-full)',
                                        background: tab === t.key ? 'rgba(99,102,241,.15)' : 'var(--border)',
                                        color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)'
                                    }}>{t.count}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* FILES TAB */}
                {tab === 'files' && (
                    <div className="fade-in">
                        {/* Hidden file input — always mounted so ref works from empty state and file tree */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                        {/* Time-travel slider */}
                        {commits.length > 1 && (
                            <div style={{
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: '16px',
                                boxShadow: 'var(--shadow-xs)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <Clock size={14} color="var(--warning)" />
                                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>Time-Travel</span>
                                    <span className="badge badge-warning" style={{ fontSize: '10px' }}>Commit {sliderValue + 1}/{commits.length}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500, marginLeft: 'auto' }}>
                                        {commits[commits.length - 1 - sliderValue]?.message}
                                    </span>
                                </div>
                                <input type="range" min={0} max={commits.length - 1} value={sliderValue}
                                    onChange={e => handleSliderChange(Number(e.target.value))}
                                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    <span>Oldest</span><span>Latest</span>
                                </div>
                            </div>
                        )}

                        {activeSliderFiles.length === 0 ? (
                            <div style={{
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-lg)', padding: '80px 20px', textAlign: 'center',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <div style={{ width: 64, height: 64, borderRadius: '18px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 16px rgba(99,102,241,.1)' }}>
                                    <FileCode size={30} color="var(--accent)" />
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>Start coding</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '380px', margin: '0 auto 24px', lineHeight: 1.7 }}>
                                    Create a new file or upload existing ones. After editing, AI will review your code for bugs and improvements.
                                </p>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                    <button className="btn-primary" onClick={() => setShowNewFile(true)}><Plus size={15} /> New File</button>
                                    <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Upload Files</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '12px' }}>
                                {/* File tree */}
                                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', alignSelf: 'flex-start', boxShadow: 'var(--shadow-xs)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Files</span>
                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px', borderRadius: '5px', transition: 'all 0.15s' }} title="Upload files from device"
                                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--accent)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                                <FolderOpen size={14} />
                                            </button>
                                            <button onClick={() => setShowNewFile(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px', borderRadius: '5px', transition: 'all 0.15s' }} title="New file"
                                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--accent)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    {activeSliderFiles.map(file => (
                                        <button key={file.id || file.path}
                                            onClick={() => { setSelectedFile(file); setEditMode(false); setAiExplanation('') }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '7px',
                                                padding: '7px 8px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                                                background: selectedFile?.path === file.path ? 'var(--accent-light)' : 'transparent',
                                                color: selectedFile?.path === file.path ? 'var(--accent)' : 'var(--text-secondary)',
                                                fontSize: '13px', textAlign: 'left' as const, width: '100%', transition: 'all 0.15s',
                                                fontWeight: selectedFile?.path === file.path ? 600 : 400,
                                                fontFamily: 'JetBrains Mono, monospace'
                                            }}>
                                            <FileCode size={12} />
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.path}</span>
                                            {stagedChanges.find(s => s.path === file.path) && (
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)', flexShrink: 0 }} />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Editor panel */}
                                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
                                    {selectedFile ? (
                                        <>
                                            {/* Editor header */}
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '10px 16px', borderBottom: '1px solid var(--border)',
                                                background: 'var(--bg-hover)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <FileCode size={14} color="var(--accent)" />
                                                    <span style={{ fontWeight: 600, fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>{selectedFile.path}</span>
                                                    {stagedChanges.find(s => s.path === selectedFile.path) && (
                                                        <span className="badge badge-warning" style={{ fontSize: '10px' }}>Modified</span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {editMode ? (
                                                        <>
                                                            <button className="btn-primary" onClick={stageEdit} style={{ padding: '5px 12px', fontSize: '12px', borderRadius: 'var(--radius-sm)' }}>
                                                                <Save size={12} /> Save
                                                            </button>
                                                            <button className="btn-secondary" onClick={() => setEditMode(false)} style={{ padding: '5px 12px', fontSize: '12px', borderRadius: 'var(--radius-sm)' }}>Cancel</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button className="btn-ghost" onClick={() => { setEditMode(true); setEditContent(selectedFile.content || '') }} style={{ padding: '5px 12px', fontSize: '12px' }}>
                                                                <Edit3 size={12} /> Edit
                                                            </button>
                                                            <button className="btn-ghost" onClick={() => handleAIExplain(selectedFile)} disabled={aiLoading} style={{ padding: '5px 12px', fontSize: '12px' }}>
                                                                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <><Sparkles size={12} /> Explain</>}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* AI explanation */}
                                            {aiExplanation && (
                                                <div className="fade-in" style={{
                                                    padding: '14px 18px', borderBottom: '1px solid var(--border)',
                                                    background: 'var(--accent-light)', fontSize: '13px', lineHeight: 1.7, color: 'var(--text-secondary)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: 'var(--accent)', fontWeight: 700, fontSize: '12px' }}>
                                                        <Brain size={13} /> AI EXPLANATION
                                                    </div>
                                                    {aiExplanation}
                                                </div>
                                            )}

                                            {/* Code area */}
                                            <div style={{ padding: '16px' }}>
                                                {editMode ? (
                                                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{
                                                        width: '100%', minHeight: '400px', padding: '16px', borderRadius: 'var(--radius)',
                                                        border: '2px solid var(--accent)', background: '#1E1E2E', color: '#CDD6F4',
                                                        fontFamily: "'JetBrains Mono', monospace", fontSize: '13px',
                                                        lineHeight: 1.7, resize: 'vertical', outline: 'none'
                                                    }} />
                                                ) : (
                                                    <div className="code-block" style={{ minHeight: '300px' }}>{selectedFile.content || '// Empty file'}</div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '360px', gap: '10px' }}>
                                            <FileCode size={32} color="var(--border)" />
                                            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Select a file to view and edit</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* HISTORY TAB */}
                {tab === 'history' && (
                    <div className="fade-in">
                        {commits.length === 0 ? (
                            <div style={{
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-lg)', padding: '80px 20px', textAlign: 'center'
                            }}>
                                <GitCommit size={36} color="var(--border)" style={{ margin: '0 auto 14px' }} />
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No commits yet. Create files and push them.</p>
                            </div>
                        ) : (
                            <div style={{ maxWidth: '760px' }}>
                                {commits.map((commit, i) => (
                                    <div key={commit.id} style={{ display: 'flex', gap: '16px', marginBottom: '4px' }}>
                                        {/* Timeline line + dot */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px' }}>
                                            <div style={{
                                                width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                                                background: i === 0 ? 'var(--gradient-accent)' : 'var(--border-hover)',
                                                border: `2px solid ${i === 0 ? 'var(--accent)' : 'var(--border)'}`,
                                                boxShadow: i === 0 ? 'var(--shadow-accent)' : 'none'
                                            }} />
                                            {i < commits.length - 1 && (
                                                <div style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: '4px' }} />
                                            )}
                                        </div>

                                        {/* Commit card */}
                                        <div style={{
                                            flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: '8px',
                                            boxShadow: 'var(--shadow-xs)',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{commit.message}</span>
                                                        {i === 0 && <span className="badge badge-success" style={{ fontSize: '10px' }}>HEAD</span>}
                                                    </div>
                                                    {commit.ai_summary && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '12px', color: 'var(--accent)' }}>
                                                            <Brain size={11} /> {commit.ai_summary}
                                                        </div>
                                                    )}
                                                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                                        <span>{commit.author_email || 'Unknown'}</span>
                                                        <span>{new Date(commit.created_at).toLocaleString()}</span>
                                                        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>#{commit.integrity_hash?.slice(0, 8)}</span>
                                                    </div>
                                                </div>
                                                {i > 0 && (
                                                    <button className="btn-ghost" onClick={() => handleRollback(commit.id)} style={{ padding: '5px 10px', fontSize: '12px', flexShrink: 0, marginLeft: '12px' }}>
                                                        <RotateCcw size={12} /> Rollback
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* AI TAB */}
                {tab === 'ai' && (
                    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {/* Live AI Mentor Dashboard */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', height: '580px' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-hover)' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px var(--accent-glow)' }}>
                                    <Brain size={15} color="var(--accent)" />
                                </div>
                                <h3 style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>Live AI Mentor Dashboard</h3>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', color: 'var(--accent)', background: 'var(--accent-light)', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2s infinite' }} />
                                    Polling DynamoDB
                                </div>
                            </div>
                            
                            <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {mentorAnalytics.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 16px' }}>
                                        <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px dashed var(--border-strong)' }}>
                                            <Sparkles size={26} color="var(--text-muted)" />
                                        </div>
                                        <h4 style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Awaiting Mentor Reviews</h4>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.7 }}>
                                            Push a commit and run your <b>SQS Background Worker</b> to see real-time AI mentoring feedback streaming here via DynamoDB!
                                        </p>
                                    </div>
                                ) : (
                                    mentorAnalytics.map((analytic, idx) => (
                                        <div key={idx} style={{ padding: '16px', borderRadius: 'var(--radius)', background: 'var(--bg-hover)', border: `1px solid ${analytic.criticalBug ? 'rgba(220,38,38,0.3)' : 'var(--border)'}`, position: 'relative', overflow: 'hidden' }}>
                                            {/* Readability Score Gauge */}
                                            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: analytic.readabilityScore > 80 ? '#10b981' : analytic.readabilityScore > 50 ? '#f59e0b' : '#ef4444' }} />
                                            
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>Commit #{analytic.commitId.substring(0,6)}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(analytic.timestamp).toLocaleString()}</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '20px', fontWeight: 800, color: analytic.readabilityScore > 80 ? '#10b981' : analytic.readabilityScore > 50 ? '#f59e0b' : '#ef4444' }}>
                                                    {analytic.readabilityScore} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
                                                </div>
                                            </div>
                                            
                                            {analytic.criticalBug && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--danger)', fontWeight: 700, marginBottom: '12px', background: 'var(--danger-bg)', padding: '6px 10px', borderRadius: '6px' }}>
                                                    <AlertTriangle size={14} /> SNS Alert Dispatched: Critical Bug Detected!
                                                </div>
                                            )}

                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Mentor says: </span>
                                                {analytic.mentorFeedback}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* AI Chat panel */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '580px', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-hover)' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MessageSquare size={15} color="var(--info)" />
                                </div>
                                <h3 style={{ fontWeight: 700, fontSize: '15px' }}>AI Assistant</h3>
                                {aiLoading && <Loader2 size={14} className="animate-spin" color="var(--accent)" style={{ marginLeft: 'auto' }} />}
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {chatMessages.length === 0 && (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: 'auto', lineHeight: 1.9 }}>
                                        <MessageSquare size={28} color="var(--border)" style={{ margin: '0 auto 12px' }} />
                                        Ask me anything about your code:<br />
                                        <span style={{ color: 'var(--accent)' }}>"How does this function work?"</span><br />
                                        <span style={{ color: 'var(--accent)' }}>"Why is my loop not terminating?"</span><br />
                                        <span style={{ color: 'var(--accent)' }}>"Add error handling to this API"</span>
                                    </div>
                                )}
                                {chatMessages.map((msg, i) => (
                                    <div key={i} style={{
                                        display: 'flex', gap: '8px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                        alignItems: 'flex-end'
                                    }}>
                                        <div style={{
                                            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                                            background: msg.role === 'user' ? 'var(--gradient-accent)' : 'var(--info-bg)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {msg.role === 'user'
                                                ? <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{user?.email?.[0]?.toUpperCase()}</span>
                                                : <Brain size={13} color="var(--info)" />
                                            }
                                        </div>
                                        <div style={{
                                            maxWidth: '80%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                            background: msg.role === 'user' ? 'var(--gradient-accent)' : 'var(--bg-hover)',
                                            color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                                            fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                                            border: msg.role === 'ai' ? '1px solid var(--border)' : 'none',
                                            boxShadow: msg.role === 'user' ? 'var(--shadow-accent)' : 'var(--shadow-xs)'
                                        }}>
                                            {msg.text}
                                            {msg.fixData && (
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                                    <button onClick={() => applyFix(i)} style={{
                                                        padding: '7px 16px', borderRadius: 'var(--radius-full)', border: 'none',
                                                        background: 'var(--gradient-accent)', color: '#fff',
                                                        fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '5px',
                                                        boxShadow: 'var(--shadow-accent)'
                                                    }}>
                                                        Yes, apply it
                                                    </button>
                                                    <button onClick={() => dismissFix(i)} style={{
                                                        padding: '7px 16px', borderRadius: 'var(--radius-full)',
                                                        border: '1px solid var(--border)', background: 'var(--bg-card)',
                                                        color: 'var(--text-secondary)', fontWeight: 600,
                                                        fontSize: '12px', cursor: 'pointer'
                                                    }}>
                                                        No thanks
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                                <form onSubmit={handleChat} style={{ display: 'flex', gap: '8px' }}>
                                    <input className="input-field" value={chatInput} onChange={e => setChatInput(e.target.value)}
                                        placeholder="Ask about your code..." style={{ flex: 1, fontSize: '13px', padding: '9px 14px' }} />
                                    <button className="btn-primary" type="submit" disabled={aiLoading} style={{ padding: '9px 16px', flexShrink: 0, borderRadius: 'var(--radius)' }}>
                                        <Send size={15} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* New File Modal */}
            {showNewFile && (
                <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowNewFile(false)}>
                    <div className="modal fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Create New File</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>Add a new file to your repository</p>
                            </div>
                            <button onClick={() => setShowNewFile(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>File name</label>
                                <input className="input-field" placeholder="e.g. main.py, index.js, README.md" value={newFileName}
                                    onChange={e => setNewFileName(e.target.value)} style={{ fontFamily: 'JetBrains Mono, monospace' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>Content</label>
                                <textarea value={newFileContent} onChange={e => setNewFileContent(e.target.value)} placeholder="Write your code here..." style={{
                                    width: '100%', minHeight: '240px', padding: '14px', borderRadius: 'var(--radius)',
                                    border: '1.5px solid var(--border)', background: '#1E1E2E', color: '#CDD6F4',
                                    fontFamily: "'JetBrains Mono', monospace", fontSize: '13px',
                                    lineHeight: 1.7, resize: 'vertical', outline: 'none',
                                    transition: 'border-color 0.2s'
                                }} onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <button className="btn-primary" onClick={addNewFile} disabled={!newFileName.trim()} style={{ borderRadius: 'var(--radius)' }}>
                                    <Plus size={14} /> Create File
                                </button>
                                <button className="btn-secondary" onClick={() => setShowNewFile(false)} style={{ borderRadius: 'var(--radius)' }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
