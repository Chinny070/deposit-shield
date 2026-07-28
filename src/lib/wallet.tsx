"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { TransactionStatus } from "genlayer-js/types";
import { chain, chainLabel, CONTRACT_ADDRESS } from "./config";
import type { CalldataEncodable } from "genlayer-js/types";
import type { WalletMode } from "./types";

const STORAGE_KEY = "depositshield_wallet_pk";

interface WalletContextValue {
  mode: WalletMode;
  address: string;
  connected: boolean;
  connecting: boolean;
  connectInjected: () => Promise<void>;
  useGenerated: () => void;
  disconnect: () => void;
  exportPrivateKey: () => string | null;
  importPrivateKey: (pk: string) => void;
  readContract: (functionName: string, args?: CalldataEncodable[]) => Promise<unknown>;
  writeContract: (
    functionName: string,
    args?: CalldataEncodable[],
    value?: bigint
  ) => Promise<string>;
  waitForReceipt: (
    hash: string,
    status?: string,
    onStatus?: (s: string) => void
  ) => Promise<unknown>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<WalletMode>("none");
  const [address, setAddress] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [clientRef, setClientRef] = useState<ReturnType<typeof createClient> | null>(null);
  const [generatedPk, setGeneratedPk] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const account = createAccount(stored as `0x${string}`);
        const client = createClient({ chain, account });
        setClientRef(client);
        setAddress(account.address);
        setMode("generated");
        setConnected(true);
        setGeneratedPk(stored);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const connectInjected = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("No injected wallet found. Install MetaMask or Rabby.");
    }
    setConnecting(true);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (!accounts.length) throw new Error("No accounts returned from wallet");

      const walletAddress = accounts[0] as `0x${string}`;
      const client = createClient({ chain, account: walletAddress });
      await client.connect(chainLabel);

      setClientRef(client);
      setAddress(walletAddress);
      setMode("injected");
      setConnected(true);
    } finally {
      setConnecting(false);
    }
  }, []);

  const useGenerated = useCallback(() => {
    const existing = localStorage.getItem(STORAGE_KEY);
    const pk = (existing ?? generatePrivateKey()) as `0x${string}`;
    if (!existing) localStorage.setItem(STORAGE_KEY, pk);

    const account = createAccount(pk);
    const client = createClient({ chain, account });
    setClientRef(client);
    setAddress(account.address);
    setMode("generated");
    setConnected(true);
    setGeneratedPk(pk);
  }, []);

  const disconnect = useCallback(() => {
    setClientRef(null);
    setAddress("");
    setMode("none");
    setConnected(false);
  }, []);

  const exportPrivateKey = useCallback(() => generatedPk, [generatedPk]);

  const importPrivateKey = useCallback((pk: string) => {
    try {
      const account = createAccount(pk as `0x${string}`);
      const client = createClient({ chain, account });
      localStorage.setItem(STORAGE_KEY, pk);
      setClientRef(client);
      setAddress(account.address);
      setMode("generated");
      setConnected(true);
      setGeneratedPk(pk);
    } catch {
      throw new Error("Invalid private key format");
    }
  }, []);

  const readContract = useCallback(
    async (functionName: string, args: CalldataEncodable[] = []) => {
      const readClient =
        clientRef ?? createClient({ chain, account: createAccount() });
      return readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName,
        args,
      });
    },
    [clientRef]
  );

  const writeContract = useCallback(
    async (
      functionName: string,
      args: CalldataEncodable[] = [],
      value: bigint = 0n
    ) => {
      if (!clientRef || !connected) {
        throw new Error("Connect a wallet before writing");
      }
      const hash = await clientRef.writeContract({
        address: CONTRACT_ADDRESS,
        functionName,
        args,
        value,
      });
      return hash;
    },
    [clientRef, connected]
  );

  const waitForReceipt = useCallback(
    async (
      hash: string,
      targetStatus?: string,
      onStatus?: (s: string) => void
    ) => {
      if (!clientRef) throw new Error("No client");

      const target = (targetStatus as TransactionStatus) ?? TransactionStatus.ACCEPTED;
      const txHash = hash as `0x${string}` & { length: 66 };

      let lastStatus = "";
      const poll = setInterval(async () => {
        try {
          const tx = await clientRef.getTransaction({ hash: txHash });
          const s = statusName(tx?.status);
          if (s !== lastStatus) {
            lastStatus = s;
            onStatus?.(s);
          }
        } catch {}
      }, 3000);

      try {
        const receipt = await clientRef.waitForTransactionReceipt({
          hash: txHash,
          status: target,
          interval: 5000,
          retries: 120,
        });
        return receipt;
      } finally {
        clearInterval(poll);
      }
    },
    [clientRef]
  );

  return (
    <WalletContext.Provider
      value={{
        mode,
        address,
        connected,
        connecting,
        connectInjected,
        useGenerated,
        disconnect,
        exportPrivateKey,
        importPrivateKey,
        readContract,
        writeContract,
        waitForReceipt,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

function statusName(status: string | number | undefined): string {
  const s = String(status ?? "");
  const map: Record<string, string> = {
    [TransactionStatus.PENDING]: "Pending",
    [TransactionStatus.PROPOSING]: "Proposing",
    [TransactionStatus.COMMITTING]: "Committing",
    [TransactionStatus.REVEALING]: "Revealing",
    [TransactionStatus.ACCEPTED]: "Accepted",
    [TransactionStatus.FINALIZED]: "Finalized",
    [TransactionStatus.UNDETERMINED]: "Undetermined",
    [TransactionStatus.CANCELED]: "Cancelled",
    [TransactionStatus.APPEAL_COMMITTING]: "Appeal Committing",
    [TransactionStatus.APPEAL_REVEALING]: "Appeal Revealing",
    [TransactionStatus.READY_TO_FINALIZE]: "Ready to Finalize",
    [TransactionStatus.VALIDATORS_TIMEOUT]: "Validators Timeout",
    [TransactionStatus.LEADER_TIMEOUT]: "Leader Timeout",
  };
  return map[s] ?? `Unknown (${s})`;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}
