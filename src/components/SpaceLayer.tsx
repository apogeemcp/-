export function SpaceLayer() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <span className="orbit-ring opacity-70" />
      <span className="orbit-ring opacity-40" style={{ inset: "-32%", transform: "rotate(12deg) scaleX(1.45)" }} />
      <span className="absolute left-[72%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-crimson/10 blur-3xl" />
      <span className="absolute bottom-[-10%] left-[-8%] h-[22rem] w-[22rem] rounded-full bg-ember/10 blur-3xl" />
    </div>
  );
}
