import { DocsShell } from "@/components/DocsShell";

export const metadata = {
  title: "Developers",
  description: "Apogee MCP documentation generated from live tools. Streamable HTTP, auth none, chain 4663.",
};

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <DocsShell>{children}</DocsShell>
    </main>
  );
}
