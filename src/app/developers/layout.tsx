import { DocsShell } from "@/components/DocsShell";

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <DocsShell>{children}</DocsShell>
    </main>
  );
}
