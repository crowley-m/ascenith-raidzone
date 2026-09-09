import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScrollReveal } from "@/components/scroll-reveal";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* no JS → show revealed content immediately */}
      <noscript
        dangerouslySetInnerHTML={{
          __html: `<style>[data-reveal]{opacity:1!important;transform:none!important}</style>`,
        }}
      />
      <SiteHeader />
      <main className="min-h-[70vh]">{children}</main>
      <SiteFooter />
      <ScrollReveal />
    </>
  );
}
