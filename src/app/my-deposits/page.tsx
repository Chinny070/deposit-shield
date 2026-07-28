"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { StatusBadge } from "@/components/StatusBadge";
import type { DepositData } from "@/lib/types";

export default function MyDepositsPage() {
  const { address, connected, readContract } = useWallet();
  const [deposits, setDeposits] = useState<DepositData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"landlord" | "tenant">("landlord");

  useEffect(() => {
    if (!connected || !address) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const landlordIds = (await readContract("get_deposits_by_landlord", [
          address,
        ])) as number[];
        const tenantIds = (await readContract("get_deposits_by_tenant", [
          address,
        ])) as number[];
        const allIds = [...new Set([...landlordIds, ...tenantIds])];
        const all = await Promise.all(
          allIds.map((id) => readContract("get_deposit", [id]) as Promise<DepositData>)
        );
        setDeposits(all);
      } catch {
        setDeposits([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [address, connected, readContract]);

  const filtered = deposits.filter((d) =>
    tab === "landlord"
      ? d.landlord.toLowerCase() === address.toLowerCase()
      : d.tenant.toLowerCase() === address.toLowerCase()
  );

  if (!connected) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-neutral-900">My Deposits</h1>
        <p className="mt-2 text-sm text-neutral-500">Connect a wallet to see your deposits.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-bold text-neutral-900">My Deposits</h1>

      <div className="mt-4 flex gap-1 rounded-lg bg-neutral-100 p-0.5">
        {(["landlord", "tenant"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            As {t === "landlord" ? "Landlord" : "Tenant"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center">
          <p className="text-sm text-neutral-500">
            No deposits as {tab}.{" "}
            {tab === "landlord" && (
              <Link href="/create" className="font-medium text-neutral-900 underline">
                Create one.
              </Link>
            )}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {filtered.map((d) => (
            <Link
              key={d.deposit_id}
              href={`/deposit/${d.deposit_id}`}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-300 transition-colors"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">
                  #{d.deposit_id} — {d.property_desc}
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {d.deposit_amount.toLocaleString()} wei
                </p>
              </div>
              <StatusBadge status={d.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
