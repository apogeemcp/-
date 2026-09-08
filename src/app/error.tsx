"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-xl px-5 py-16">
      <p className="kicker">Error</p>
      <h1 className="mt-2 font-display text-4xl text-ivory">Something broke</h1>
      <p className="mt-3 text-sm leading-relaxed text-ivory/75">
        {error.message && !/secret|key|token|password|stack/i.test(error.message)
          ? error.message.slice(0, 180)
          : "This page hit an unexpected error. Retry, or go back to Desk."}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={reset}>
          Retry
        </button>
        <a href="/dashboard" className="btn-ghost">
          Open Desk
        </a>
      </div>
    </main>
  );
}
