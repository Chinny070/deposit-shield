"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { StatusBadge } from "@/components/StatusBadge";
import { TxTracker } from "@/components/TxTracker";
import { DEPOSIT_STATUS, DAMAGE_LABELS, DAMAGE_COLORS } from "@/lib/config";
import type { CalldataEncodable } from "genlayer-js/types";
import type { DepositData } from "@/lib/types";

export default function DepositDetailPage() {
  const params = useParams();
  const depositId = Number(params.id);
  const { address, connected, readContract, writeContract, waitForReceipt } = useWallet();

  const [deposit, setDeposit] = useState<DepositData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [txStatus, setTxStatus] = useState("");
  const [txStart, setTxStart] = useState(0);
  const [actionLoading, setActionLoading] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const fetchDeposit = useCallback(async () => {
    try {
      const d = (await readContract("get_deposit", [depositId])) as DepositData;
      setDeposit(d);
    } catch {
      setError("Deposit not found.");
    } finally {
      setLoading(false);
    }
  }, [readContract, depositId]);

  useEffect(() => {
    fetchDeposit();
  }, [fetchDeposit]);

  const isLandlord =
    deposit && address && deposit.landlord.toLowerCase() === address.toLowerCase();
  const isTenant =
    deposit && address && deposit.tenant.toLowerCase() === address.toLowerCase();

  const doAction = async (
    actionName: string,
    fnName: string,
    args: CalldataEncodable[],
    value: bigint = 0n
  ) => {
    setError("");
    setActionLoading(actionName);
    try {
      const hash = await writeContract(fnName, args, value);
      setTxHash(hash);
      setTxStart(Date.now());
      await waitForReceipt(hash, undefined, setTxStatus);
      setTxHash("");
      await fetchDeposit();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("EXPECTED:")) {
        setError(msg.split("EXPECTED:")[1].trim());
      } else if (msg.includes("UNDETERMINED") || msg.includes("Undetermined")) {
        setError(
          "Validators could not reach consensus. Nothing was written. You can safely retry."
        );
      } else {
        setError(msg);
      }
      setTxHash("");
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-neutral-100" />
          <div className="h-32 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-24 animate-pulse rounded-lg bg-neutral-100" />
        </div>
      </div>
    );
  }

  if (!deposit) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-neutral-500">Deposit #{depositId} not found.</p>
        <Link href="/" className="mt-2 inline-block text-sm text-neutral-900 underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-600">
            &larr; All deposits
          </Link>
          <h1 className="mt-1 text-xl font-bold text-neutral-900">
            Deposit #{deposit.deposit_id}
          </h1>
        </div>
        <StatusBadge status={deposit.status} />
      </div>

      <div className="space-y-4">
        <Card title="Property">
          <p className="text-sm text-neutral-700">{deposit.property_desc}</p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-neutral-400">Deposit amount</span>
              <p className="mt-0.5 font-mono text-neutral-700">
                {deposit.deposit_amount.toLocaleString()} wei
              </p>
            </div>
            <div>
              <span className="text-neutral-400">Created</span>
              <p className="mt-0.5 text-neutral-700">{formatTime(deposit.created_at)}</p>
            </div>
          </div>
        </Card>

        <Card title="Parties">
          <div className="grid gap-3 sm:grid-cols-2">
            <PartyInfo
              label="Landlord"
              addr={deposit.landlord}
              isYou={!!isLandlord}
            />
            <PartyInfo
              label="Tenant"
              addr={deposit.tenant}
              isYou={!!isTenant}
            />
          </div>
        </Card>

        {deposit.move_in_url && (
          <Card title="Move-in Evidence">
            <a
              href={deposit.move_in_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-sm text-blue-600 hover:underline"
            >
              {deposit.move_in_url}
            </a>
            <p className="mt-1 text-xs text-neutral-400">
              Submitted {formatTime(deposit.move_in_at)}
            </p>
          </Card>
        )}

        {deposit.move_out_url && (
          <Card title="Move-out Evidence">
            <a
              href={deposit.move_out_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-sm text-blue-600 hover:underline"
            >
              {deposit.move_out_url}
            </a>
            <p className="mt-1 text-xs text-neutral-400">
              Submitted {formatTime(deposit.move_out_at)}
            </p>
          </Card>
        )}

        {deposit.damage_category && (
          <Card title="Evaluation Result">
            <div className="flex items-baseline gap-3">
              <span
                className={`text-lg font-bold ${
                  DAMAGE_COLORS[deposit.damage_category] ?? "text-neutral-600"
                }`}
              >
                {DAMAGE_LABELS[deposit.damage_category] ?? deposit.damage_category}
              </span>
              <span className="text-sm text-neutral-400">
                Tenant receives {deposit.tenant_percent}%
              </span>
            </div>
            {deposit.reasoning && (
              <p className="mt-2 rounded-md bg-neutral-50 p-3 text-sm text-neutral-600 leading-relaxed">
                {deposit.reasoning}
              </p>
            )}
            <p className="mt-2 text-xs text-neutral-400">
              Evaluated {formatTime(deposit.evaluated_at)}
            </p>
          </Card>
        )}

        {deposit.status === DEPOSIT_STATUS.RESOLVED && (
          <Card title="Resolution">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-400">Tenant payout</p>
                <p className="mt-0.5 font-mono text-sm text-emerald-600">
                  {Math.floor(
                    (deposit.deposit_amount * deposit.tenant_percent) / 100
                  ).toLocaleString()}{" "}
                  wei
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Landlord payout</p>
                <p className="mt-0.5 font-mono text-sm text-neutral-700">
                  {Math.floor(
                    (deposit.deposit_amount * (100 - deposit.tenant_percent)) / 100
                  ).toLocaleString()}{" "}
                  wei
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              Resolved {formatTime(deposit.resolved_at)}
            </p>
          </Card>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {txHash && (
          <TxTracker currentStatus={txStatus} startedAt={txStart} hash={txHash} />
        )}

        <ActionPanel
          deposit={deposit}
          isLandlord={!!isLandlord}
          isTenant={!!isTenant}
          connected={connected}
          actionLoading={actionLoading}
          evidenceUrl={evidenceUrl}
          setEvidenceUrl={setEvidenceUrl}
          doAction={doAction}
        />
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
        {title}
      </h2>
      {children}
    </div>
  );
}

function PartyInfo({
  label,
  addr,
  isYou,
}: {
  label: string;
  addr: string;
  isYou: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-neutral-400">
        {label} {isYou && <span className="font-medium text-emerald-600">(you)</span>}
      </p>
      <p className="mt-0.5 truncate font-mono text-xs text-neutral-600">{addr || "—"}</p>
    </div>
  );
}

function ActionPanel({
  deposit,
  isLandlord,
  isTenant,
  connected,
  actionLoading,
  evidenceUrl,
  setEvidenceUrl,
  doAction,
}: {
  deposit: DepositData;
  isLandlord: boolean;
  isTenant: boolean;
  connected: boolean;
  actionLoading: string;
  evidenceUrl: string;
  setEvidenceUrl: (v: string) => void;
  doAction: (
    actionName: string,
    fnName: string,
    args: CalldataEncodable[],
    value?: bigint
  ) => Promise<void>;
}) {
  if (!connected) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center">
        <p className="text-sm text-neutral-500">Connect a wallet to take actions on this deposit.</p>
      </div>
    );
  }

  const s = deposit.status;

  if (s === DEPOSIT_STATUS.CREATED && isTenant) {
    return (
      <Card title="Action Required: Fund Deposit">
        <p className="mb-3 text-sm text-neutral-600">
          As the tenant, send {deposit.deposit_amount.toLocaleString()} wei to lock the deposit.
        </p>
        <ActionButton
          label="Fund Deposit"
          loading={actionLoading === "fund"}
          onClick={() =>
            doAction("fund", "fund_deposit", [deposit.deposit_id], BigInt(deposit.deposit_amount))
          }
        />
      </Card>
    );
  }

  if (s === DEPOSIT_STATUS.CREATED && isLandlord) {
    return (
      <Card title="Waiting for Tenant">
        <p className="text-sm text-neutral-500">
          The tenant needs to fund this deposit before proceeding.
        </p>
        <ActionButton
          label="Cancel Deposit"
          loading={actionLoading === "cancel"}
          onClick={() => doAction("cancel", "cancel_deposit", [deposit.deposit_id])}
          variant="danger"
        />
      </Card>
    );
  }

  if (s === DEPOSIT_STATUS.FUNDED && isTenant) {
    return (
      <Card title="Action Required: Submit Move-in Photos">
        <p className="mb-3 text-sm text-neutral-600">
          Upload your move-in photos to any image hosting service and paste the URL below.
        </p>
        <input
          type="url"
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          placeholder="https://... (link to your move-in photos)"
          className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <ActionButton
          label="Submit Move-in Evidence"
          loading={actionLoading === "move_in"}
          disabled={!evidenceUrl || evidenceUrl.length < 10}
          onClick={() =>
            doAction("move_in", "submit_move_in_evidence", [deposit.deposit_id, evidenceUrl])
          }
        />
      </Card>
    );
  }

  if (s === DEPOSIT_STATUS.MOVE_IN_RECORDED && isLandlord) {
    return (
      <Card title="Action Required: Confirm Move-in">
        <p className="mb-3 text-sm text-neutral-600">
          Review the move-in evidence above and confirm to activate the tenancy.
        </p>
        <ActionButton
          label="Confirm Move-in"
          loading={actionLoading === "confirm"}
          onClick={() => doAction("confirm", "confirm_move_in", [deposit.deposit_id])}
        />
      </Card>
    );
  }

  if (s === DEPOSIT_STATUS.ACTIVE && (isLandlord || isTenant)) {
    return (
      <Card title="Submit Move-out Evidence">
        <p className="mb-3 text-sm text-neutral-600">
          When the tenancy ends, upload move-out photos and paste the URL below.
        </p>
        <input
          type="url"
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          placeholder="https://... (link to move-out photos)"
          className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <ActionButton
          label="Submit Move-out Evidence"
          loading={actionLoading === "move_out"}
          disabled={!evidenceUrl || evidenceUrl.length < 10}
          onClick={() =>
            doAction("move_out", "submit_move_out_evidence", [deposit.deposit_id, evidenceUrl])
          }
        />
      </Card>
    );
  }

  if (s === DEPOSIT_STATUS.MOVE_OUT_SUBMITTED) {
    return (
      <Card title="Ready for Evaluation">
        <p className="mb-3 text-sm text-neutral-600">
          Both move-in and move-out evidence are submitted. Trigger the AI-powered visual
          comparison. This uses GenLayer consensus and takes 2-5 minutes.
        </p>
        <ActionButton
          label="Evaluate Condition"
          loading={actionLoading === "evaluate"}
          onClick={() => doAction("evaluate", "evaluate_condition", [deposit.deposit_id])}
        />
      </Card>
    );
  }

  if (s === DEPOSIT_STATUS.EVALUATED && (isLandlord || isTenant)) {
    return (
      <Card title="Resolve and Distribute Funds">
        <p className="mb-3 text-sm text-neutral-600">
          The evaluation is complete. Resolve to distribute the deposit according to the ruling.
        </p>
        <ActionButton
          label="Resolve Deposit"
          loading={actionLoading === "resolve"}
          onClick={() => doAction("resolve", "resolve_deposit", [deposit.deposit_id])}
        />
      </Card>
    );
  }

  if (s === DEPOSIT_STATUS.RESOLVED || s === DEPOSIT_STATUS.CANCELLED) {
    return null;
  }

  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center">
      <p className="text-sm text-neutral-500">
        {!isLandlord && !isTenant
          ? "You are not a party to this deposit."
          : "Waiting for the other party to act."}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  loading,
  onClick,
  disabled,
  variant = "primary",
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "danger";
}) {
  const base =
    variant === "danger"
      ? "border border-red-200 text-red-600 hover:bg-red-50"
      : "bg-neutral-900 text-white hover:bg-neutral-700";
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`w-full rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${base}`}
    >
      {loading ? "Processing..." : label}
    </button>
  );
}

function formatTime(iso: string): string {
  if (!iso) return "—";
  try {
    const s = iso.replace("Z", "+00:00");
    const d = new Date(s.includes("+") || s.includes("Z") ? iso : iso + "Z");
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  } catch {
    return iso;
  }
}
