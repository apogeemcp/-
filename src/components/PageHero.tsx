import type { ReactNode } from "react";
import { asset } from "@/lib/site";

const FOCI: Record<string, { pos: string; wash: string }> = {
  home: { pos: "object-[68%_34%]", wash: "from-[#05040a] via-[#1a0508]/78 to-[#05040a]/20" },
  desk: { pos: "object-[38%_48%]", wash: "from-[#05040a] via-[#140808]/80 to-transparent" },
  launch: { pos: "object-[88%_28%]", wash: "from-[#05040a] via-[#1a0c04]/75 to-transparent" },
  orbit: { pos: "object-[18%_42%]", wash: "from-[#05040a] via-[#12040a]/80 to-transparent" },
  profile: { pos: "object-[58%_72%]", wash: "from-[#05040a] via-[#0a0a10]/80 to-transparent" },
  page: { pos: "object-[72%_38%]", wash: "from-[#05040a] via-[#05040a]/72 to-[#05040a]/25" },
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
      <div className="absolute inset-0 bg-gradient-to-t from-[#05040a] via-[#05040a]/30 to-transparent" />
      <span className="orbit-ring left-[36%] top-[-34%] h-[150%] w-[85%] opacity-40" />
      <span className="absolute right-[8%] top-[-20%] h-[22rem] w-[22rem]">
        <span className="saturn-orbit inset-0 opacity-50" />
      </span>
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
      className={`relative isolate overflow-hidden border-b border-gold/12 ${compact ? "min-h-[180px]" : "min-h-[248px]"}`}
    >
      <BannerArt focus={focus} />
      <div className="relative mx-auto flex max-w-6xl flex-col justify-end px-5 py-10 sm:px-6 sm:py-14">
        <p className="kicker">{kicker}</p>
        <h1 className="mt-3 max-w-4xl font-display text-4xl font-semibold leading-[0.94] tracking-[0.03em] text-ivory sm:text-6xl">
          {title}
        </h1>
        {lede ? <p className="lede mt-4 max-w-2xl text-lg leading-relaxed text-ivory/85 sm:text-xl">{lede}</p> : null}
        {action ? <div className="mt-6 flex flex-wrap gap-3">{action}</div> : null}
      </div>
    </header>
  );
}

export function PageFrame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">{children}</div>;
}
