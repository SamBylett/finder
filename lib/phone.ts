// Deterministic UK phone number normalisation/classification. No external
// API, no phone-verification service — pure digit-range logic, per V2.4 spec
// ("do not build an external phone-verification service unless genuinely
// necessary"). Deliberately conservative: anything ambiguous classifies as
// "unknown" rather than being guessed as mobile, since a wrong "mobile"
// claim would falsely promise a WhatsApp route that doesn't exist.

export interface NormalizedUkPhone {
  original: string;
  e164: string | null; // null if it doesn't parse as a plausible UK number
}

// UK national numbers are 10 digits after the trunk "0" (11 digits total
// national, e.g. 07911 123456 / 0117 123 4567) -> +44 + 10 digits.
export function normalizeUkPhone(raw: string): NormalizedUkPhone {
  const original = raw;
  const digits = raw.replace(/[^\d+]/g, "");

  let national: string | null = null;
  if (digits.startsWith("+44")) {
    national = digits.slice(3);
  } else if (digits.startsWith("0044")) {
    national = digits.slice(4);
  } else if (digits.startsWith("0")) {
    national = digits.slice(1);
  } else if (/^\d{10}$/.test(digits)) {
    // Already trunk-stripped, e.g. copied from a formatted international field
    national = digits;
  }

  if (!national || !/^\d{10}$/.test(national)) {
    return { original, e164: null };
  }

  return { original, e164: `+44${national}` };
}

export type UkPhoneType = "mobile" | "landline" | "unknown";

// UK mobile ranges are 07xxx xxxxxx nationally (+447...). Not every 07-range
// number is a genuine consumer mobile (e.g. 070 is personal numbering,
// often call-forwarding rather than a real handset that can receive
// WhatsApp) — those are classified "unknown" rather than "mobile" so
// OutreachReadiness never falsely promises a WhatsApp route.
// Landline geographic ranges start 01/02; 03 is non-geographic
// (often business lines, not mobile-capable) -> landline. 08/09 are
// premium/service numbers, not a business's own contact line -> unknown.
export function classifyUkPhone(e164: string | null): UkPhoneType {
  if (!e164) return "unknown";
  const national = e164.slice(3); // strip "+44"
  if (national.length !== 10) return "unknown";

  const prefix3 = national.slice(0, 3);

  if (prefix3 === "070") return "unknown"; // personal numbering, not a real mobile handset
  if (national.startsWith("07")) return "mobile";
  if (national.startsWith("01") || national.startsWith("02")) return "landline";
  if (national.startsWith("03")) return "landline"; // non-geographic business lines
  return "unknown"; // 08/09 premium & service numbers, and anything else
}

export function normalizeAndClassifyUkPhone(raw: string | null): {
  phone_e164: string | null;
  phone_type: UkPhoneType | null;
} {
  if (!raw) return { phone_e164: null, phone_type: null };
  const { e164 } = normalizeUkPhone(raw);
  return { phone_e164: e164, phone_type: classifyUkPhone(e164) };
}
