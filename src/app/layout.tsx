
import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import ClientAuthProvider from '@/contexts/client-auth-provider';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'UtsavConnect',
  description: 'Ganesh Utsav Gram – Village Edition',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased'
        )}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ClientAuthProvider>
            {children}
          </ClientAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
