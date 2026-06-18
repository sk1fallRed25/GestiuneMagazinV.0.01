import { supabase } from '../supabase/supabaseClient';

let sessionErrorCount = 0;

export function getSessionErrorCount() {
    return sessionErrorCount;
}

export function incrementSessionErrorCount() {
    sessionErrorCount++;
}

export async function reportErrorToSupabase(errorMessage: string, stackTrace?: string, context?: any) {
    incrementSessionErrorCount();
    try {
        // Send to local log file via Electron bridge
        if (typeof window !== 'undefined' && (window as any).electronAPI?.log) {
            (window as any).electronAPI.log('error', `[Renderer Exception] ${errorMessage}\nStack: ${stackTrace || 'No stack'}\nContext: ${JSON.stringify(context || {})}`);
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            console.warn('[ErrorReporter] No session available, logging locally only.');
            return;
        }

        const storeId = localStorage.getItem('selected_store_id');
        const profileId = session.user?.id;

        const { error } = await supabase.from('error_reports').insert({
            store_id: storeId || null,
            profile_id: profileId || null,
            error_message: errorMessage,
            stack_trace: stackTrace || null,
            context: context || {}
        });

        if (error) {
            console.error('[ErrorReporter] Failed to upload error report to Supabase:', error);
        }
    } catch (e) {
        console.error('[ErrorReporter] Exception occurred while reporting error:', e);
    }
}
