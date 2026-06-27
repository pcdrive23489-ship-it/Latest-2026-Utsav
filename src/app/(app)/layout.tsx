
'use client';
import ClientLayout from './client-layout';
import type { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
