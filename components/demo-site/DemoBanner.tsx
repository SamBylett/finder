import { factValue } from "@/lib/demo/render-context";
import type { DemoBusinessProfile } from "@/lib/demo/types";

export function DemoBanner({ profile }: { profile: DemoBusinessProfile }) {
  const name = factValue(profile.business_name) ?? "this business";
  return (
    <div className="sticky top-0 z-40 bg-slate-900 px-4 py-2 text-center text-xs font-medium text-white">
      Website concept prepared for {name} — not a live production site.
    </div>
  );
}
