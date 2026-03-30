import { GoogleGenerativeAI } from '@google/generative-ai'
import { DiffEntry, AIReviewResult } from './types'

function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
    return new GoogleGenerativeAI(apiKey)
}

// Try primary model, fall back to flash-lite on quota errors
async function generateWithFallback(prompt: string): Promise<string> {
    const genAI = getGenAI()
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-pro']
    let lastError: Error = new Error('All models failed')

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName })
            const result = await model.generateContent(prompt)
            return result.response.text().trim()
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err))
            const msg = lastError.message || ''
            // Extract retryDelay if present and surface a friendly error
            const retryMatch = msg.match(/retryDelay.*?(\d+)s/)
            if (retryMatch) {
                throw new Error(`Gemini API quota exceeded. Please retry in ${retryMatch[1]} seconds.`)
            }
            // If it's a quota/rate error, try the next model
            if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
                continue
            }
            // Non-quota error — throw immediately
            throw lastError
        }
    }
    throw lastError
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
    const prompt = `You are a code review assistant. Analyze the following code changes and write a concise, meaningful commit message (1-2 sentences max). Focus on WHAT changed and WHY.

Changes:
${formatDiffForAI(diffs)}

Commit message:`
    return generateWithFallback(prompt)
}

export async function reviewCode(diffs: DiffEntry[]): Promise<AIReviewResult> {
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

    const text = await generateWithFallback(prompt)

    try {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const parsed = JSON.parse(cleaned)
        return {
            summary: parsed.summary || text,
            bugs: Array.isArray(parsed.bugs) ? parsed.bugs : [],
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
            security: Array.isArray(parsed.security) ? parsed.security : [],
        }
    } catch {
        return { summary: text, bugs: [], suggestions: [], security: [] }
    }
}

export async function explainCode(code: string, filename: string): Promise<string> {
    const prompt = `Explain this code in simple terms that a beginner can understand. Be concise (3-5 sentences max).

File: ${filename}
\`\`\`
${code}
\`\`\`

Explanation:`
    return generateWithFallback(prompt)
}

export async function suggestFix(code: string, issue: string): Promise<string> {
    const prompt = `Fix the following issue in this code. Return ONLY the corrected code, no explanation.

Issue: ${issue}
Code:
\`\`\`
${code}
\`\`\`

Fixed code:`
    const text = await generateWithFallback(prompt)
    return text.replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '').trim()
}

export async function chatWithAI(question: string, codeContext: string): Promise<string> {
    const prompt = `You are a helpful coding assistant. Answer the user's question about their codebase. Be concise and practical.

Codebase context:
${codeContext.slice(0, 8000)}

User question: ${question}

Answer:`
    return generateWithFallback(prompt)
}
