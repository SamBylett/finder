// OutreachReadiness — separate from Opportunity Score (commercial website
// opportunity) and Demo Potential (can we build an impressive demo). This
// answers one question only: can this business realistically be reached
// through channels actually used (email, WhatsApp-candidate mobile,
// Facebook, Instagram, LinkedIn) rather than a cold call. Deterministic,
// presence-based — no weighted points, since every tier the spec describes
// is expressible as a simple count of usable channels.

import type { Business, ContactRoute } from "./types";

export type OutreachTier = "HIGH" | "GOOD" | "LIMITED" | "POOR";

export interface OutreachChannels {
  email: boolean;
  mobile: boolean;
  whatsappCandidate: boolean; // === mobile; kept separate so UI/copy never implies confirmed WhatsApp
  landline: boolean;
  facebook: boolean;
  instagram: boolean;
  linkedin: boolean;
}

export interface OutreachReadiness {
  tier: OutreachTier;
  channels: OutreachChannels;
  strongRouteCount: number; // email/mobile/facebook/instagram/linkedin only — landline never counts
  reasons: string[];
}

// V2.5: `routes`, when supplied (the business-detail page always has them),
// lets a channel's presence be discounted if every recorded route for that
// type is low-confidence and unverified — a guessed FindyMail email
// shouldn't count as a "strong route" the same way a verified one does.
// ResultsTable omits `routes` (no per-row query) and gets today's
// presence-only behaviour, unchanged — no regression, no N+1 query added.
function isChannelUsable(businessHasValue: boolean, routes: ContactRoute[] | undefined, type: ContactRoute["type"]): boolean {
  if (!businessHasValue) return false;
  if (!routes) return true;
  const forType = routes.filter((r) => r.type === type);
  if (forType.length === 0) return true; // no recorded provenance (legacy field) — trust it
  return forType.some((r) => r.confidence !== "low" || r.verified);
}

export function computeOutreachReadiness(business: Business, routes?: ContactRoute[]): OutreachReadiness {
  const mobile = isChannelUsable(business.phone_type === "mobile", routes, "MOBILE");
  const landline = business.phone_type === "landline";

  const channels: OutreachChannels = {
    email: isChannelUsable(Boolean(business.email), routes, "EMAIL"),
    mobile,
    whatsappCandidate: mobile,
    landline,
    facebook: isChannelUsable(Boolean(business.facebook_url), routes, "FACEBOOK"),
    instagram: isChannelUsable(Boolean(business.instagram_url), routes, "INSTAGRAM"),
    linkedin: isChannelUsable(Boolean(business.linkedin_url), routes, "LINKEDIN"),
  };

  const strongRouteCount = [
    channels.email,
    channels.mobile,
    channels.facebook,
    channels.instagram,
    channels.linkedin,
  ].filter(Boolean).length;

  let tier: OutreachTier;
  const reasons: string[] = [];

  if (strongRouteCount >= 2) {
    tier = "HIGH";
    reasons.push(`${strongRouteCount} usable contact routes found`);
  } else if (strongRouteCount === 1) {
    tier = "GOOD";
    reasons.push("One usable contact route found");
  } else if (channels.landline) {
    tier = "LIMITED";
    reasons.push("Only a landline number found — not usable for email/WhatsApp/social outreach");
  } else {
    tier = "POOR";
    reasons.push("No usable contact route found");
  }

  if (channels.email) reasons.push("Email address found");
  if (channels.mobile) reasons.push("Mobile number found — WhatsApp candidate");
  if (channels.landline) reasons.push("Landline number found");
  if (channels.facebook) reasons.push("Facebook page found");
  if (channels.instagram) reasons.push("Instagram profile found");
  if (channels.linkedin) reasons.push("LinkedIn profile found");

  return { tier, channels, strongRouteCount, reasons };
}
