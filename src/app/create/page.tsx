"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { TxTracker } from "@/components/TxTracker";

export default function CreateDepositPage() {
  const { connected, writeContract, waitForReceipt, readContract } = useWallet();
  const router = useRouter();

  const [propertyDesc, setPropertyDesc] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [tenantAddress, setTenantAddress] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [txStatus, setTxStatus] = useState("");
  const [txStart, setTxStart] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!connected) {
      setError("Connect a wallet first.");
      return;
    }
    if (propertyDesc.length < 5) {
      setError("Property description must be at least 5 characters.");
      return;
    }
    if (!depositAmount || Number(depositAmount) <= 0) {
      setError("Deposit amount must be a positive number.");
      return;
    }
    if (!tenantAddress.startsWith("0x") || tenantAddress.length !== 42) {
      setError("Tenant address must be a valid 0x address (42 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const hash = await writeContract("create_deposit", [
        propertyDesc,
        BigInt(depositAmount),
        tenantAddress,
      ]);
      setTxHash(hash);
      setTxStart(Date.now());

      await waitForReceipt(hash, undefined, setTxStatus);

      const count = (await readContract("get_deposit_count")) as number;
      router.push(`/deposit/${count}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("EXPECTED:")) {
        setError(msg.split("EXPECTED:")[1].trim());
      } else if (msg.includes("UNDETERMINED") || msg.includes("Undetermined")) {
        setError("Validators could not reach consensus. Nothing was written. Please try again.");
      } else {
        setError(msg);
      }
      setTxHash("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-xl font-bold text-neutral-900">Create a deposit agreement</h1>
      <p className="mt-1 text-sm text-neutral-500">
        As the landlord, you define the terms. The tenant will fund the deposit separately.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="property" className="block text-sm font-medium text-neutral-700">
            Property description
          </label>
          <textarea
            id="property"
            value={propertyDesc}
            onChange={(e) => setPropertyDesc(e.target.value)}
            rows={3}
            placeholder="e.g. 2BR apartment, Unit 4B, 123 Main St — hardwood floors, painted walls, new appliances"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm placeholder:text-neutral-400"
            required
          />
          <p className="mt-1 text-xs text-neutral-400">{propertyDesc.length}/500 characters</p>
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-neutral-700">
            Deposit amount (wei)
          </label>
          <input
            id="amount"
            type="number"
            min="1"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="e.g. 1000000"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm placeholder:text-neutral-400"
            required
          />
        </div>

        <div>
          <label htmlFor="tenant" className="block text-sm font-medium text-neutral-700">
            Tenant address
          </label>
          <input
            id="tenant"
            type="text"
            value={tenantAddress}
            onChange={(e) => setTenantAddress(e.target.value)}
            placeholder="0x..."
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm placeholder:text-neutral-400"
            required
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {txHash && (
          <TxTracker currentStatus={txStatus} startedAt={txStart} hash={txHash} />
        )}

        <button
          type="submit"
          disabled={submitting || !connected}
          className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Creating..." : "Create Deposit Agreement"}
        </button>

        {!connected && (
          <p className="text-center text-xs text-neutral-400">
            Connect a wallet above to create a deposit.
          </p>
        )}
      </form>
    </div>
  );
}
