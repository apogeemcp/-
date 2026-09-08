import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-5 py-16">
      <p className="kicker">404</p>
      <h1 className="mt-2 font-display text-4xl text-ivory">Page not found</h1>
      <p className="mt-3 text-sm text-ivory/75">That route is not part of Apogee. Try Desk, Orbit, or the developer hub.</p>
      <div className="mt-6 flex flex-wrap gap-2">
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
