import { notFound } from "next/navigation";
import { DocsArticle } from "@/components/DocsArticle";
import { developerPage, developerSlugs } from "@/lib/docs-articles";

export function generateStaticParams() {
  return developerSlugs().map((slug) => ({ slug }));
}

export default async function DeveloperSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "tools" || slug === "status") notFound();
  const page = developerPage(slug);
  if (!page) notFound();
  return <DocsArticle kicker={page.kicker} title={page.title} lede={page.lede} body={page.body} />;
}
