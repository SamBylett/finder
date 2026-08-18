import type { DemoRenderContext } from "@/lib/demo/render-context";
import { factValue } from "@/lib/demo/render-context";
import { DemoAssetImage, SectionHeading } from "./primitives";
import { Section } from "./section-primitives";
import type { GalleryVariant } from "@/lib/demo/types";

export function Gallery({ ctx, variant }: { ctx: DemoRenderContext; variant: GalleryVariant }) {
  const images = ctx.assets.filter((a) => a.type === "gallery" || a.type === "project");
  if (images.length === 0) return null;
  const name = factValue(ctx.profile.business_name) ?? "Business";
  const { spacingScale, align, sectionWidth } = ctx.config.compositionProfile;
  const width = sectionWidth.gallery ?? "contained";

  return (
    <Section spacing={spacingScale} width={width} background="bg-[var(--demo-surface)]">
      <SectionHeading heading="Our Work" subheading={ctx.copy.gallery_intro} align={align} />

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
          {images.map((img, i) => {
            // Genuine masonry: use the asset's real aspect ratio when known
            // (DemoAsset.width/height are captured but were previously never
            // read by any renderer) instead of a fixed index-based pattern.
            const ratioStyle = img.width && img.height ? { aspectRatio: `${img.width} / ${img.height}` } : undefined;
            return (
              <DemoAssetImage
                key={img.id}
                asset={img}
                alt={name}
                style={ratioStyle}
                className={`w-full rounded-[var(--demo-radius)] object-cover ${ratioStyle ? "" : i % 3 === 0 ? "aspect-[3/4]" : "aspect-square"}`}
              />
            );
          })}
        </div>
      )}
    </Section>
  );
}
