# CloudVCS — Cloud-Native Version Control System

A cloud-native version control system built for a Cloud Computing course project. Features AI-powered code review, blockchain commit integrity, real-time collaboration, and a visual time-travel interface.

## Cloud Architecture

| Cloud Concept | Service |
|---|---|
| Serverless Compute | Vercel Edge Functions |
| Cloud Database | Supabase PostgreSQL |
| Cloud Object Storage | S3-Compatible (Supabase Storage) |
| Cloud Authentication | Supabase Auth (JWT) |
| AI-as-a-Service | Google Gemini API |
| Real-time Messaging | Supabase Realtime (WebSocket) |
| Containerization | Docker (Multi-Stage Build) |
| CDN & Edge | Vercel Edge Network |

## Features

- **Content-Addressable Storage** — Files hashed with SHA-256, deduplication built-in
- **AI Code Review** — Gemini analyzes diffs for bugs, suggestions, and security issues
- **AI Commit Summaries** — Auto-generated commit messages from code changes
- **AI Code Explainer** — Click any file to get a plain-English explanation
- **AI Chat Assistant** — Ask questions about your codebase in natural language
- **Blockchain Integrity** — Tamper-proof hash chain with visual verification badges
- **Time-Travel Slider** — Scrub through version history interactively
- **Real-Time Presence** — See who is viewing the repo live
- **RBAC** — Owner / Editor / Viewer roles with Row Level Security
- **Rollback** — One-click restore to any previous commit

## Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons
- **Backend**: Next.js API Routes (Serverless)
- **Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **AI**: Google Gemini 2.0 Flash API
- **Containerization**: Docker

## Setup

### 1. Clone
```bash
git clone https://github.com/Ayaansehgal/Cloud_project.git
cd Cloud_project
npm install
```

### 2. Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL from `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor
3. Create a storage bucket called `vcs-files` (public)
4. Copy your project URL, anon key, and service role key

### 3. Gemini API
1. Get an API key from [aistudio.google.com](https://aistudio.google.com)

### 4. Environment
```bash
cp .env.example .env.local
```
Fill in your keys in `.env.local`.

### 5. Run
```bash
npm run dev
```

### 6. Docker (Optional)
```bash
docker-compose up --build
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/route.ts
│   │   ├── repos/route.ts
│   │   ├── commits/route.ts
│   │   ├── ai-review/route.ts
│   │   └── integrity/route.ts
│   ├── dashboard/page.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── repo/[id]/page.tsx
│   └── page.tsx
├── lib/
│   ├── supabase.ts
│   ├── types.ts
│   ├── versioning.ts
│   ├── integrity.ts
│   ├── ai-review.ts
│   └── realtime.ts
supabase/
└── migrations/001_initial_schema.sql
Dockerfile
docker-compose.yml
```
