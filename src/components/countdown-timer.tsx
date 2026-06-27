
"use client";

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type CountdownTimerProps = {
  targetDate: string;
};

const CountdownTimer = ({ targetDate }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<{
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      let newTimeLeft = {};

      if (difference > 0) {
        newTimeLeft = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return newTimeLeft;
    };
    
    // Initialize timeLeft on the client to avoid hydration mismatch
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft === null) {
    return <div className="text-xl text-muted-foreground min-h-[120px] flex items-center justify-center">Loading...</div>;
  }

  if (Object.keys(timeLeft).length === 0) {
    return <div className="text-2xl text-primary font-bold min-h-[120px] flex items-center justify-center">The time has come!</div>;
  }

  const renderTimeUnit = (value: number | undefined, label: string) => {
    if (value === undefined) return null;
    return (
      <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-black/10">
        <span className="text-4xl sm:text-6xl md:text-7xl font-bold bg-gradient-to-br from-[hsl(204,100%,40%)] to-[hsl(203,65%,58%)] bg-clip-text text-transparent tracking-tighter">
          {String(value).padStart(2, '0')}
        </span>
        <span className="text-xs sm:text-sm uppercase text-muted-foreground tracking-widest">{label}</span>
      </div>
    );
  };
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
        {renderTimeUnit(timeLeft.days, 'Days')}
        {renderTimeUnit(timeLeft.hours, 'Hours')}
        {renderTimeUnit(timeLeft.minutes, 'Minutes')}
        {renderTimeUnit(timeLeft.seconds, 'Seconds')}
      </div>
  );
};

export default CountdownTimer;
