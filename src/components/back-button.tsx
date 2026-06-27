"use client";

import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={() => router.back()}
      className={cn("shrink-0", className)}
    >
      <ArrowLeft className="h-5 w-5" />
      <span className="sr-only">Go back</span>
    </Button>
  );
}
