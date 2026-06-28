
import { supabase } from '@/lib/supabase';

export const login = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return data;
};

export const signup = async (email: string, pass: string, firstName: string, lastName: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        // Passed to the public.handle_new_user() trigger via raw_user_meta_data
        // so the profile row is created server-side with these names.
        options: { data: { first_name: firstName, last_name: lastName } },
    });
    if (error) throw error;
    return data;
};

/**
 * Fully tears down the user session everywhere it can persist:
 *  - Supabase auth session (global scope -> revokes refresh tokens server-side)
 *  - WebView localStorage / sessionStorage (where Supabase + Capacitor persist)
 *  - Capacitor Preferences, when the plugin is installed
 *
 * Every step is best-effort and isolated so one failure never blocks the rest;
 * a stale token left behind is worse than a noisy console.
 */
export const logout = async () => {
    // 1. Revoke the Supabase session server-side and clear its stored tokens.
    try {
        await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
        // Fall back to a local sign-out so the device is cleared even if the
        // network/global revoke fails.
        try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* ignore */ }
        console.error('Supabase signOut failed during logout:', err);
    }

    // 2. Clear browser/WebView storage (Supabase + app cache live here).
    if (typeof window !== 'undefined') {
        try { window.localStorage.clear(); } catch { /* ignore */ }
        try { window.sessionStorage.clear(); } catch { /* ignore */ }
    }

    // 3. Clear Capacitor Preferences via the runtime-registered plugin, if
    //    present. Accessed off the global so we add no build-time dependency on
    //    @capacitor/preferences (Capacitor's default WebView storage is the
    //    localStorage already cleared above).
    try {
        const cap = (window as unknown as {
            Capacitor?: { Plugins?: { Preferences?: { clear?: () => Promise<void> } } };
        }).Capacitor;
        await cap?.Plugins?.Preferences?.clear?.();
    } catch { /* not on native / plugin absent — ignore */ }
};

export const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
};

export const changeUserPassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
};
