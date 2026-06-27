
"use client"
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Megaphone } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import { getAnnouncements } from '@/services/database';
import type { Announcement } from '@/lib/types';
import { Skeleton } from './ui/skeleton';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const data = await getAnnouncements();
            setAnnouncements(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }
    fetchAnnouncements();
  }, [])

  useEffect(() => {
    if (!api) {
      return
    }
 
    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)
 
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api])

    if (loading) {
        return <Skeleton className="h-48 w-full" />;
    }
    
    if (announcements.length === 0) {
        return null;
    }

    return (
        <Card className="lg:col-span-1 frosted-glass">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#FF9933]">
                    <Megaphone className="h-6 w-6" />
                    Announcements
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Carousel 
                    setApi={setApi} 
                    className="w-full"
                    plugins={[
                        Autoplay({
                          delay: 5000,
                          stopOnInteraction: true,
                        })
                    ]}
                    opts={{
                        loop: true,
                    }}
                >
                    <CarouselContent>
                        {announcements.map((item) => (
                            <CarouselItem key={item.id}>
                                <div className="space-y-2">
                                    <h3 className="font-bold text-lg">{item.title}</h3>
                                    <p className="text-muted-foreground">{item.content}</p>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>
            </CardContent>
            <CardFooter>
                 <div className="text-center text-sm text-muted-foreground w-full">
                    Slide {current} of {count}
                </div>
            </CardFooter>
        </Card>
    );
}
