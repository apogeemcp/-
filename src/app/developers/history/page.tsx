import { AccessLedger } from "@/components/AccessLedger";

export const metadata = {
  title: "Purchase & burn history",
  description: "Wallet-scoped MCP quotes, grants, and verified burns. Empty until real rows exist.",
};

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">History</p>
        <h1 className="mt-2 font-display text-4xl text-ivory">Purchases, access, burns</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/80">
          Loaded from the server for a verified wallet. Quoted intents are not purchases. Burns display only when
          verified with a transaction signature.
        </p>
      </header>
      <AccessLedger />
    </div>
  );
}
