'use client'

import Link from 'next/link'
import { GitBranch, Shield, Clock, Users, ArrowRight, Check, Sparkles, BrainCircuit } from 'lucide-react'

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>

      {/* Navbar */}
      <nav style={{
        position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(5, 5, 10, 0.6)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 40px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(129, 140, 248, 0.3)' }}>
            <GitBranch size={16} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>CloudVCS</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/login" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, padding: '8px 16px', borderRadius: '10px', transition: 'color 0.2s' }}>Log in</Link>
          <Link href="/signup" style={{ background: 'var(--text-primary)', color: 'var(--bg-page)', padding: '9px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, boxShadow: '0 4px 14px rgba(255,255,255,0.1)' }}>Get started</Link>
        </div>
      </nav>

      {/* Hero — Deep Space Gradient Mesh */}
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', position: 'relative', overflow: 'hidden',
        background: 'var(--bg-page)',
      }}>
        {/* Glow Effects */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '10%', left: '15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%)', filter: 'blur(60px)' }} />
          <div style={{ position: 'absolute', top: '30%', right: '10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 60%)', filter: 'blur(60px)' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '40%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 60%)', filter: 'blur(80px)' }} />
        </div>

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: '800px', padding: '120px 32px 60px' }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px', background: 'var(--bg-hover)', border: '1px solid var(--border)', marginBottom: '32px' }}>
             <BrainCircuit size={14} color="var(--accent)" />
             <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.04em' }}>INTRODUCING AI CODE MENTOR</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(48px, 8vw, 84px)', fontWeight: 800,
            lineHeight: 1.05, letterSpacing: '-0.04em',
            marginBottom: '24px', color: 'var(--text-primary)',
            textShadow: '0 12px 40px rgba(255,255,255,0.1)'
          }}>
            Git for the cloud.<br /><span className="gradient-text">AI built in.</span>
          </h1>
          <p style={{
            fontSize: '19px', color: 'var(--text-secondary)', lineHeight: 1.7,
            marginBottom: '48px', maxWidth: '540px', margin: '0 auto 48px',
            fontWeight: 400
          }}>
            Version control with a real-time AI Code Mentor, blockchain commit integrity,
            and 5-Service AWS Cloud Architecture.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <Link href="/signup" style={{
              background: 'var(--text-primary)', color: 'var(--bg-page)', padding: '15px 32px',
              borderRadius: '12px', fontSize: '16px', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 8px 30px rgba(255,255,255,0.15)',
              transition: 'transform 0.2s',
            }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              Start for free <ArrowRight size={18} />
            </Link>
            <a href="#architecture" style={{
              background: 'var(--bg-card)', color: 'var(--text-primary)',
              padding: '15px 32px', borderRadius: '12px', fontSize: '16px',
              fontWeight: 600, border: '1px solid var(--border-strong)',
              backdropFilter: 'blur(12px)', transition: 'background 0.2s'
            }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}>
              View Architecture
            </a>
          </div>
        </div>

        {/* Terminal Glass Container */}
        <div style={{
          position: 'relative', maxWidth: '720px', width: '100%', margin: '0 32px',
          background: 'rgba(10,10,18,0.6)', backdropFilter: 'blur(30px)',
          borderRadius: '20px', border: '1px solid var(--border-strong)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) inset',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#EF4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#F59E0B' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10B981' }} />
            <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>cloudvcs — AI Mentorship Pipeline</span>
          </div>
          <div style={{ padding: '24px 28px', fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', lineHeight: 2.2, color: 'var(--text-primary)' }}>
            <div><span style={{ color: 'var(--accent)' }}>$</span> <span>cloudvcs commit -m "update login flow"</span></div>
            <div style={{ color: 'var(--text-muted)' }}>  Uploading 3 files to Amazon S3...</div>
            <div style={{ color: 'var(--text-muted)' }}>  Dispatching commit event to Amazon SQS...</div>
            <div style={{ color: 'var(--text-muted)' }}>  Executing AI Mentor Review on AWS Lambda... <span style={{ color: 'var(--success)', fontWeight: 600 }}>success</span></div>
            <div style={{ color: 'var(--info)', fontSize: '13px', paddingLeft: '16px' }}>➤ Readability Score: 85/100</div>
            <div style={{ color: 'var(--accent)', fontSize: '13px', paddingLeft: '16px', opacity: 0.9 }}>➤ AI Suggestion: Clear variable names, great job! You might want to extract the auth token logic into a separate utility hook for reusability.</div>
            <div style={{ marginTop: '8px' }}><span style={{ color: 'var(--accent)' }}>$</span> <span style={{ color: 'var(--text-muted)' }}>_</span></div>
          </div>
        </div>
        <div style={{ height: '100px' }} />
      </div>

      {/* Features */}
      <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '100px 40px' }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '56px' }}>Novel Capabilities</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '56px' }}>
            {[
              { icon: <BrainCircuit size={24} />, title: 'Real-Time AI Mentor', desc: 'Non-CS coder? Get beginner-friendly code reviews, explain-like-I\'m-5 tutorials, and readability scores.' },
              { icon: <Shield size={24} />, title: 'Blockchain Integrity', desc: 'Every commit is SHA-256 chained. Tamper with one and the entire chain fails verification.' },
              { icon: <Clock size={24} />, title: 'Time-Travel UI', desc: 'Scrub through your entire version history with an interactive slider and visually restore old snapshots.' },
              { icon: <Sparkles size={24} />, title: 'AWS Cloud Architecture', desc: 'Powered by 5 specialized AWS services (S3, SQS, SNS, Lambda, DynamoDB) for maximum scale.' },
            ].map((f, i) => (
              <div key={i}>
                <div style={{ color: 'var(--text-primary)', marginBottom: '16px', width: 48, height: 48, borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '10px', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>{f.title}</div>
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stack panel */}
      <div id="architecture" style={{ maxWidth: '1100px', margin: '0 auto', padding: '120px 40px', display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 1fr', gap: '100px', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '20px', lineHeight: 1.15, textShadow: '0 8px 24px rgba(255,255,255,0.05)' }}>
            Zero infrastructure.<br /><span style={{ color: 'var(--accent)' }}>5 AWS Services.</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', lineHeight: 1.8, marginBottom: '40px' }}>
            An event-driven hybrid cloud masterpiece combining Supabase Authentication with enterprise-grade AWS components.
          </p>
          {[
            'Amazon S3 — Content-Addressable Blob Storage',
            'Amazon SQS — Asynchronous Commit Event Queuing',
            'AWS Lambda — Serverless AI Mentor Engine',
            'Amazon DynamoDB — NoSQL Polyglot Persistence Analytics',
            'Amazon SNS — Educational Automated Warning Emails'
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
              <Check size={18} color="var(--success)" style={{ marginTop: '4px', flexShrink: 0 }} />
              <span style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 500 }}>{item}</span>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--bg-card)', backdropFilter: 'blur(24px)', borderRadius: '24px', border: '1px solid var(--border-strong)', padding: '40px', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
          {[
            { label: 'Supabase', role: 'Identity Provider & SQL Data', dot: '#3ECF8E' },
            { label: 'Amazon S3', role: 'Object Storage', dot: '#FF9900' },
            { label: 'Amazon SQS/SNS', role: 'Message Queue & Notifications', dot: '#FF4F8B' },
            { label: 'Google Gemini', role: 'AI Neural Network', dot: '#4285F4' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot, flexShrink: 0, boxShadow: `0 0 12px ${s.dot}` }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>{s.label}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '120px 40px', textAlign: 'center' as const }}>
          <h2 style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '20px', lineHeight: 1.1 }}>
            Ready to upgrade?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '40px' }}>
            Free. No credit card required.
          </p>
          <Link href="/signup" style={{
            background: 'var(--text-primary)', color: 'var(--bg-page)', padding: '16px 40px',
            borderRadius: '12px', fontSize: '16px', fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            boxShadow: '0 8px 32px rgba(255,255,255,0.15)'
          }}>
            Create your account <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '32px 40px', textAlign: 'center' as const }}>
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          CloudVCS · Cloud Computing Project · Supabase, AWS, Gemini AI
        </span>
      </div>
    </div>
  )
}
