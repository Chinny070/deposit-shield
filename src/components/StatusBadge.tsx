"use client";

import { DEPOSIT_STATUS, STATUS_LABELS } from "@/lib/config";

const STATUS_STYLES: Record<number, string> = {
  [DEPOSIT_STATUS.CREATED]: "bg-neutral-100 text-neutral-600",
  [DEPOSIT_STATUS.FUNDED]: "bg-blue-50 text-blue-700",
  [DEPOSIT_STATUS.MOVE_IN_RECORDED]: "bg-indigo-50 text-indigo-700",
  [DEPOSIT_STATUS.ACTIVE]: "bg-emerald-50 text-emerald-700",
  [DEPOSIT_STATUS.MOVE_OUT_SUBMITTED]: "bg-amber-50 text-amber-700",
  [DEPOSIT_STATUS.EVALUATED]: "bg-purple-50 text-purple-700",
  [DEPOSIT_STATUS.RESOLVED]: "bg-emerald-50 text-emerald-700",
  [DEPOSIT_STATUS.CANCELLED]: "bg-red-50 text-red-600",
};

export function StatusBadge({ status }: { status: number }) {
  const style = STATUS_STYLES[status] ?? "bg-neutral-100 text-neutral-600";
  const label = STATUS_LABELS[status] ?? `Status ${status}`;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}
