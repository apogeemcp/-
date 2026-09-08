import { UsagePanel } from "@/components/UsagePanel";
import { RATE_LIMIT } from "@/lib/docs";
import { CANONICAL_MCP, LEGAL } from "@/lib/site";

export const metadata = {
  title: "Usage",
  description: "Real Apogee MCP telemetry. No placeholder charts.",
};

export default function DeveloperUsagePage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Usage</p>
        <h1 className="mt-2 font-display text-4xl text-ivory">MCP usage</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/80">
          Counts come from server-side <span className="font-mono">apogee_usage</span> writes when a service role is
          configured. This page does not invent request totals. Rate limit: {RATE_LIMIT.limit} HTTP requests per{" "}
          {RATE_LIMIT.windowLabel} per client IP per process.
        </p>
      </header>
      <p className="text-xs text-ivory/55">Canonical MCP {CANONICAL_MCP}. {LEGAL.data}</p>
      <div className="panel rounded-xl p-5">
        <UsagePanel />
      </div>
    </div>
  );
}
