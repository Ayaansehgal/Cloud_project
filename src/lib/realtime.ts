import { supabase } from './supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface PresenceState {
    user_id: string
    email: string
    current_file: string | null
    online_at: string
}

export function subscribeToRepoPresence(
    repoId: string,
    userId: string,
    email: string,
    onSync: (state: Record<string, PresenceState[]>) => void
): RealtimeChannel {
    const channel = supabase.channel(`repo:${repoId}`)

    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState<PresenceState>()
            onSync(state)
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user_id: userId,
                    email,
                    current_file: null,
                    online_at: new Date().toISOString()
                })
            }
        })

    return channel
}

export function updatePresenceFile(channel: RealtimeChannel, userId: string, email: string, filePath: string | null) {
    channel.track({
        user_id: userId,
        email,
        current_file: filePath,
        online_at: new Date().toISOString()
    })
}

export function subscribeToCommits(
    repoId: string,
    onNewCommit: (commit: unknown) => void
): RealtimeChannel {
    return supabase
        .channel(`commits:${repoId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'commits', filter: `repo_id=eq.${repoId}` },
            (payload) => onNewCommit(payload.new)
        )
        .subscribe()
}
