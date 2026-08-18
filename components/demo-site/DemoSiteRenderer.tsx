// Renders a complete demo site from stored configuration + content. This is
// the ONLY place that turns a SiteDirectorConfig into actual markup — the AI
// never generates JSX/CSS, only picks section types/variants from the
// approved enums in lib/demo/types.ts.

import type { ThemeId, PaletteId } from "@/lib/demo/types";
import type { DemoRenderContext } from "@/lib/demo/render-context";
import { themeCssVars } from "@/lib/demo/themes";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { Services } from "./Services";
import { Gallery } from "./Gallery";
import { About } from "./About";
import { WhoWeHelp } from "./WhoWeHelp";
import { Expertise } from "./Expertise";
import { Process } from "./Process";
import { Reviews } from "./Reviews";
import { Faq } from "./Faq";
import { Cta } from "./Cta";
import { Contact } from "./Contact";
import { Footer } from "./Footer";
import { DemoBanner } from "./DemoBanner";
import { MobileCta } from "./MobileCta";

export function DemoSiteRenderer({
  ctx,
  theme,
  palette,
  showBanner,
}: {
  ctx: DemoRenderContext;
  theme: ThemeId;
  palette: PaletteId;
  showBanner: boolean;
}) {
  const { config } = ctx;

  return (
    <div
      style={{ ...themeCssVars(theme, palette), background: "var(--demo-bg)", color: "var(--demo-text)" }}
      className="min-h-screen pb-16 md:pb-0"
    >
      {showBanner && <DemoBanner profile={ctx.profile} />}
      <Nav ctx={ctx} variant={config.navVariant} />

      {config.sections.map((section, i) => {
        switch (section.type) {
          case "hero":
            return <Hero key={i} ctx={ctx} variant={section.variant} />;
          case "services":
            return <Services key={i} ctx={ctx} variant={section.variant} />;
          case "gallery":
            return <Gallery key={i} ctx={ctx} variant={section.variant} />;
          case "about":
            return <About key={i} ctx={ctx} variant={section.variant} />;
          case "who-we-help":
            return <WhoWeHelp key={i} ctx={ctx} variant={section.variant} />;
          case "expertise":
            return <Expertise key={i} ctx={ctx} variant={section.variant} />;
          case "process":
            return <Process key={i} ctx={ctx} variant={section.variant} />;
          case "reviews":
            return <Reviews key={i} ctx={ctx} variant={section.variant} />;
          case "faq":
            return <Faq key={i} ctx={ctx} variant={section.variant} />;
          case "cta":
            return <Cta key={i} ctx={ctx} variant={section.variant} />;
          case "contact":
            return <Contact key={i} ctx={ctx} variant={section.variant} />;
          default:
            return null;
        }
      })}

      <Footer ctx={ctx} variant={config.footerVariant} />
      <MobileCta profile={ctx.profile} />
    </div>
  );
}
