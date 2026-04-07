'use client'

import { useState } from 'react'
import { GitBranch, Mail, Lock, ArrowRight, Loader2, Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const router = useRouter()

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const res = await fetch('/api/auth', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'signup', email, password })
            })
            const data = await res.json()
            if (!res.ok) {
                // Surface friendly messages for common Supabase errors
                const msg: string = data.error || 'Signup failed'
                if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('email') && msg.toLowerCase().includes('limit')) {
                    setError('Too many signups attempted. Please wait a few minutes and try again, or use a different email.')
                } else if (msg.toLowerCase().includes('already registered')) {
                    setError('An account with this email already exists. Please sign in instead.')
                } else {
                    setError(msg)
                }
                return
            }
            // Email confirmation is disabled — session is returned immediately
            if (data.user) {
                localStorage.setItem('user', JSON.stringify({ id: data.user.id, email: data.user.email }))
                if (data.session) localStorage.setItem('session', JSON.stringify(data.session))
                router.push('/dashboard')
            } else {
                setDone(true)
            }
        } catch { setError('Network error — please check your connection.') }
        finally { setLoading(false) }
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '12px 14px 12px 38px',
        background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', color: '#1A1A1A'
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#EEEAE3', fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden'
        }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)', filter: 'blur(50px)' }} />
                <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,146,60,0.22) 0%, transparent 70%)', filter: 'blur(50px)' }} />
            </div>

            <div style={{
                position: 'relative', width: '100%', maxWidth: '420px', margin: '24px',
                background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(24px)',
                borderRadius: '24px', border: '1px solid rgba(255,255,255,0.9)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.6) inset',
                padding: '40px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '36px' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '8px', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <GitBranch size={15} color="white" />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em' }}>CloudVCS</span>
                </div>

                {done ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Check size={24} color="#16A34A" />
                        </div>
                        <h2 style={{ fontSize: '22px', fontWeight: 750, marginBottom: '10px', letterSpacing: '-0.02em' }}>Check your email</h2>
                        <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: '14px', lineHeight: 1.7 }}>
                            We sent a confirmation link to<br />
                            <strong style={{ color: 'rgba(0,0,0,0.7)' }}>{email}</strong>
                        </p>
                    </div>
                ) : (
                    <>
                        <h1 style={{ fontSize: '26px', fontWeight: 750, letterSpacing: '-0.03em', marginBottom: '6px' }}>Create an account</h1>
                        <p style={{ fontSize: '14px', color: 'rgba(0,0,0,0.45)', marginBottom: '32px' }}>
                            Already have one?{' '}
                            <Link href="/login" style={{ color: '#6366F1', fontWeight: 600 }}>Sign in</Link>
                        </p>

                        {error && (
                            <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px', fontSize: '13px', color: '#DC2626' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(0,0,0,0.6)', marginBottom: '8px' }}>Email</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={14} color="rgba(0,0,0,0.3)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle}
                                        onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
                                        onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; e.target.style.boxShadow = 'none' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(0,0,0,0.6)', marginBottom: '8px' }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={14} color="rgba(0,0,0,0.3)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required minLength={6} style={inputStyle}
                                        onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
                                        onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; e.target.style.boxShadow = 'none' }}
                                    />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} style={{
                                marginTop: '4px', background: '#1A1A1A', color: 'white', padding: '13px',
                                borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '14px',
                                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                fontFamily: 'inherit', transition: 'opacity 0.15s'
                            }}>
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Create account</span><ArrowRight size={15} /></>}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}
