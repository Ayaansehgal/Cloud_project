import { GoogleGenerativeAI } from '@google/generative-ai'
import { DiffEntry, AIReviewResult } from './types'

function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
    return new GoogleGenerativeAI(apiKey)
}

function formatDiffForAI(diffs: DiffEntry[]): string {
    return diffs.map(d => {
        const header = `--- ${d.path} [${d.status}]`
        if (d.status === 'added') return `${header}\n+++ ${d.newContent}`
        if (d.status === 'deleted') return `${header}\n--- ${d.oldContent}`
        return `${header}\nOLD:\n${d.oldContent}\nNEW:\n${d.newContent}`
    }).join('\n\n')
}

export async function generateCommitSummary(diffs: DiffEntry[]): Promise<string> {
    const genAI = getGenAI()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `You are a code review assistant. Analyze the following code changes and write a concise, meaningful commit message (1-2 sentences max). Focus on WHAT changed and WHY.

Changes:
${formatDiffForAI(diffs)}

Commit message:`

    const result = await model.generateContent(prompt)
    return result.response.text().trim()
}

export async function reviewCode(diffs: DiffEntry[]): Promise<AIReviewResult> {
    const genAI = getGenAI()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `You are a senior code reviewer. Analyze these code changes and respond in valid JSON with this exact structure:
{
  "summary": "Brief summary of changes",
  "bugs": ["list of potential bugs found"],
  "suggestions": ["list of improvement suggestions"],
  "security": ["list of security concerns"]
}

If no issues are found in a category, use an empty array. Be concise.

Changes:
${formatDiffForAI(diffs)}

JSON response:`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    try {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
        return JSON.parse(cleaned)
    } catch {
        return {
            summary: text,
            bugs: [],
            suggestions: [],
            security: []
        }
    }
}

export async function explainCode(code: string, filename: string): Promise<string> {
    const genAI = getGenAI()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `Explain this code in simple terms that a beginner can understand. Be concise (3-5 sentences max).

File: ${filename}
\`\`\`
${code}
\`\`\`

Explanation:`

    const result = await model.generateContent(prompt)
    return result.response.text().trim()
}

export async function suggestFix(code: string, issue: string): Promise<string> {
    const genAI = getGenAI()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `Fix the following issue in this code. Return ONLY the corrected code, no explanation.

Issue: ${issue}
Code:
\`\`\`
${code}
\`\`\`

Fixed code:`

    const result = await model.generateContent(prompt)
    return result.response.text().trim().replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '')
}

export async function chatWithAI(question: string, codeContext: string): Promise<string> {
    const genAI = getGenAI()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `You are a helpful coding assistant. Answer the user's question about their codebase. Be concise and practical.

Codebase context:
${codeContext}

User question: ${question}

Answer:`

    const result = await model.generateContent(prompt)
    return result.response.text().trim()
}
