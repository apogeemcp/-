import { AnalyticsDesk } from "@/components/AnalyticsDesk";
import { SaturnBackdrop } from "@/components/SaturnBackdrop";

export default function AnalyticsPage() {
  return (
    <main className="relative min-h-screen">
      <SaturnBackdrop className="pointer-events-none fixed inset-0 opacity-40" />
      <div className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-28">
        <AnalyticsDesk />
      </div>
    </main>
  );
}
