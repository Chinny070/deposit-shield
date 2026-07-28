"use client";

import { WalletProvider } from "@/lib/wallet";
import { Header } from "@/components/Header";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <Header />
      <main className="flex-1">{children}</main>
    </WalletProvider>
  );
}
