"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { StatusBadge } from "@/components/StatusBadge";
import type { DepositData } from "@/lib/types";

export default function HomePage() {
  const { readContract, connected } = useWallet();
  const [deposits, setDeposits] = useState<DepositData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const ids = (await readContract("get_all_deposit_ids")) as number[];
        const all = await Promise.all(
          ids.slice(-10).map((id) => readContract("get_deposit", [id]) as Promise<DepositData>)
        );
        setDeposits(all.reverse());
      } catch {
        setDeposits([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [readContract]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <section className="mb-16">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Rental deposits, arbitrated by consensus.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-neutral-500 leading-relaxed">
          DepositShield locks security deposits on-chain and uses AI-powered visual
          evidence comparison to determine whether damage occurred — so neither the
          landlord nor the tenant gets to be the judge.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/create"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
          >
            Create a Deposit
          </Link>
          <Link
            href="/my-deposits"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            View My Deposits
          </Link>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-neutral-400">
          How it works
        </h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Lock the deposit",
              desc: "Landlord sets the terms. Tenant funds the deposit on-chain. Both parties are identified.",
            },
            {
              step: "2",
              title: "Submit photo evidence",
              desc: "Tenant photographs move-in condition. At move-out, either party submits move-out photos.",
            },
            {
              step: "3",
              title: "Consensus evaluates",
              desc: "GenLayer validators compare the photos using AI and reach consensus on the damage category. Funds are split accordingly.",
            },
          ].map((item) => (
            <div key={item.step} className="rounded-lg border border-neutral-200 bg-white p-5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
                {item.step}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-neutral-900">{item.title}</h3>
              <p className="mt-1 text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-neutral-400">
          Recent deposits
        </h2>

        {loading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : deposits.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center">
            <p className="text-sm text-neutral-500">
              No deposits yet.{" "}
              {connected ? (
                <Link href="/create" className="font-medium text-neutral-900 underline">
                  Create the first one.
                </Link>
              ) : (
                "Connect a wallet to create one."
              )}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {deposits.map((d) => (
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
      </section>
    </div>
  );
}
