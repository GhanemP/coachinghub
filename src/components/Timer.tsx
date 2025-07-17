import React, { useState, useRef } from "react";

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((sec % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const Timer: React.FC = () => {
"use client";
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const handleStart = () => setRunning(true);
  const handlePause = () => setRunning(false);
  const handleReset = () => {
    setRunning(false);
    setSeconds(0);
  };

  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-2">Timer</h3>
      <div className="text-2xl font-mono mb-2">{formatTime(seconds)}</div>
      <div className="flex gap-2">
        <button
          className="px-3 py-1 rounded bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 disabled:bg-blue-200"
          onClick={handleStart}
          disabled={running}
        >
          Start
        </button>
        <button
          className="px-3 py-1 rounded bg-yellow-500 text-white text-xs font-semibold hover:bg-yellow-600 disabled:bg-yellow-200"
          onClick={handlePause}
          disabled={!running}
        >
          Pause
        </button>
        <button
          className="px-3 py-1 rounded bg-gray-400 text-white text-xs font-semibold hover:bg-gray-500"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default Timer;
