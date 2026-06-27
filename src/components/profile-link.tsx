
"use client";

import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProfileLink() {
  const { user } = useAuth();
  
  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  }

  if (!user) {
    return null;
  }

  return (
    <Button variant="outline" size="icon" className="bg-card/80 border-primary/50 rounded-full" asChild>
        <Link href="/profile">
            <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL || ''} alt="User avatar" />
                <AvatarFallback className="bg-primary/20">{getInitials(user.firstName, user.lastName)}</AvatarFallback>
            </Avatar>
        </Link>
    </Button>
  );
}
