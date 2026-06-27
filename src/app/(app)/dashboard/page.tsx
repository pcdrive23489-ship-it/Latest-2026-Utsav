
"use client";
import {
  CalendarDays,
  HeartHandshake,
  MessageCircle,
  Loader2,
  Video,
  Music
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import CountdownTimer from '@/components/countdown-timer';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { getCountdowns } from '@/services/database';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';
import type { Countdown } from '@/lib/types';
import Announcements from '@/components/announcements';

const greetings = [
    "Wishing you a blessed festival 🙏",
    "May your day be filled with joy and celebration ✨",
    "Ganpati Bappa Morya! Let the celebrations begin!",
];

const quickAccessLinks = [
    {
      title: 'Event Schedule',
      href: '/schedule',
      icon: CalendarDays,
      details: "Full schedule",
    },
     {
      title: 'Live Darshan',
      href: '/live-darshan',
      icon: Video,
      details: "Watch the stream",
    },
    {
      title: 'Community Chat',
      href: '/chat',
      icon: MessageCircle,
      details: "Chat with devotees",
    },
    {
      title: 'Devotional Songs',
      href: '/devotional-songs',
      icon: Music,
      details: 'Listen to melodies',
    },
];


export default function DashboardPage() {
    const { user, status } = useAuth();
    const { toast } = useToast();
    const [countdowns, setCountdowns] = useState<Countdown[]>([]);
    const [loading, setLoading] = useState(true);
    const [greeting, setGreeting] = useState(greetings[0]);
    
    useEffect(() => {
        const greetInterval = setInterval(() => {
            setGreeting(g => greetings[(greetings.indexOf(g) + 1) % greetings.length]);
        }, 7000);
        return () => {
            clearInterval(greetInterval);
        }
    }, []);
    
    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const timers = await getCountdowns();
                
                const activeTimers = timers
                    .filter(t => new Date(t.targetDate) > new Date())
                    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
                setCountdowns(activeTimers);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not fetch all dashboard data.'
                });
            } finally {
                setLoading(false);
            }
        }
        if (status === 'authenticated') {
            fetchAllData();
        }
    }, [toast, status]);

    if (loading || status === 'loading') {
        return (
            <div className="flex items-center justify-center p-8 h-full">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

    const nextCountdown = countdowns.length > 0 ? countdowns[0] : null;

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
         <div className='flex items-center gap-5'>
             <div className="p-4 bg-primary/15 rounded-2xl glow-border border border-primary/20">
                 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mandala h-8 w-8 text-primary animate-spin-slow"><path d="M12 12C12 12 12 12 12 12 12 12 12 12 12 12 12 12 12 12 12 12"/><path d="M16 6.35A6.5 6.5 0 1 1 7.65 8"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M20 12h2"/><path d="M2 12h2"/><path d="M17.65 6.35 19 5"/><path d="M5 19l-1.35 1.35"/><path d="M19 19l-1.35-1.35"/><path d="M5 5l-1.35-1.35"/><path d="M12 12a3 3 0 1 1 0-5.9V12Z"/><path d="m9 15 1.5-3"/><path d="m15 15-1.5-3"/></svg>
            </div>
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-white">Welcome, <span className="text-primary">{user?.firstName || 'Devotee'}</span></h1>
                <p className="text-slate-400 text-lg mt-1">{greeting}</p>
            </div>
         </div>
        <div className="flex items-center gap-3">
            <ThemeToggle />
        </div>
      </div>
      
       <div className="relative">
         {nextCountdown && (
            <div className="premium-card p-10 rounded-[32px] text-center relative overflow-hidden group">
                {/* Decorative glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-[100px] pointer-events-none group-hover:bg-primary/10 transition-all duration-700" />
                
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter mb-8 flex items-center justify-center gap-4">
                     <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-temple h-10 w-10 text-primary animate-pulse"><path d="M3 12h2l4-7 4 7h2"/><path d="M3 21h18"/><path d="M5 21V12h14v9"/><path d="M7 21v-3.5a1.5 1.5 0 0 1 3 0V21"/><path d="M14 21v-3.5a1.5 1.5 0 0 1 3 0V21"/><path d="M9 21h6"/></svg>
                    {nextCountdown.name}
                </h2>
                <div className="relative z-10">
                  <CountdownTimer targetDate={nextCountdown.targetDate} />
                </div>
            </div>
         )}
       </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3">
          <Announcements />
        </div>

        {quickAccessLinks.map((item) => (
            <Link href={item.href} key={item.href} className="group">
                <div className="premium-card p-8 rounded-3xl h-full transition-all duration-300 hover:scale-[1.03] hover:border-primary/30 group-active:scale-[0.98]">
                    <div className="flex flex-row items-center justify-between mb-6">
                        <div className="p-4 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors">
                            <item.icon className="h-9 w-9 text-primary" />
                        </div>
                    </div>
                    <h3 className="font-black text-2xl text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400 text-lg">{item.details}</p>
                </div>
            </Link>
        ))}
          
          <div className="premium-card p-8 rounded-3xl flex flex-col justify-center items-center group relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-[#FF9933]/10 to-transparent pointer-events-none" />
             <Link href="/donate" passHref className="relative z-10 w-full">
                <Button size="lg" className="w-full h-16 bg-[#FF9933] hover:bg-[#FF9933]/90 text-white text-xl font-black rounded-2xl shadow-[0_0_25px_rgba(255,153,51,0.4)] transition-all hover:scale-[1.05] active:scale-[0.95]">
                    <HeartHandshake className="mr-3 h-7 w-7"/>
                    Donate Now
                </Button>
            </Link>
        </div>
      </div>

    </div>
  );
}
