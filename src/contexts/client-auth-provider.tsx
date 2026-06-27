
'use client';

import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/toaster';
import type { ReactNode } from 'react';

export default function ClientAuthProvider({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <Toaster />
        </AuthProvider>
    )
}
