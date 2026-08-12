'use client';

import { useEffect, useRef, useState } from 'react';

export function useExamTimer(durationSeconds: number | null, onExpire: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds ?? 0);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!durationSeconds) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpire();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationSeconds]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const isLow = durationSeconds ? secondsLeft <= Math.min(60, durationSeconds * 0.1) : false;

  return { secondsLeft, display, isLow };
}
