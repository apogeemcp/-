"use client";

type Bar = { time?: number; open?: number; high?: number; low?: number; close?: number; volume?: number };

export function PriceChart({ bars, height = 220 }: { bars: Bar[]; height?: number }) {
  if (!bars.length) {
    return <p className="text-sm text-ivory/65">No candle data for this pool yet.</p>;
  }
  const w = 720;
  const pad = 12;
  const highs = bars.map((b) => Number(b.high ?? b.close ?? 0));
  const lows = bars.map((b) => Number(b.low ?? b.close ?? 0));
  const max = Math.max(...highs, 0);
  const min = Math.min(...lows.filter((n) => Number.isFinite(n)), max);
  const span = max - min || 1;
  const cw = Math.max(3, (w - pad * 2) / bars.length);
  const y = (v: number) => pad + ((max - v) / span) * (height - pad * 2);
  const last = bars[bars.length - 1];
  const first = bars[0];
  const up = Number(last?.close) >= Number(first?.open ?? first?.close);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${height}`} className="h-56 w-full min-w-[320px]" role="img" aria-label="Price chart">
        {bars.map((b, i) => {
          const o = Number(b.open ?? b.close ?? 0);
          const c = Number(b.close ?? o);
          const h = Number(b.high ?? Math.max(o, c));
          const l = Number(b.low ?? Math.min(o, c));
          const x = pad + i * cw + cw / 2;
          const bull = c >= o;
          const color = bull ? "#d4af37" : "#ff5a4a";
          const top = y(Math.max(o, c));
          const bot = y(Math.min(o, c));
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={y(h)} y2={y(l)} stroke={color} strokeWidth="1" />
              <rect x={x - Math.max(1.2, cw * 0.28)} y={top} width={Math.max(2.4, cw * 0.56)} height={Math.max(1, bot - top)} fill={color} />
            </g>
          );
        })}
        <text x={w - pad} y={18} textAnchor="end" fill={up ? "#d4af37" : "#ff5a4a"} fontSize="12" fontFamily="IBM Plex Mono, monospace">
          {Number(last?.close).toPrecision(6)}
        </text>
      </svg>
    </div>
  );
}
