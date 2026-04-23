"use client";

import { useEffect, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";

const TIMEOUT_MS = 10 * 60 * 1000; // 10 menit

const EVENTS: (keyof WindowEventMap)[] = [
  "mousemove", "mousedown", "keydown", "touchstart", "scroll", "click", "focus",
];

export function AutoLogout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      signOut({ callbackUrl: "/" });
    }, TIMEOUT_MS);
  }, []);

  useEffect(() => {
    reset();
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [reset]);

  return null; // invisible component
}
