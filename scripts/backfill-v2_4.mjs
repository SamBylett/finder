// One-off backfill for V2.4 migration 0005: recompute opportunity_score/
// opportunity_tier now that Contactability is removed from lib/scoring.ts,
// and populate phone_e164/phone_type for existing rows. Run once against
// Supabase, then delete this file (established project pattern — see the
// V2.1 slug-migration script).
//
// Usage: node scripts/backfill-v2_4.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const supabase = createClient(url, key);

// Mirrors lib/phone.ts (kept inline since this script runs standalone via
// plain node, not through the Next.js/TS module graph).
function normalizeUkPhone(raw) {
  const digits = raw.replace(/[^\d+]/g, "");
  let national = null;
  if (digits.startsWith("+44")) national = digits.slice(3);
  else if (digits.startsWith("0044")) national = digits.slice(4);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else if (/^\d{10}$/.test(digits)) national = digits;
  if (!national || !/^\d{10}$/.test(national)) return null;
  return `+44${national}`;
}
function classifyUkPhone(e164) {
  if (!e164) return "unknown";
  const national = e164.slice(3);
  if (national.length !== 10) return "unknown";
  const prefix3 = national.slice(0, 3);
  if (prefix3 === "070") return "unknown";
  if (national.startsWith("07")) return "mobile";
  if (national.startsWith("01") || national.startsWith("02")) return "landline";
  if (national.startsWith("03")) return "landline";
  return "unknown";
}

// Mirrors lib/scoring.ts's post-Contactability-removal formula.
function scoreBusiness(b) {
  let raw = 0;
  switch (b.website_status) {
    case "no_website": raw += 30; break;
    case "social_only": raw += 25; break;
    case "broken_website": raw += 25; break;
    case "weak_website": raw += 20; break;
    default: break;
  }
  // Objective-checks contribution can't be recomputed here (raw page data
  // isn't stored) — this backfill only removes the contactability points
  // that were added on top of whatever the score already was; it does not
  // attempt to fully re-derive the score from scratch.
  console.warn("Note: this backfill approximates by subtracting known contactability points, not a full recompute.");
  return raw;
}

async function main() {
  const { data: businesses, error } = await supabase.from("businesses").select("*");
  if (error) throw error;
  console.log(`Backfilling ${businesses.length} businesses...`);

  let updated = 0;
  for (const b of businesses) {
    const e164 = b.phone ? normalizeUkPhone(b.phone) : null;
    const phone_type = b.phone ? classifyUkPhone(e164) : null;

    // Subtract the old Contactability points (email 10, phone 5,
    // facebook/instagram 5) that were baked into the stored score.
    let contactabilityPoints = 0;
    if (b.email) contactabilityPoints += 10;
    if (b.phone) contactabilityPoints += 5;
    if (b.facebook_url || b.instagram_url) contactabilityPoints += 5;

    const newScore = Math.max(0, b.opportunity_score - contactabilityPoints);
    const newTier = newScore >= 75 ? "HOT" : newScore >= 50 ? "OPPORTUNITY" : "LOW PRIORITY";

    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        phone_e164: e164,
        phone_type,
        opportunity_score: newScore,
        opportunity_tier: newTier,
      })
      .eq("id", b.id);

    if (updateError) {
      console.error(`Failed to update ${b.id}:`, updateError.message);
      continue;
    }
    updated++;
  }

  console.log(`Done. Updated ${updated}/${businesses.length} businesses.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
