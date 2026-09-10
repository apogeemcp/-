import { PageFrame } from "@/components/PageHero";

export default function Loading() {
  return (
    <PageFrame>
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6">
        <div className="ring-spinner" aria-hidden />
        <p className="kicker">Ascending</p>
      </div>
    </PageFrame>
  );
}
