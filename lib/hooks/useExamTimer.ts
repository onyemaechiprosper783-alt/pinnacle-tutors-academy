'use client';

import { useEffect, useRef, useState } from 'react';

interface UseExamTimerOptions {
  durationSeconds: number | null;
  onExpire: () => void;
}

export function useExamTimer({
  durationSeconds,
  onExpire,
}: UseExamTimerOptions) {
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(0, durationSeconds ?? 0)
  );

  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    expiredRef.current = false;

    setSecondsLeft(
      Math.max(0, durationSeconds ?? 0)
    );

    if (!durationSeconds || durationSeconds <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);

          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpireRef.current();
          }

          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [durationSeconds]);

  const minutes = Math.floor(
    secondsLeft / 60
  );

  const seconds = secondsLeft % 60;

  const display = `${minutes}:${seconds
    .toString()
    .padStart(2, '0')}`;

  const isLow =
    durationSeconds !== null &&
    durationSeconds > 0 &&
    secondsLeft <=
      Math.min(60, durationSeconds * 0.1);

  return {
    secondsLeft,
    display,
    isLow,
  };
}
