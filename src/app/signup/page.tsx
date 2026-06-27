
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage, validateSignupInput } from "@/lib/validation";


export default function SignupPage() {
  const { signup } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateSignupInput(firstName, lastName, email, password);
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
      await signup(email.trim(), password, firstName.trim(), lastName.trim());
      toast({
        title: "Signup Request Sent",
        description: "Your account has been created. Please wait for an administrator to approve your request.",
      });
      router.push("/login");
    } catch (error: unknown) {
        console.error("Signup error:", error);
        toast({
            variant: "destructive",
            title: "Signup Failed",
            description: getErrorMessage(error, 'An unexpected error occurred. Please try again.'),
        })
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md z-10">
        <div className="bg-card/70 backdrop-blur-lg border border-border rounded-2xl p-6 sm:p-8 text-card-foreground shadow-2xl">
          <div className="flex justify-center items-center mb-4 text-center flex-col gap-2">
              <Sparkles className="h-10 w-10 text-primary" />
              <h1 className="text-2xl font-bold text-primary">UtsavConnect</h1>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-2 text-center">Join the Celebration</h2>
          <p className="text-center text-muted-foreground mb-8">Create your account to be part of the community.</p>
          
          <form onSubmit={handleSignup} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
                 </div>
             </div>
             <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
             </div>
             <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={6} />
             </div>

            <Button 
              type="submit"
              className="w-full h-12 text-lg" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-card-foreground/80">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-primary hover:underline">
                Log in
            </Link>
          </p>

          <p className="mt-8 text-xs text-card-foreground/50 text-center">
            Admin approval is required after signup. You will be notified once your account is active.
          </p>
        </div>
      </div>
    </div>
  );
}
