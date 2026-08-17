import type { DemoRenderContext } from "@/lib/demo/render-context";
import { factValue } from "@/lib/demo/render-context";
import { Container, DemoAssetImage, SectionHeading } from "./primitives";
import type { GalleryVariant } from "@/lib/demo/types";

export function Gallery({ ctx, variant }: { ctx: DemoRenderContext; variant: GalleryVariant }) {
  const images = ctx.assets.filter((a) => a.type === "gallery" || a.type === "project");
  if (images.length === 0) return null;
  const name = factValue(ctx.profile.business_name) ?? "Business";

  return (
    <section className="bg-[var(--demo-surface)] py-20">
      <Container>
        <SectionHeading heading="Our Work" subheading={ctx.copy.gallery_intro} />

        {variant === "featured-project" && (
          <DemoAssetImage asset={images[0]} alt={name} className="aspect-[16/7] w-full rounded-[var(--demo-radius)] object-cover" />
        )}

        {variant === "grid" && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {images.map((img) => (
              <DemoAssetImage key={img.id} asset={img} alt={name} className="aspect-square w-full rounded-[var(--demo-radius)] object-cover" />
            ))}
          </div>
        )}

        {variant === "masonry" && (
          <div className="columns-2 gap-4 md:columns-3 [&>*]:mb-4">
            {images.map((img, i) => (
              <DemoAssetImage
                key={img.id}
                asset={img}
                alt={name}
                className={`w-full rounded-[var(--demo-radius)] object-cover ${i % 3 === 0 ? "aspect-[3/4]" : "aspect-square"}`}
              />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
