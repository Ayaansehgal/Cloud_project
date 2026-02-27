'use client'

import { useState } from 'react'
import { GitBranch, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const router = useRouter()

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'signup', email, password })
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Signup failed'); return }
            if (data.session) {
                localStorage.setItem('user', JSON.stringify({ id: data.user.id, email: data.user.email }))
                localStorage.setItem('session', JSON.stringify(data.session))
                router.push('/dashboard')
            } else {
                setSuccess(true)
            }
        } catch { setError('Network error') }
        finally { setLoading(false) }
    }

    if (success) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-page)', padding: '20px'
            }}>
                <div style={{
                    width: '100%', maxWidth: '420px', background: 'var(--bg-card)',
                    borderRadius: '16px', padding: '40px', border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-lg)', textAlign: 'center'
                }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: '50%', background: '#dcfce7',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <Mail size={24} color="var(--success)" />
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Check your email</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        We sent a confirmation link to <strong>{email}</strong>
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-page)', padding: '20px'
        }}>
            <div style={{
                width: '100%', maxWidth: '420px', background: 'var(--bg-card)',
                borderRadius: '16px', padding: '40px', border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                        <GitBranch size={24} color="var(--accent)" />
                        <span style={{ fontSize: '20px', fontWeight: 800 }}>
                            Cloud<span style={{ color: 'var(--accent)' }}>VCS</span>
                        </span>
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>Create an account</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Start building with CloudVCS</p>
                </div>

                {error && (
                    <div style={{
                        padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                        background: '#fee2e2', color: 'var(--danger)', fontSize: '13px', fontWeight: 500
                    }}>{error}</div>
                )}

                <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ position: 'relative' }}>
                        <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="input-field" type="email" placeholder="Email address"
                            value={email} onChange={e => setEmail(e.target.value)} required
                            style={{ paddingLeft: '40px' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="input-field" type="password" placeholder="Password (min 6 characters)"
                            value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                            style={{ paddingLeft: '40px' }} />
                    </div>
                    <button className="btn-primary" type="submit" disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '4px' }}>
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <>Create Account <ArrowRight size={16} /></>}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                    Already have an account? <Link href="/login" style={{ fontWeight: 600 }}>Sign in</Link>
                </p>
            </div>
        </div>
    )
}
