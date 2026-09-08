import { asset } from "@/lib/site";

export function BannerArt({ focus = "page" }: { focus?: "home" | "page" }) {
  const pos = focus === "home" ? "object-[68%_34%]" : "object-[72%_38%]";
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset("/brand/banner.png")} alt="" className={`absolute inset-0 h-full w-full object-cover ${pos}`} />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/72 to-[#050505]/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/25 to-black/15" />
    </>
  );
}

export function PageHero({
  kicker,
  title,
  lede,
  compact = false,
}: {
  kicker: string;
  title: string;
  lede?: string;
  compact?: boolean;
}) {
  return (
    <header
      className={`relative isolate overflow-hidden border-b border-white/[0.06] ${compact ? "min-h-[200px]" : "min-h-[260px]"}`}
    >
      <BannerArt />
      <div className="relative mx-auto flex max-w-6xl flex-col justify-end px-5 py-10 sm:px-6 sm:py-12">
        <p className="kicker">{kicker}</p>
        <h1 className="mt-2 font-display text-4xl leading-[0.95] text-ivory sm:text-6xl">{title}</h1>
        {lede ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/70 sm:text-base">{lede}</p> : null}
      </div>
    </header>
  );
}

export function PageFrame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">{children}</div>;
}
