import type { ReactNode } from "react";
import { asset } from "@/lib/site";

const FOCI: Record<string, { pos: string; wash: string }> = {
  home: { pos: "object-[68%_34%]", wash: "from-[#07070a] via-[#1a0508]/78 to-[#07070a]/20" },
  desk: { pos: "object-[38%_48%]", wash: "from-[#07070a] via-[#140808]/80 to-transparent" },
  launch: { pos: "object-[88%_28%]", wash: "from-[#07070a] via-[#1a0c04]/75 to-transparent" },
  orbit: { pos: "object-[18%_42%]", wash: "from-[#07070a] via-[#12040a]/80 to-transparent" },
  profile: { pos: "object-[58%_72%]", wash: "from-[#07070a] via-[#0a0a10]/80 to-transparent" },
  page: { pos: "object-[72%_38%]", wash: "from-[#07070a] via-[#07070a]/72 to-[#07070a]/25" },
};

export function BannerArt({ focus = "page" }: { focus?: keyof typeof FOCI }) {
  const f = FOCI[focus] || FOCI.page;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset("/brand/banner.webp")}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover ${f.pos}`}
        fetchPriority="high"
        decoding="async"
      />
      <div className={`absolute inset-0 bg-gradient-to-r ${f.wash}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07070a] via-[#07070a]/30 to-transparent" />
      <span className="orbit-ring left-[40%] top-[-30%] h-[140%] w-[80%] opacity-50" />
    </>
  );
}

export function PageHero({
  kicker,
  title,
  lede,
  compact = false,
  focus = "page",
  action,
}: {
  kicker: string;
  title: string;
  lede?: string;
  compact?: boolean;
  focus?: keyof typeof FOCI;
  action?: ReactNode;
}) {
  return (
    <header
      className={`relative isolate overflow-hidden border-b border-white/[0.06] ${compact ? "min-h-[180px]" : "min-h-[240px]"}`}
    >
      <BannerArt focus={focus} />
      <div className="relative mx-auto flex max-w-6xl flex-col justify-end px-5 py-9 sm:px-6 sm:py-12">
        <p className="kicker">{kicker}</p>
        <h1 className="mt-2 max-w-4xl font-display text-4xl leading-[0.95] text-ivory sm:text-6xl">{title}</h1>
        {lede ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/80 sm:text-base">{lede}</p> : null}
        {action ? <div className="mt-5 flex flex-wrap gap-3">{action}</div> : null}
      </div>
    </header>
  );
}

export function PageFrame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">{children}</div>;
}
