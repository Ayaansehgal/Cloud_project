'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    GitBranch, GitCommit, Upload, Clock, Shield, ShieldCheck, ShieldAlert,
    FileCode, Brain, MessageSquare, Send, RotateCcw, Loader2, ArrowLeft, Sparkles, Bug, Lightbulb,
    AlertTriangle, X, Plus, Edit3, Save, Trash2, Play
} from 'lucide-react'
import { Repository, Commit, TreeEntry, AIReviewResult } from '@/lib/types'
import { supabase } from '@/lib/supabase'

export default function RepoPage() {
    const params = useParams()
    const router = useRouter()
    const repoId = params.id as string
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
    const [chatMessages, setChatMessages] = useState<{ role: string; text: string }[]>([])
    const [chatInput, setChatInput] = useState('')

    const [onlineUsers, setOnlineUsers] = useState<{ email: string; current_file: string | null }[]>([])

    const fetchRepo = useCallback(async (userId: string) => {
        try {
            const [repoRes, commitsRes] = await Promise.all([
                supabase.from('repositories').select('*').eq('id', repoId).single(),
                fetch(`/api/commits?repoId=${repoId}`)
            ])
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
        if (!selectedFile) return
        setAiLoading(true)
        try {
            const res = await fetch('/api/ai-review', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'fix', code: selectedFile.content, filename: selectedFile.path, issue })
            })
            const data = await res.json()
            if (data.fix) {
                setChatMessages(prev => [...prev, { role: 'ai', text: `💡 Fix suggestion for "${issue}":\n\n${data.fix}` }])
            }
        } catch { }
        finally { setAiLoading(false) }
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-page)' }}>
                <Loader2 size={32} className="animate-spin" color="var(--accent)" />
            </div>
        )
    }

    const activeSliderFiles = sliderFiles.length > 0 ? sliderFiles : files
    const tabStyle = (t: string) => ({
        padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' as const,
        background: tab === t ? 'var(--accent)' : 'transparent',
        color: tab === t ? 'white' : 'var(--text-secondary)',
        fontWeight: 600 as const, fontSize: '14px', transition: 'all 0.2s',
        display: 'flex' as const, alignItems: 'center' as const, gap: '6px'
    })

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
            <nav style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 32px', background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <Link href="/dashboard"><ArrowLeft size={20} color="var(--text-secondary)" /></Link>
                    <GitBranch size={20} color="var(--accent)" />
                    <span style={{ fontSize: '17px', fontWeight: 700 }}>{repo?.name || 'Repository'}</span>
                    {stagedChanges.length > 0 && (
                        <span className="badge badge-warning">{stagedChanges.length} unsaved change{stagedChanges.length > 1 ? 's' : ''}</span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {onlineUsers.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{onlineUsers.length} online</span>
                            <div style={{ display: 'flex', marginLeft: '4px' }}>
                                {onlineUsers.slice(0, 3).map((u, i) => (
                                    <div key={i} title={u.email} style={{
                                        width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '11px', fontWeight: 700, color: 'white',
                                        border: '2px solid var(--bg-secondary)', marginLeft: i > 0 ? '-8px' : '0'
                                    }}>{u.email[0].toUpperCase()}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '20px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                    <button onClick={() => setTab('files')} style={tabStyle('files')}><FileCode size={16} /> Files</button>
                    <button onClick={() => setTab('history')} style={tabStyle('history')}><Clock size={16} /> History</button>
                    <button onClick={() => setTab('ai')} style={tabStyle('ai')}><Brain size={16} /> AI Review</button>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" onClick={checkIntegrity} disabled={checkingIntegrity} style={{ padding: '7px 14px', fontSize: '13px' }}>
                            {checkingIntegrity ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />} Verify
                        </button>
                        <button className="btn-secondary" onClick={handleAIReview} disabled={aiLoading || files.length === 0} style={{ padding: '7px 14px', fontSize: '13px' }}>
                            <Play size={14} /> Run AI Review
                        </button>
                        <button className="btn-primary" onClick={() => setShowUpload(!showUpload)} style={{ padding: '7px 14px', fontSize: '13px' }}>
                            <Upload size={14} /> Commit
                        </button>
                    </div>
                </div>

                {integrityStatus && (
                    <div className="fade-in" style={{
                        padding: '12px 18px', borderRadius: '10px', marginBottom: '16px',
                        background: integrityStatus.isValid ? '#dcfce7' : '#fee2e2',
                        border: `1px solid ${integrityStatus.isValid ? '#86efac' : '#fca5a5'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {integrityStatus.isValid ? <ShieldCheck size={18} color="var(--success)" /> : <ShieldAlert size={18} color="var(--danger)" />}
                            <span style={{ fontWeight: 600, color: integrityStatus.isValid ? 'var(--success)' : 'var(--danger)' }}>
                                {integrityStatus.isValid ? 'Chain Verified' : 'Chain Broken — Tampering detected!'}
                            </span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{integrityStatus.verifiedCommits}/{integrityStatus.totalCommits} verified</span>
                    </div>
                )}

                {showUpload && (
                    <div className="glass-card fade-in" style={{ padding: '20px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Commit & Push</h3>
                            <button onClick={() => setShowUpload(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
                        </div>
                        {stagedChanges.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Staged Changes:</div>
                                {stagedChanges.map(f => (
                                    <div key={f.path} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '6px 10px', borderRadius: '6px', background: '#dcfce7',
                                        marginBottom: '4px', fontSize: '13px'
                                    }}>
                                        <span style={{ color: 'var(--success)', fontWeight: 500 }}>M {f.path}</span>
                                        <button onClick={() => removeStaged(f.path)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <form onSubmit={handlePush} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="file" multiple onChange={handleFileUpload} style={{ fontSize: '13px', color: 'var(--text-secondary)' }} />
                            </div>
                            <input className="input-field" placeholder="Commit message (e.g. 'Fix login bug')" value={commitMsg}
                                onChange={e => setCommitMsg(e.target.value)} style={{ fontSize: '13px' }} />
                            <button className="btn-primary" type="submit" disabled={pushing || stagedChanges.length === 0} style={{ fontSize: '13px' }}>
                                {pushing ? <Loader2 size={14} className="animate-spin" /> : <><GitCommit size={14} /> Commit {stagedChanges.length} file(s)</>}
                            </button>
                        </form>
                    </div>
                )}

                {tab === 'files' && (
                    <div className="fade-in">
                        {commits.length > 1 && (
                            <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <Clock size={16} color="var(--warning)" />
                                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Time-Travel</span>
                                    <span className="badge badge-warning">Commit {sliderValue + 1}/{commits.length}</span>
                                </div>
                                <input type="range" min={0} max={commits.length - 1} value={sliderValue}
                                    onChange={e => handleSliderChange(Number(e.target.value))}
                                    style={{ width: '100%', accentColor: 'var(--accent)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    <span>Oldest</span>
                                    <span style={{ color: 'var(--accent)', fontWeight: 500, fontSize: '12px' }}>{commits[commits.length - 1 - sliderValue]?.message}</span>
                                    <span>Latest</span>
                                </div>
                            </div>
                        )}

                        {activeSliderFiles.length === 0 ? (
                            <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                                <div style={{ width: 56, height: 56, borderRadius: '14px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                    <FileCode size={28} color="var(--accent)" />
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Start coding</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '420px', margin: '0 auto 20px' }}>
                                    Create a new file or upload existing ones. After editing, the AI will review your code for bugs, security issues, and suggest improvements.
                                </p>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                    <button className="btn-primary" onClick={() => setShowNewFile(true)}><Plus size={16} /> New File</button>
                                    <button className="btn-secondary" onClick={() => setShowUpload(true)}><Upload size={16} /> Upload Files</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '16px' }}>
                                <div className="glass-card" style={{ padding: '10px', alignSelf: 'flex-start' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Files</span>
                                        <button onClick={() => setShowNewFile(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }} title="New file"><Plus size={16} /></button>
                                    </div>
                                    {activeSliderFiles.map(file => (
                                        <button key={file.id || file.path} onClick={() => { setSelectedFile(file); setEditMode(false); setAiExplanation('') }} style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '8px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                            background: selectedFile?.path === file.path ? 'var(--accent-light)' : 'transparent',
                                            color: selectedFile?.path === file.path ? 'var(--accent)' : 'var(--text-secondary)',
                                            fontSize: '13px', textAlign: 'left' as const, width: '100%', transition: 'all 0.15s',
                                            fontWeight: selectedFile?.path === file.path ? 600 : 400
                                        }}>
                                            <FileCode size={13} />
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.path}</span>
                                            {stagedChanges.find(s => s.path === file.path) && (
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <div className="glass-card" style={{ padding: '20px' }}>
                                    {selectedFile ? (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <FileCode size={16} color="var(--accent)" />
                                                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{selectedFile.path}</span>
                                                    {stagedChanges.find(s => s.path === selectedFile.path) && (
                                                        <span className="badge badge-success" style={{ fontSize: '10px' }}>Modified</span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {editMode ? (
                                                        <>
                                                            <button className="btn-primary" onClick={stageEdit} style={{ padding: '5px 12px', fontSize: '12px' }}><Save size={12} /> Save</button>
                                                            <button className="btn-secondary" onClick={() => setEditMode(false)} style={{ padding: '5px 12px', fontSize: '12px' }}>Cancel</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button className="btn-secondary" onClick={() => { setEditMode(true); setEditContent(selectedFile.content || '') }} style={{ padding: '5px 12px', fontSize: '12px' }}><Edit3 size={12} /> Edit</button>
                                                            <button className="btn-secondary" onClick={() => handleAIExplain(selectedFile)} disabled={aiLoading} style={{ padding: '5px 12px', fontSize: '12px' }}>{aiLoading ? <Loader2 size={12} className="animate-spin" /> : <><Sparkles size={12} /> Explain</>}</button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {aiExplanation && (
                                                <div className="fade-in" style={{
                                                    padding: '14px', borderRadius: '10px', marginBottom: '12px',
                                                    background: 'var(--accent-light)', border: '1px solid #c4b5fd',
                                                    fontSize: '13px', lineHeight: 1.7, color: 'var(--text-secondary)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--accent)', fontWeight: 600, fontSize: '13px' }}>
                                                        <Brain size={14} /> AI Explanation
                                                    </div>
                                                    {aiExplanation}
                                                </div>
                                            )}
                                            {editMode ? (
                                                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{
                                                    width: '100%', minHeight: '400px', padding: '16px', borderRadius: '10px',
                                                    border: '2px solid var(--accent)', background: '#fafbff',
                                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '13px',
                                                    lineHeight: 1.6, resize: 'vertical', outline: 'none', color: 'var(--text-primary)'
                                                }} />
                                            ) : (
                                                <div className="code-block" style={{ minHeight: '200px' }}>{selectedFile.content || 'Empty file'}</div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)', fontSize: '14px' }}>
                                            Select a file to view and edit
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {showNewFile && (
                            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                                <div style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '28px', width: '520px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <h3 style={{ fontWeight: 600 }}>Create New File</h3>
                                        <button onClick={() => setShowNewFile(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
                                    </div>
                                    <input className="input-field" placeholder="File name (e.g. main.py, index.js)" value={newFileName}
                                        onChange={e => setNewFileName(e.target.value)} style={{ marginBottom: '12px' }} />
                                    <textarea value={newFileContent} onChange={e => setNewFileContent(e.target.value)} placeholder="Write your code here..." style={{
                                        width: '100%', minHeight: '250px', padding: '14px', borderRadius: '10px',
                                        border: '1px solid var(--border)', background: '#fafbff',
                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '13px',
                                        lineHeight: 1.6, resize: 'vertical', outline: 'none', color: 'var(--text-primary)'
                                    }} />
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                        <button className="btn-primary" onClick={addNewFile} disabled={!newFileName.trim()}>
                                            <Plus size={14} /> Create File
                                        </button>
                                        <button className="btn-secondary" onClick={() => setShowNewFile(false)}>Cancel</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'history' && (
                    <div className="fade-in">
                        {commits.length === 0 ? (
                            <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                                <GitCommit size={36} style={{ margin: '0 auto 12px', color: 'var(--text-muted)', opacity: 0.4 }} />
                                <p style={{ color: 'var(--text-muted)' }}>No commits yet. Create files and push them.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {commits.map((commit, i) => (
                                    <div key={commit.id} className="glass-card" style={{ padding: '18px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <GitCommit size={14} color="var(--accent)" />
                                                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{commit.message}</span>
                                                    {i === 0 && <span className="badge badge-success">HEAD</span>}
                                                </div>
                                                {commit.ai_summary && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '12px', color: 'var(--accent)' }}>
                                                        <Brain size={11} /> {commit.ai_summary}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    <span>{commit.author_email || 'Unknown'}</span>
                                                    <span>{new Date(commit.created_at).toLocaleString()}</span>
                                                    <span style={{ fontFamily: 'monospace' }}>#{commit.integrity_hash?.slice(0, 8)}</span>
                                                </div>
                                            </div>
                                            {i > 0 && (
                                                <button className="btn-secondary" onClick={() => handleRollback(commit.id)} style={{ padding: '5px 10px', fontSize: '11px' }}>
                                                    <RotateCcw size={12} /> Rollback
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'ai' && (
                    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Brain size={18} color="var(--accent)" />
                                <h3 style={{ fontWeight: 700, fontSize: '16px' }}>Code Review</h3>
                            </div>
                            {!aiReview && !aiLoading && (
                                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                                    <Sparkles size={32} color="var(--accent)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                                        AI will analyze your code for bugs, security issues, and improvements.
                                    </p>
                                    <button className="btn-primary" onClick={handleAIReview} disabled={files.length === 0}>
                                        <Play size={14} /> Run Review
                                    </button>
                                </div>
                            )}
                            {aiLoading && !aiReview && (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <Loader2 size={24} className="animate-spin" color="var(--accent)" />
                                    <p style={{ color: 'var(--text-muted)', marginTop: '10px', fontSize: '13px' }}>Analyzing your code...</p>
                                </div>
                            )}
                            {aiReview && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                                        <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '13px' }}>Summary</div>
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{aiReview.summary}</p>
                                    </div>
                                    {aiReview.bugs.length > 0 && (
                                        <div style={{ padding: '12px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fca5a5' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--danger)', marginBottom: '6px', fontSize: '13px' }}>
                                                <Bug size={13} /> Bugs Found
                                            </div>
                                            {aiReview.bugs.map((b, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>• {b}</p>
                                                    <button onClick={() => handleAIFix(b)} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}>Fix →</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {aiReview.suggestions.length > 0 && (
                                        <div style={{ padding: '12px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #93c5fd' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--info)', marginBottom: '6px', fontSize: '13px' }}>
                                                <Lightbulb size={13} /> Suggestions
                                            </div>
                                            {aiReview.suggestions.map((s, i) => <p key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '3px' }}>• {s}</p>)}
                                        </div>
                                    )}
                                    {aiReview.security.length > 0 && (
                                        <div style={{ padding: '12px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fcd34d' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--warning)', marginBottom: '6px', fontSize: '13px' }}>
                                                <AlertTriangle size={13} /> Security Issues
                                            </div>
                                            {aiReview.security.map((s, i) => <p key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '3px' }}>• {s}</p>)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '560px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <MessageSquare size={18} color="var(--info)" />
                                <h3 style={{ fontWeight: 700, fontSize: '16px' }}>AI Assistant</h3>
                            </div>
                            <div style={{
                                flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px',
                                padding: '14px', background: 'var(--bg-hover)', borderRadius: '10px',
                                border: '1px solid var(--border)', marginBottom: '10px'
                            }}>
                                {chatMessages.length === 0 && (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: 'auto', lineHeight: 1.8 }}>
                                        💬 Ask me anything about your code:<br />
                                        &quot;How does this function work?&quot;<br />
                                        &quot;Why is my loop not terminating?&quot;<br />
                                        &quot;Add error handling to this API&quot;
                                    </div>
                                )}
                                {chatMessages.map((msg, i) => (
                                    <div key={i} style={{
                                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        maxWidth: '85%', padding: '10px 14px', borderRadius: '12px',
                                        background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-secondary)',
                                        color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                                        fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                                        border: msg.role === 'ai' ? '1px solid var(--border)' : 'none'
                                    }}>{msg.text}</div>
                                ))}
                                {aiLoading && <Loader2 size={16} className="animate-spin" color="var(--accent)" style={{ margin: '4px 0' }} />}
                            </div>
                            <form onSubmit={handleChat} style={{ display: 'flex', gap: '8px' }}>
                                <input className="input-field" value={chatInput} onChange={e => setChatInput(e.target.value)}
                                    placeholder="Ask about your code..." style={{ flex: 1, fontSize: '13px' }} />
                                <button className="btn-primary" type="submit" disabled={aiLoading} style={{ padding: '8px 14px' }}>
                                    <Send size={14} />
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
