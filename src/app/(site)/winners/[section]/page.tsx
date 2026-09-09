import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GalleryGrid } from "@/components/winners/gallery-grid";
import { PageMasthead } from "@/components/page-masthead";
import { winnersSection } from "@/lib/gallery";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const s = await winnersSection(section);
  return { title: s ? `${s.title} — Winners` : "Winners" };
}

export default async function WinnersSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const s = await winnersSection(section);
  if (!s) notFound();

  return (
    <div className="bg-void">
      <PageMasthead
        title={s.title}
        kicker={`Hall of winners — ${s.items.length} image${s.items.length === 1 ? "" : "s"}`}
      />
      <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-8">
        <Link
          href="/winners"
          className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-slate-500 hover:text-teal"
        >
          ← Hall of winners
        </Link>
        <div data-reveal>
          <GalleryGrid items={s.items} />
        </div>
      </div>
    </div>
  );
}
