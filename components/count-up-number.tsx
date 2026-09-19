"use client";

import { useEffect, useRef, useState } from "react";

type CountUpNumberProps = {
  value: number;
  duration?: number;
  maximumFractionDigits?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
};

const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

export function CountUpNumber({
  value,
  duration = 850,
  maximumFractionDigits = 0,
  prefix = "",
  suffix = "",
  className,
}: CountUpNumberProps) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const [displayValue, setDisplayValue] = useState(0);
  const currentValueRef = useRef(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || duration <= 0) {
      currentValueRef.current = safeValue;
      setDisplayValue(safeValue);
      return;
    }

    const from = currentValueRef.current;
    const difference = safeValue - from;
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const nextValue = from + difference * easeOutCubic(progress);
      currentValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        currentValueRef.current = safeValue;
        setDisplayValue(safeValue);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [duration, safeValue]);

  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits,
  }).format(displayValue);

  return (
    <span className={className} aria-label={`${prefix}${new Intl.NumberFormat("id-ID", {
      maximumFractionDigits,
    }).format(safeValue)}${suffix}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
