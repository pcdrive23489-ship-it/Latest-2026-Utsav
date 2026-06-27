
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

export const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
};

export const changeUserPassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
};
