
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { getErrorMessage, validateLoginInput } from "@/lib/validation";


export default function LoginPage() {
  const { login, status } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateLoginInput(email, password);
    if (validationError) {
      toast({
        variant: "destructive",
        title: "Check your details",
        description: validationError,
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      // On successful login, the onAuthStateChanged listener in AuthProvider will redirect.
    } catch (error: unknown) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: getErrorMessage(error, 'An unexpected error occurred. Please try again.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#020609] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full animate-pulse" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="premium-card p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/10">
          <div className="flex justify-center items-center mb-6 text-center flex-col gap-3">
            <div className="p-3 bg-primary/20 rounded-2xl glow-border">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mt-2">Utsav<span className="text-primary">Connect</span></h1>
          </div>
          <h2 className="text-4xl font-bold mb-3 text-center text-white tracking-tight">Welcome Back</h2>
          <p className="text-center text-slate-400 mb-10 text-lg">Sign in to continue the experience.</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-slate-200 ml-1">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                required 
                className="bg-white/5 border-white/10 h-12 rounded-xl focus:ring-primary/50 focus:border-primary transition-all text-white placeholder:text-slate-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
             <div className="space-y-2.5">
              <Label htmlFor="password" className="text-slate-200 ml-1">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                className="bg-white/5 border-white/10 h-12 rounded-xl focus:ring-primary/50 focus:border-primary transition-all text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button 
              type="submit"
              className="w-full h-14 text-xl font-bold rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_hsl(var(--primary)/0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] mt-4" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

            <p className="mt-10 text-center text-slate-400">
                Don't have an account?{" "}
                <Link href="/signup" className="font-bold text-primary hover:text-primary/80 transition-colors">
                    Sign up
                </Link>
            </p>

          <p className="mt-10 text-[10px] text-slate-500 text-center uppercase tracking-widest leading-relaxed">
            By logging in, you agree to our terms of service and our commitment to mutual respect and growth within the community.
          </p>
        </div>
      </div>
    </div>
  );
}
