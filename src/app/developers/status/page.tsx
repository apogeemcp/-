import { StatusBoard } from "@/components/StatusBoard";

export default function StatusPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="kicker">Ops</p>
        <h1 className="mt-2 font-display text-4xl text-ivory sm:text-5xl">System status</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/75">
          Live health checks for MCP discovery, chain stats, and apogee_status. This page never paints a fake
          “all operational” banner.
        </p>
      </header>
      <StatusBoard />
    </div>
  );
}
