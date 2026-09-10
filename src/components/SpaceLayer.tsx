export function SpaceLayer() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <span className="orbit-ring live opacity-70" />
      <span
        className="orbit-ring live opacity-40"
        style={{ inset: "-32%", animationDuration: "22s", transform: "rotate(12deg) scaleX(1.45)" }}
      />
      <span className="absolute left-[58%] top-[-18%] h-[42rem] w-[42rem]">
        <span className="saturn-orbit inset-0 opacity-70" />
      </span>
      <span className="absolute left-[-12%] bottom-[-22%] h-[36rem] w-[36rem]">
        <span className="saturn-orbit slow inset-0 opacity-40" />
      </span>
      <span className="absolute left-[72%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-gold/10 blur-3xl" />
      <span className="absolute bottom-[-10%] left-[-8%] h-[22rem] w-[22rem] rounded-full bg-ember/10 blur-3xl" />
      <span className="absolute left-[40%] top-[30%] h-px w-[40%] bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
    </div>
  );
}
