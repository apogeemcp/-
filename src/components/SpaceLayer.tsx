export function SpaceLayer() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <span className="orbit-ring opacity-50" />
      <span className="absolute left-[58%] top-[-18%] h-[42rem] w-[42rem]">
        <span className="saturn-orbit inset-0 opacity-50" />
      </span>
      <span className="absolute left-[72%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-gold/10 blur-3xl" />
      <span className="absolute bottom-[-10%] left-[-8%] h-[22rem] w-[22rem] rounded-full bg-ember/10 blur-3xl" />
      <span
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
        }}
      />
    </div>
  );
}
