import { DeveloperProfile } from "@/components/DeveloperProfile";

export const metadata = {
  title: "Developer profile",
  description: "Wallet identities, role, and MCP status. Signature verification required to save.",
};

export default function DeveloperProfilePage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Profile</p>
        <h1 className="mt-2 font-display text-4xl text-ivory">Developer profile</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/80">
          Trader and developer share one wallet identity. Change your default experience here. Access status is loaded
          from the backend — the browser cannot grant MCP access.
        </p>
      </header>
      <DeveloperProfile />
    </div>
  );
}
