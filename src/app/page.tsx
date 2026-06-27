"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
