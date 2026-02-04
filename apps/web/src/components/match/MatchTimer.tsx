'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface MatchTimerProps {
  endTime: Date | null;
  onTimeUp?: () => void;
}

export function MatchTimer({ endTime, onTimeUp }: MatchTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!endTime) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const diff = Math.max(0, end - now);
      return Math.floor(diff / 1000);
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onTimeUp?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const isLowTime = timeLeft <= 60;
  const isCriticalTime = timeLeft <= 30;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-lg font-semibold ${
        isCriticalTime
          ? 'animate-pulse bg-red-500/20 text-red-400'
          : isLowTime
          ? 'bg-yellow-500/20 text-yellow-400'
          : 'bg-gray-700/50 text-gray-200'
      }`}
    >
      <Clock className="h-4 w-4" />
      <span>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
