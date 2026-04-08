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
    const models = ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest', 'gemini-1.5-flash', 'gemini-pro']
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
    const prompt = `You are a code review assistant. Analyze the following code changes and write a concise, meaningful commit message (1-2 sentences max). Focus on WHAT changed and WHY. Use conventional commit style (e.g. "fix: ...", "feat: ...", "refactor: ...").

Changes:
${formatDiffForAI(diffs)}

Commit message:`
    return generateWithFallback(prompt)
}

export async function reviewCode(diffs: DiffEntry[]): Promise<AIReviewResult> {
    const prompt = `You are a senior code reviewer with expertise in security, performance, and best practices. Analyze these code changes thoroughly and respond in valid JSON with this exact structure:
{
  "summary": "2-3 sentence summary of what these changes do and their overall quality",
  "bugs": ["Each bug should include: the file/line context, what the bug is, and why it matters"],
  "suggestions": ["Each suggestion should be actionable with a brief code example if relevant"],
  "security": ["Each security concern should reference OWASP categories or common vulnerability types"]
}

Prioritize findings by severity. For each category:
- bugs: Look for null/undefined access, off-by-one errors, race conditions, missing error handling, incorrect logic
- suggestions: Focus on readability, performance, DRY violations, missing types, better patterns
- security: Check for XSS, injection, exposed secrets, insecure defaults, missing authentication checks

If no issues are found in a category, use an empty array. Be specific and reference actual code from the diff.

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
    const ext = filename.split('.').pop() || ''
    const langHint = { 'py': 'Python', 'js': 'JavaScript', 'ts': 'TypeScript', 'tsx': 'React TypeScript', 'jsx': 'React JavaScript', 'java': 'Java', 'cpp': 'C++', 'c': 'C', 'rs': 'Rust', 'go': 'Go' }[ext] || ext
    const prompt = `You are a patient coding mentor. Explain this ${langHint} code in simple terms that a beginner can understand.

Structure your explanation as:
1. **Purpose**: What this code does overall (1 sentence)
2. **How it works**: Step-by-step walkthrough of the key logic (2-3 bullet points)
3. **Key concepts**: Any important programming concepts used (e.g. closures, async/await, recursion)

Keep it concise (5-8 sentences total). Use analogies where helpful.

File: ${filename}
\`\`\`${langHint.toLowerCase()}
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
    const prompt = `You are an expert coding assistant embedded in a cloud-based version control system. You have access to the user's full codebase.

Rules:
- Be concise but thorough. Aim for 3-8 sentences.
- If the user asks "how" to do something, include a brief code snippet.
- If the user asks "why" something isn't working, identify the most likely root cause.
- Reference specific files/functions from their codebase when relevant.
- If you identify a bug, explain what's wrong and how to fix it.
- Never say "I don't have access to your code" — you do, it's provided below.

User's codebase:
${codeContext.slice(0, 12000)}

User question: ${question}

Answer:`
    return generateWithFallback(prompt)
}

export async function analyzeAndFixCode(code: string): Promise<{ errors: string[]; explanation: string; fixedCode: string }> {
    const prompt = `You are an expert AI mentor and code fixer. Analyze the following code.
Find ALL errors (syntax, logic, edge cases), explain them simply to a beginner, and provide the fully corrected code.

Return ONLY a valid JSON object with this exact structure:
{
  "errors": ["Specific bug 1", "Specific bug 2"],
  "explanation": "A beginner-friendly 2-4 sentence explanation of why this code was failing.",
  "fixedCode": "// The completely fixed and final code goes here"
}

Code to analyze:
\`\`\`
${code}
\`\`\`

JSON response:`

    const text = await generateWithFallback(prompt)

    try {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const parsed = JSON.parse(cleaned)
        return {
            errors: Array.isArray(parsed.errors) ? parsed.errors : [],
            explanation: parsed.explanation || "No explanation provided.",
            fixedCode: parsed.fixedCode || code
        }
    } catch {
        return { 
            errors: ["Failed to parse AI response"], 
            explanation: "The AI encountered an error generating the fix.", 
            fixedCode: code 
        }
    }
}
