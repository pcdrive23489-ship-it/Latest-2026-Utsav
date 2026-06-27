
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserProfile } from '@/services/database';
import { signup as signupService, login as loginService, logout as logoutService } from '@/services/auth';
import type { UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: UserProfile | null;
  status: AuthStatus;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserContext: (data: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getApprovedProfile(authUser: { id: string; email?: string | null }): Promise<UserProfile> {
  // The profile row is created server-side by the public.handle_new_user()
  // trigger on signup. getUserProfile already retries to absorb replication lag.
  const profile = await getUserProfile(authUser.id);

  if (!profile) {
    throw new Error('Could not load your member profile. Please contact an administrator.');
  }

  if (profile.status === 'pending') {
    throw new Error('Your account is waiting for admin approval.');
  }

  if (profile.status === 'rejected') {
    throw new Error('Your account access has been suspended. Please contact an administrator.');
  }

  return profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const profile = await getApprovedProfile(session.user);
          setUser(profile);
          setStatus('authenticated');
        } catch {
          await logoutService();
          setUser(null);
          setStatus('unauthenticated');
        }
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    }).catch(() => {
      // Never leave status stuck on 'loading' if the session lookup itself fails,
      // otherwise every authenticated screen spins forever.
      setUser(null);
      setStatus('unauthenticated');
    });

    // Listen for auth state changes.
    // IMPORTANT: the callback runs while @supabase/auth-js holds its navigator
    // lock. Awaiting other Supabase calls (the profile query) directly inside it
    // can deadlock that lock, leaving `status` stuck on 'loading' forever. Defer
    // the async work with setTimeout(…, 0) so the lock releases first.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(async () => {
        if (session?.user) {
          try {
            const profile = await getApprovedProfile(session.user);
            setUser(profile);
            setStatus('authenticated');
          } catch {
            await logoutService();
            setUser(null);
            setStatus('unauthenticated');
          }
        } else {
          setUser(null);
          setStatus('unauthenticated');
        }
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateUserContext = useCallback((data: Partial<UserProfile>) => {
    setUser(currentUser => {
      if (!currentUser) return null;
      return { ...currentUser, ...data };
    });
  }, []);

  const login = async (email: string, pass: string) => {
    const result = await loginService(email, pass);
    const authUser = result.user;
    if (!authUser) {
      throw new Error('Login did not return a user. Please try again.');
    }

    try {
      const profile = await getApprovedProfile(authUser);
      setUser(profile);
      setStatus('authenticated');
    } catch (error) {
      await logoutService();
      setUser(null);
      setStatus('unauthenticated');
      throw error;
    }
  };

  const signup = async (email: string, pass: string, firstName: string, lastName: string) => {
    // The public.handle_new_user() trigger creates the profile row (member /
    // pending) from the names passed as auth metadata. Sign out so the user
    // lands on the login/approval flow rather than an unapproved session.
    await signupService(email, pass, firstName, lastName);
    await logoutService();
  };

  const logout = async () => {
    await logoutService();
    setUser(null);
    setStatus('unauthenticated');
    router.push('/login');
  };

  const value: AuthContextType = { user, status, login, signup, logout, updateUserContext };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
