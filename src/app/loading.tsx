import { PageFrame } from "@/components/PageHero";

export default function Loading() {
  return (
    <PageFrame>
      <div className="panel h-40 animate-pulse rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel h-28 animate-pulse rounded-xl" />
        <div className="panel h-28 animate-pulse rounded-xl" />
        <div className="panel h-28 animate-pulse rounded-xl" />
      </div>
    </PageFrame>
  );
}
