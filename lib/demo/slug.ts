// Non-sequential demo slugs, generated only from the current business's own
// name plus a short random suffix — e.g. "flat-roofing-services-x7k29".
// No shared prefix: each slug is derived solely from its own business name,
// so nothing from one business can appear in another's URL.

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 5)
    .join("-")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function generateDemoSlug(businessName: string): string {
  const base = slugifyName(businessName) || "business";
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  return `${base}-${suffix}`;
}
