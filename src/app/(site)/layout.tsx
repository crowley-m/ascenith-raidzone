import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ToastProvider } from "@/components/toast/toast-provider";
import { PageTransition } from "@/components/page-transition";
import { NavProgress } from "@/components/nav-progress";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {/* no JS → show revealed content immediately */}
      <noscript
        dangerouslySetInnerHTML={{
          __html: `<style>.site-shell [data-reveal]{opacity:1!important;transform:none!important}</style>`,
        }}
      />
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <SiteHeader />
      <main className="site-shell min-h-[70vh]">
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter />
      <ScrollReveal />
    </ToastProvider>
  );
}
