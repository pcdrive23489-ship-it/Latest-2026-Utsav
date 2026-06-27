
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FestivalEvent } from '@/lib/types';
import { getEvents } from '@/services/database';
import { useToast } from '@/hooks/use-toast';

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

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 h-full">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold font-headline text-primary">Event Schedule</h1>
        <p className="text-lg text-muted-foreground mt-2">Plan your visit and join the celebrations.</p>
      </div>
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
    </div>
  );
}
