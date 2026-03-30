import { Commit } from './types'
import { hashContent, getCommitHistory } from './versioning'

export interface IntegrityResult {
    isValid: boolean
    totalCommits: number
    verifiedCommits: number
    brokenAt?: string
}

export async function verifyChain(repoId: string): Promise<IntegrityResult> {
    const commits = await getCommitHistory(repoId)
    const sorted = [...commits].reverse() // ascending order

    if (sorted.length === 0) {
        return { isValid: true, totalCommits: 0, verifiedCommits: 0 }
    }

    let previousIntegrity = '0'.repeat(64)
    let verifiedCount = 0

    for (const commit of sorted) {
        const expectedInput = `${commit.tree_hash}${previousIntegrity}${commit.message}${commit.created_at}`
        const expectedHash = await hashContent(expectedInput)

        if (expectedHash !== commit.integrity_hash) {
            return {
                isValid: false,
                totalCommits: sorted.length,
                verifiedCommits: verifiedCount,
                brokenAt: commit.id
            }
        }

        previousIntegrity = commit.integrity_hash
        verifiedCount++
    }

    return {
        isValid: true,
        totalCommits: sorted.length,
        verifiedCommits: verifiedCount
    }
}

export async function verifyCommit(commit: Commit, parentIntegrityHash: string | null): Promise<boolean> {
    const parent = parentIntegrityHash || '0'.repeat(64)
    const input = `${commit.tree_hash}${parent}${commit.message}${commit.created_at}`
    const expected = await hashContent(input)
    return expected === commit.integrity_hash
}
