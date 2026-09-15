import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ToastProvider } from "@/components/toast/toast-provider";
import { NavProgress } from "@/components/nav-progress";
import { PageWipe } from "@/components/page-wipe";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {/* no JS → show revealed content immediately */}
      <noscript
        dangerouslySetInnerHTML={{
          __html: `<style>.site-shell [data-reveal]{opacity:1!important;transform:none!important}</style>`,
        }}
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-teal focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-widest focus:text-void"
      >
        Skip to content
      </a>
      <Suspense fallback={null}>
        <NavProgress />
        <PageWipe />
      </Suspense>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="site-shell min-h-[70vh] focus:outline-none">
        {children}
      </main>
      <SiteFooter />
      <ScrollReveal />
    </ToastProvider>
  );
}
