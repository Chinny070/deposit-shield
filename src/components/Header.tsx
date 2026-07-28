"use client";

import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { useState } from "react";

export function Header() {
  const { mode, address, connected, connecting, connectInjected, useGenerated, disconnect } =
    useWallet();
  const [showMenu, setShowMenu] = useState(false);

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-neutral-900">
            DepositShield
          </Link>
          <nav className="hidden items-center gap-4 text-sm sm:flex">
            <Link href="/create" className="text-neutral-600 hover:text-neutral-900 transition-colors">
              New Deposit
            </Link>
            <Link href="/my-deposits" className="text-neutral-600 hover:text-neutral-900 transition-colors">
              My Deposits
            </Link>
          </nav>
        </div>

        <div className="relative">
          {!connected ? (
            <div className="flex items-center gap-2">
              {typeof window !== "undefined" && window.ethereum && (
                <button
                  onClick={connectInjected}
                  disabled={connecting}
                  className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                >
                  {connecting ? "Connecting..." : "Connect Wallet"}
                </button>
              )}
              <button
                onClick={useGenerated}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Use Browser Wallet
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 transition-colors"
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  mode === "injected" ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span className="font-mono text-xs text-neutral-600">{shortAddr}</span>
              <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                {mode === "injected" ? "ext" : "local"}
              </span>
            </button>
          )}

          {showMenu && connected && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
                <div className="border-b border-neutral-100 px-3 py-2">
                  <p className="text-xs text-neutral-400">
                    {mode === "injected" ? "External Wallet" : "Browser Wallet"}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-neutral-600 break-all">{address}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(address);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Copy Address
                </button>
                {mode === "generated" && <WalletActions onClose={() => setShowMenu(false)} />}
                <button
                  onClick={() => {
                    disconnect();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Disconnect
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {connected && mode === "generated" && (
        <div className="border-t border-amber-100 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-700">
          Browser wallet — your key is stored in this browser only. Export it to avoid losing access.
        </div>
      )}
    </header>
  );
}

function WalletActions({ onClose }: { onClose: () => void }) {
  const { exportPrivateKey, importPrivateKey } = useWallet();
  const [showImport, setShowImport] = useState(false);
  const [importValue, setImportValue] = useState("");
  const [error, setError] = useState("");

  return (
    <>
      <button
        onClick={() => {
          const pk = exportPrivateKey();
          if (pk) navigator.clipboard.writeText(pk);
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
      >
        Export Private Key
      </button>
      <button
        onClick={() => setShowImport(!showImport)}
        className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
      >
        Import Private Key
      </button>
      {showImport && (
        <div className="px-3 py-2">
          <input
            type="text"
            placeholder="0x..."
            value={importValue}
            onChange={(e) => setImportValue(e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1 font-mono text-xs"
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          <button
            onClick={() => {
              try {
                importPrivateKey(importValue);
                onClose();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Import failed");
              }
            }}
            className="mt-1 rounded bg-neutral-900 px-2 py-1 text-xs text-white"
          >
            Import
          </button>
        </div>
      )}
    </>
  );
}
