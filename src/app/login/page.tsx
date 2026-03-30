'use client'

import { useState } from 'react'
import { GitBranch, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const res = await fetch('/api/auth', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', email, password })
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Login failed'); return }
            localStorage.setItem('user', JSON.stringify({ id: data.user.id, email: data.user.email }))
            localStorage.setItem('session', JSON.stringify(data.session))
            router.push('/dashboard')
        } catch { setError('Network error') }
        finally { setLoading(false) }
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-page)', fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden'
        }}>
            {/* Background blobs */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', filter: 'blur(50px)' }} />
                <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)', filter: 'blur(50px)' }} />
            </div>

            {/* Card */}
            <div style={{
                position: 'relative', width: '100%', maxWidth: '420px', margin: '24px',
                background: 'rgba(5, 5, 10, 0.6)', backdropFilter: 'blur(24px)',
                borderRadius: '24px', border: '1px solid var(--border-strong)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) inset',
                padding: '40px',
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '36px' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <GitBranch size={15} color="white" />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>CloudVCS</span>
                </div>

                <h1 style={{ fontSize: '26px', fontWeight: 750, letterSpacing: '-0.03em', marginBottom: '6px', color: 'var(--text-primary)' }}>Welcome back</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign up</Link>
                </p>

                {error && (
                    <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px', fontSize: '13px', color: 'var(--danger)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                                style={{
                                    width: '100%', padding: '12px 14px 12px 38px',
                                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                                    borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)'
                                }}
                                onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)' }}
                                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                                style={{
                                    width: '100%', padding: '12px 14px 12px 38px',
                                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                                    borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)'
                                }}
                                onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)' }}
                                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} style={{
                        marginTop: '4px', background: 'var(--text-primary)', color: 'var(--bg-page)', padding: '13px',
                        borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '14px',
                        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        fontFamily: 'inherit', transition: 'transform 0.15s, opacity 0.15s'
                    }} onMouseEnter={e => e.currentTarget.style.transform = loading ? 'none' : 'translateY(-1px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                        {loading ? <Loader2 size={16} className="animate-spin" color="var(--bg-page)" /> : <><span>Sign in</span><ArrowRight size={15} /></>}
                    </button>
                </form>
            </div>
        </div>
    )
}
