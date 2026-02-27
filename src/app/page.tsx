'use client'

import Link from 'next/link'
import { GitBranch, Brain, Shield, Clock, Users, ArrowRight, Cloud, Database, Cpu, Zap } from 'lucide-react'

export default function LandingPage() {
  const features = [
    { icon: Brain, title: 'AI Code Review', desc: 'Gemini-powered review that finds bugs, suggests improvements, and explains code in plain English.', color: '#8b5cf6' },
    { icon: Shield, title: 'Blockchain Integrity', desc: 'Every commit is chained with SHA-256 hashes. Tamper with one, and the entire chain alerts you.', color: '#16a34a' },
    { icon: Clock, title: 'Time-Travel Slider', desc: 'Scrub through your entire version history with an interactive slider. See any snapshot instantly.', color: '#d97706' },
    { icon: Users, title: 'Real-Time Collaboration', desc: 'See who is viewing your repo right now with live presence indicators and instant commit notifications.', color: '#2563eb' },
  ]

  const cloudServices = [
    { icon: Cpu, label: 'Serverless Compute', detail: 'Vercel Edge Functions' },
    { icon: Database, label: 'Cloud Database', detail: 'Supabase PostgreSQL' },
    { icon: Cloud, label: 'Object Storage', detail: 'S3-Compatible Buckets' },
    { icon: Zap, label: 'AI-as-a-Service', detail: 'Google Gemini API' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 40px', background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GitBranch size={24} color="var(--accent)" />
          <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Cloud<span style={{ color: 'var(--accent)' }}>VCS</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/login">
            <button className="btn-secondary">Log In</button>
          </Link>
          <Link href="/signup">
            <button className="btn-primary">Get Started <ArrowRight size={16} /></button>
          </Link>
        </div>
      </nav>

      <section style={{
        textAlign: 'center', padding: '100px 20px 80px',
        maxWidth: '800px', margin: '0 auto'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '6px 16px', borderRadius: '20px',
          background: 'var(--accent-light)', color: 'var(--accent)',
          fontSize: '13px', fontWeight: 600, marginBottom: '24px'
        }}>
          <Zap size={14} /> Cloud-Native Architecture
        </div>
        <h1 style={{
          fontSize: '52px', fontWeight: 800, lineHeight: 1.1,
          color: 'var(--text-primary)', marginBottom: '20px'
        }}>
          Version Control,<br />
          <span style={{ color: 'var(--accent)' }}>Reimagined</span> for the Cloud
        </h1>
        <p style={{
          fontSize: '18px', color: 'var(--text-secondary)',
          maxWidth: '600px', margin: '0 auto 36px', lineHeight: 1.7
        }}>
          AI-powered code review, blockchain commit integrity, real-time collaboration,
          and time-travel — all running on cloud-native infrastructure.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <Link href="/signup">
            <button className="btn-primary" style={{ padding: '14px 32px', fontSize: '16px' }}>
              Start Free <ArrowRight size={18} />
            </button>
          </Link>
          <a href="https://github.com/Ayaansehgal/Cloud_project" target="_blank" rel="noopener noreferrer">
            <button className="btn-secondary" style={{ padding: '14px 32px', fontSize: '16px' }}>
              <GitBranch size={18} /> View Source
            </button>
          </a>
        </div>
      </section>

      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Powered by <span style={{ color: 'var(--accent)' }}>Novel Features</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Not just another VCS — it&apos;s intelligent, secure, and collaborative by design.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {features.map((f, i) => (
            <div key={i} className="glass-card" style={{ padding: '32px' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '10px',
                background: `${f.color}12`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: '16px'
              }}>
                <f.icon size={22} color={f.color} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section style={{
        maxWidth: '1100px', margin: '0 auto',
        padding: '60px 20px 100px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Cloud <span style={{ color: 'var(--accent)' }}>Architecture</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Every layer is a managed cloud service — zero servers to maintain.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {cloudServices.map((s, i) => (
            <div key={i} className="glass-card" style={{
              padding: '28px 20px', textAlign: 'center'
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '12px',
                background: 'var(--accent-light)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px'
              }}>
                <s.icon size={22} color="var(--accent)" />
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {s.detail}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{
        textAlign: 'center', padding: '24px',
        borderTop: '1px solid var(--border)', color: 'var(--text-muted)',
        fontSize: '13px', background: 'var(--bg-secondary)'
      }}>
        Built for Cloud Computing @ VIT · Powered by Supabase, Vercel & Gemini AI
      </footer>
    </div>
  )
}
