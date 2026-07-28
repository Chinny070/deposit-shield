"use client";

import { useEffect, useState } from "react";

const STAGE_ORDER = [
  "Pending",
  "Proposing",
  "Committing",
  "Revealing",
  "Accepted",
  "Finalized",
];

interface TxTrackerProps {
  currentStatus: string;
  startedAt: number;
  hash: string;
  onComplete?: () => void;
  onUndetermined?: () => void;
}

export function TxTracker({
  currentStatus,
  startedAt,
  hash,
}: TxTrackerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  const currentIdx = STAGE_ORDER.indexOf(currentStatus);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700">Transaction Progress</p>
        <p className="font-mono text-xs text-neutral-400">
          {minutes}:{seconds.toString().padStart(2, "0")}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {STAGE_ORDER.map((stage, i) => {
          const done = i <= currentIdx && currentIdx >= 0;
          const active = i === currentIdx;
          return (
            <div key={stage} className="flex flex-1 flex-col items-center">
              <div
                className={`h-1.5 w-full rounded-full transition-colors duration-500 ${
                  done
                    ? active
                      ? "bg-blue-500 animate-pulse"
                      : "bg-emerald-500"
                    : "bg-neutral-200"
                }`}
              />
              <span
                className={`mt-1 text-[10px] ${
                  done ? "font-medium text-neutral-700" : "text-neutral-400"
                }`}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>

      {currentStatus === "Undetermined" && (
        <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-2">
          <p className="text-xs text-amber-700">
            Validators could not reach consensus. Nothing was written.
            You can safely retry this transaction.
          </p>
        </div>
      )}

      <p className="mt-2 font-mono text-[10px] text-neutral-400 break-all">
        TX: {hash}
      </p>
    </div>
  );
}
