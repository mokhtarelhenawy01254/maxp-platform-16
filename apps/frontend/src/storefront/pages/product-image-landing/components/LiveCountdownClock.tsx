import React, { useEffect, useState } from "react";

export interface LiveCountdownClockProps {
  initialHours?: number;
}

export const LiveCountdownClock: React.FC<LiveCountdownClockProps> = ({
  initialHours = 4,
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({
    hours: initialHours,
    minutes: 37,
    seconds: 42,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        }
        if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        }
        if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: initialHours, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [initialHours]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className="pil-live-clock"
      role="timer"
      aria-label="الوقت المتبقي لانتهاء الخصم والشحن المجاني"
    >
      <div className="pil-clock-box">
        <span className="pil-clock-num">{pad(timeLeft.hours)}</span>
        <span className="pil-clock-unit">ساعة</span>
      </div>
      <span className="pil-clock-sep">:</span>
      <div className="pil-clock-box">
        <span className="pil-clock-num">{pad(timeLeft.minutes)}</span>
        <span className="pil-clock-unit">دقيقة</span>
      </div>
      <span className="pil-clock-sep">:</span>
      <div className="pil-clock-box">
        <span className="pil-clock-num">{pad(timeLeft.seconds)}</span>
        <span className="pil-clock-unit">ثانية</span>
      </div>
    </div>
  );
};

export default LiveCountdownClock;
