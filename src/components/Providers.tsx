"use client";

import { RoleProvider } from "./RoleProvider";
import { WalletProvider } from "./WalletProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <RoleProvider>{children}</RoleProvider>
    </WalletProvider>
  );
}
