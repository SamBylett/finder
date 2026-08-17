// Non-sequential demo slugs, e.g. "dmb-flat-roofing-x7k29".

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 3)
    .join("-")
    .slice(0, 30);
}

export function generateDemoSlug(businessName: string): string {
  const base = slugifyName(businessName) || "business";
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  return `dmb-${base}-${suffix}`;
}
