import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative mx-auto max-w-xl overflow-hidden px-5 py-20">
      <span className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2">
        <span className="saturn-orbit inset-0 opacity-50" />
      </span>
      <p className="kicker relative">404</p>
      <h1 className="relative mt-3 font-display text-5xl tracking-[0.06em] text-ivory">Off orbit</h1>
      <p className="lede relative mt-4 text-xl text-ivory/80">
        That route is not part of Apogee. Try Desk, Orbit, or the developer hub.
      </p>
      <div className="relative mt-8 flex flex-wrap gap-2">
        <Link href="/" className="btn-primary">
          Home
        </Link>
        <Link href="/dashboard" className="btn-ghost">
          Desk
        </Link>
        <Link href="/developers" className="btn-ghost">
          Developers
        </Link>
      </div>
    </main>
  );
}
