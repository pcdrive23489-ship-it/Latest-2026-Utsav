
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { getFinanceVisibility } from "@/services/database";
import BackButton from "@/components/back-button";

type NavItem = { href: string; label: string; icon: React.ElementType; roles: string[] };

const navGroups: Record<'core' | 'finance' | 'management' | 'superAdmin', NavItem[]> = {
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
    { href: '/collection', label: 'Collection', icon: BookCopy, roles: ['admin', 'super-admin'] },
    { href: '/donations-log', label: 'Donations Log', icon: ReceiptText, roles: ['admin', 'super-admin'] },
    { href: '/finance', label: 'Finance', icon: Banknote, roles: ['admin', 'super-admin', 'member'] }, // Member access is conditional
  ],
  management: [
    { href: '/admin', label: 'Admin', icon: ShieldCheck, roles: ['admin', 'super-admin'] },
  ],
  superAdmin: [
    { href: '/super-admin', label: 'Super Admin', icon: Crown, roles: ['super-admin'] },
  ],
};

function NavLink({ href, icon: Icon, label, inSheet }: { href: string; icon: React.ElementType; label: string; inSheet?: boolean }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  const linkContent = (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] font-medium transition-all duration-200",
        isActive
          ? "bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground hover:translate-x-0.5"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0 transition-transform", !isActive && "group-hover:scale-110")} />
      <span className="truncate">{label}</span>
    </Link>
  );

  if (inSheet) {
    return <SheetClose asChild>{linkContent}</SheetClose>;
  }
  return linkContent;
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-1 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground/60">
      {children}
    </p>
  );
}

function SidebarNav({ inSheet = false, financeVisibleToMembers }: { inSheet?: boolean; financeVisibleToMembers: boolean }) {
  const { user } = useAuth();
  const role = user?.role || 'member';

  const visible = (group: NavItem[]) =>
    group.filter((link) => {
      if (!link.roles.includes(role)) return false;
      if (link.href === '/finance' && role === 'member' && !financeVisibleToMembers) return false;
      return true;
    });

  const coreLinks = visible(navGroups.core);
  const financeLinks = visible(navGroups.finance);
  const managementLinks = visible(navGroups.management);
  const superAdminLinks = visible(navGroups.superAdmin);

  return (
    <nav className="flex flex-col gap-2 p-4">
      <Link href="/dashboard" className="mb-4 flex items-center gap-2.5 px-1 text-lg font-bold text-foreground">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
          <Sparkles className="h-5 w-5 text-primary" />
        </span>
        <span className="font-headline tracking-tight">UtsavConnect</span>
      </Link>

      <div className="flex flex-col gap-1">
        {coreLinks.map((link) => <NavLink key={link.href} {...link} inSheet={inSheet} />)}
      </div>

      {financeLinks.length > 0 && (
        <>
          <Separator className="my-2 bg-border/40" />
          <GroupLabel>Finance</GroupLabel>
          <div className="flex flex-col gap-1">
            {financeLinks.map((link) => <NavLink key={link.href} {...link} inSheet={inSheet} />)}
          </div>
        </>
      )}

      {managementLinks.length > 0 && (
        <>
          <Separator className="my-2 bg-border/40" />
          <GroupLabel>Management</GroupLabel>
          <div className="flex flex-col gap-1">
            {managementLinks.map((link) => <NavLink key={link.href} {...link} inSheet={inSheet} />)}
          </div>
        </>
      )}

      {/* Super Admin is intentionally isolated in its own clearly-labelled
          section, kept apart from the Logout action pinned at the bottom. */}
      {superAdminLinks.length > 0 && (
        <>
          <Separator className="my-2 bg-border/40" />
          <GroupLabel>Super Admin</GroupLabel>
          <div className="flex flex-col gap-1">
            {superAdminLinks.map((link) => <NavLink key={link.href} {...link} inSheet={inSheet} />)}
          </div>
        </>
      )}
    </nav>
  );
}

function LogoutButton({ onLogout, inSheet = false }: { onLogout: () => void; inSheet?: boolean }) {
  const btn = (
    <Button
      variant="ghost"
      className="w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      onClick={onLogout}
    >
      <Power className="h-5 w-5" />
      <span>Logout</span>
    </Button>
  );
  // Inside the sheet, close the drawer as logout fires.
  return inSheet ? <SheetClose asChild>{btn}</SheetClose> : btn;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { status, logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [financeVisible, setFinanceVisible] = useState(false);

  const showBackButton = pathname !== '/dashboard';

  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'member') {
      getFinanceVisibility().then(setFinanceVisible);
    }
  }, [status, user]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      // replace, not push: never leave the protected screen in history.
      router.replace('/login');
    } else if (status === 'authenticated') {
      if (user?.status === 'pending') {
        logout();
        return;
      }

      const checkAccess = (path: string, allowedRoles: string[]) => {
        if (pathname.startsWith(path) && !allowedRoles.includes(user?.role || '')) {
          router.replace('/dashboard');
        }
      };

      checkAccess('/super-admin', ['super-admin']);
      checkAccess('/admin', ['admin', 'super-admin']);
      checkAccess('/collection', ['admin', 'super-admin']);
      checkAccess('/donations-log', ['admin', 'super-admin']);

      if (pathname === '/finance' && user?.role === 'member' && !financeVisible) {
        router.replace('/dashboard');
      }
    }
  }, [status, user, router, pathname, logout, financeVisible]);

  if (status === 'loading' || (status === 'authenticated' && !user)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-14 w-14 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="flex min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 bg-card/40 backdrop-blur-xl lg:flex">
        <div className="flex-1 overflow-y-auto">
          <SidebarNav financeVisibleToMembers={financeVisible} />
        </div>
        <div className="border-t border-white/5 p-4">
          <LogoutButton onLogout={logout} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="frosted-glass sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/5 px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            {showBackButton && <BackButton />}
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2 text-lg font-bold text-primary">
              <Sparkles className="h-6 w-6 shrink-0" />
              <span className="font-headline truncate">UtsavConnect</span>
            </Link>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <SheetHeader>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              </SheetHeader>
              {/* Scrollable nav region */}
              <div className="flex-1 overflow-y-auto pt-[env(safe-area-inset-top)]">
                <SidebarNav inSheet financeVisibleToMembers={financeVisible} />
              </div>
              {/* Logout pinned to the very bottom, separated from Super Admin */}
              <div className="border-t border-white/5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <LogoutButton onLogout={logout} inSheet />
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
