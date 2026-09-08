import { AdminHub } from "@/components/AdminHub";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
  description: "Operator view of quoted purchases, partnerships, and real usage. Gated by APOGEE_ADMIN_SECRET.",
};

export default function DeveloperAdminPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Admin</p>
        <h1 className="mt-2 font-display text-4xl text-ivory">Operator dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/80">
          Revenue, burns, and access grants stay at zero unless the backend has verified rows. Partnership requests can
          be accepted or declined. This page is not linked in the public hub nav.
        </p>
      </header>
      <AdminHub />
    </div>
  );
}
