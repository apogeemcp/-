import { SupportDesk } from "@/components/SupportDesk";
import { LEGAL } from "@/lib/site";

export const metadata = {
  title: "Developer support",
  description: "Documentation, MCP status, troubleshooting, and a support form stored server-side.",
};

export default function DeveloperSupportPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Support</p>
        <h1 className="mt-2 font-display text-4xl text-ivory">Developer support</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/80">
          Prefer the docs for protocol errors. This form stores a ticket when the service role is configured. There is
          no published SLA.
        </p>
      </header>
      <SupportDesk />
      <p className="text-xs text-ivory/55">{LEGAL.counsel}</p>
    </div>
  );
}
