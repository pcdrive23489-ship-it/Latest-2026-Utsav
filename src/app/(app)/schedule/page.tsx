
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FestivalEvent } from '@/lib/types';
import { getEvents } from '@/services/database';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export default function SchedulePage() {
  const [events, setEvents] = useState<FestivalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const fetchedEvents = await getEvents();
        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Failed to fetch events:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not fetch the event schedule.'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [toast]);

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in">
      <PageHeader title="Event Schedule" subtitle="Plan your visit and join the celebrations." />
        {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="flex flex-col">
                        <CardHeader className="space-y-3">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent className="flex-grow space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                        </CardContent>
                        <CardFooter className="justify-end gap-2">
                            <Skeleton className="h-10 w-24" />
                            <Skeleton className="h-10 w-28" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        ) : events.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
                <Bell className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-muted-foreground">No events scheduled yet. Check back soon!</p>
            </Card>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
            <Card key={event.id} className="flex flex-col">
                <CardHeader>
                <CardTitle>{event.title}</CardTitle>
                <CardDescription>
                    <span className="font-semibold">{event.date}</span> | {event.time}
                </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                <p className="text-muted-foreground">{event.description}</p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                <Button variant="outline">
                    <CheckCircle />
                    RSVP
                </Button>
                <Button>
                    <Bell />
                    Set Reminder
                </Button>
                </CardFooter>
            </Card>
            ))}
        </div>
        )}
    </div>
  );
}
