
"use client"
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Video,
  CalendarDays,
  MessageCircle,
  HeartHandshake,
  Sparkles,
  Menu,
  ShieldCheck,
  Loader2,
  Power,
  Crown,
  User,
  Banknote,
  BookCopy,
  ReceiptText,
  Music,
  Palette,
  Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { getFinanceVisibility } from "@/services/database";
import BackButton from "@/components/back-button";

const navGroups = {
  core: [
    { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'member', 'super-admin'] },
    { href: '/profile', label: 'Profile', icon: User, roles: ['admin', 'member', 'super-admin'] },
    { href: '/schedule', label: 'Schedule', icon: CalendarDays, roles: ['admin', 'member', 'super-admin'] },
    { href: '/live-darshan', label: 'Live Darshan', icon: Video, roles: ['admin', 'member', 'super-admin'] },
    { href: '/chat', label: 'Chat', icon: MessageCircle, roles: ['admin', 'member', 'super-admin'] },
    { href: '/devotional-songs', label: 'Devotional Songs', icon: Music, roles: ['admin', 'member', 'super-admin'] },
    { href: '/rangoli-competition', label: 'Rangoli Competition', icon: Palette, roles: ['admin', 'member', 'super-admin'] },
  ],
  finance: [
    { href: '/donate', label: 'Donations', icon: HeartHandshake, roles: ['admin', 'member', 'super-admin'] },
    { href: '/collection', label: 'Collection', icon: BookCopy, roles: ['admin', 'super-admin']},
    { href: '/donations-log', label: 'Donations Log', icon: ReceiptText, roles: ['admin', 'super-admin'] },
    { href: '/finance', label: 'Finance', icon: Banknote, roles: ['admin', 'super-admin', 'member'] }, // Member access is conditional
  ],
  management: [
    { href: '/admin', label: 'Admin', icon: ShieldCheck, roles: ['admin', 'super-admin'] },
    { href: '/super-admin', label: 'Super Admin', icon: Crown, roles: ['super-admin'] },
  ]
};

function NavLink({ href, icon: Icon, label, inSheet }: { href: string; icon: React.ElementType; label: string, inSheet?: boolean }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  const linkContent = (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-md font-medium transition-colors",
           isActive
            ? "bg-primary/90 text-primary-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </Link>
  );

  if (inSheet) {
    return <SheetClose asChild>{linkContent}</SheetClose>;
  }

  return linkContent;
}


function SidebarContent({ inSheet = false, financeVisibleToMembers }: { inSheet?: boolean, financeVisibleToMembers: boolean }) {
    const { user } = useAuth();
    const role = user?.role || 'member';

    const renderNavGroup = (group: typeof navGroups.core) => {
        const visibleLinks = group.filter(link => {
            if (!link.roles.includes(role)) return false;
            if (link.href === '/finance' && role === 'member' && !financeVisibleToMembers) return false;
            return true;
        });

        if (visibleLinks.length === 0) return null;

        return (
             <div className="flex flex-col gap-1">
                {visibleLinks.map((link) => (
                    <NavLink key={link.href} {...link} inSheet={inSheet} />
                ))}
            </div>
        )
    }

    return (
        <nav className="flex flex-col gap-4 p-4">
            <Link href="/dashboard" className="mb-4 flex items-center gap-2 font-bold text-lg text-foreground">
                <Sparkles className="h-6 w-6 text-primary" />
                <span className="font-headline">UtsavConnect</span>
            </Link>
            
            {renderNavGroup(navGroups.core)}
            <Separator className="my-2 bg-border/50"/>
            {renderNavGroup(navGroups.finance)}
            <Separator className="my-2 bg-border/50"/>
            {renderNavGroup(navGroups.management)}
        </nav>
    );
}


export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { status, logout, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [financeVisible, setFinanceVisible] = useState(false);

    const showBackButton = usePathname() !== '/dashboard';

    useEffect(() => {
        if (status === 'authenticated' && user?.role === 'member') {
            getFinanceVisibility().then(setFinanceVisible);
        }
    }, [status, user]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
             if (user?.status === 'pending') {
                logout(); 
                return;
            }

            const checkAccess = (path: string, allowedRoles: string[]) => {
                if (pathname.startsWith(path) && !allowedRoles.includes(user?.role || '')) {
                    router.push('/dashboard');
                }
            }

            checkAccess('/super-admin', ['super-admin']);
            checkAccess('/admin', ['admin', 'super-admin']);
            checkAccess('/collection', ['admin', 'super-admin']);
            checkAccess('/donations-log', ['admin', 'super-admin']);
            
            if (pathname === '/finance' && user?.role === 'member' && !financeVisible) {
                router.push('/dashboard');
            }
        }
    }, [status, user, router, pathname, logout, financeVisible]);
    
    if (status === 'loading' || (status === 'authenticated' && !user)) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    if (status === 'unauthenticated') {
        return null;
    }
    
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden flex bg-background">
          <aside className="hidden lg:flex w-64 flex-col bg-card/50 border-r">
              <SidebarContent financeVisibleToMembers={financeVisible} />
              <div className="mt-auto p-4">
                <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-2 text-muted-foreground hover:text-foreground" onClick={logout}>
                    <Power className="h-5 w-5"/>
                    <span>Logout</span>
                </Button>
              </div>
          </aside>
          <div className="min-w-0 flex-1 flex flex-col">
              <header className="lg:hidden sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card/50 frosted-glass px-4 sm:px-6">
                  <div className="flex min-w-0 items-center gap-2">
                    {showBackButton && <BackButton />}
                    <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-bold text-lg text-primary">
                        <Sparkles className="h-6 w-6 shrink-0" />
                        <span className="font-headline truncate">UtsavConnect</span>
                    </Link>
                  </div>
                  <Sheet>
                      <SheetTrigger asChild>
                          <Button variant="outline" size="icon">
                              <Menu className="h-6 w-6" />
                              <span className="sr-only">Toggle navigation menu</span>
                          </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="p-0 bg-card/80 frosted-glass overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                          </SheetHeader>
                          <SidebarContent inSheet={true} financeVisibleToMembers={financeVisible} />
                           <div className="absolute bottom-0 w-full p-4">
                                <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
                                    <Power className="h-5 w-5 text-muted-foreground"/>
                                    <span className="text-muted-foreground">Logout</span>
                                </Button>
                            </div>
                      </SheetContent>
                  </Sheet>
              </header>
               <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
                  {children}
              </main>
          </div>
      </div>
    );
}
