"use client";

import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BackButton({ className, fallbackHref = '/dashboard' }: { className?: string; fallbackHref?: string }) {
  const router = useRouter();

  const handleBack = () => {
    // In the Capacitor WebView the in-app history can be empty (deep link /
    // hard refresh). Fall back to the dashboard so Back is never a dead end.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleBack}
      aria-label="Go back"
      className={cn(
        "shrink-0 rounded-full border-white/10 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10 active:scale-95",
        className
      )}
    >
      <ArrowLeft className="h-5 w-5" />
      <span className="sr-only">Go back</span>
    </Button>
  );
}
