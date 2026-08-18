import type { Business } from "@/lib/types";
import { computeOutreachReadiness } from "@/lib/outreach";

const COLUMNS: { header: string; value: (b: Business) => string | number | null }[] = [
  { header: "Business name", value: (b) => b.business_name },
  { header: "Category", value: (b) => b.category },
  { header: "Address", value: (b) => b.address },
  { header: "Town/City", value: (b) => b.town_city },
  { header: "Postcode", value: (b) => b.postcode },
  { header: "Phone", value: (b) => b.phone },
  { header: "Email", value: (b) => b.email },
  { header: "Website", value: (b) => b.website_url },
  { header: "Google Maps URL", value: (b) => b.google_maps_url },
  { header: "Facebook", value: (b) => b.facebook_url },
  { header: "Instagram", value: (b) => b.instagram_url },
  { header: "LinkedIn", value: (b) => b.linkedin_url },
  { header: "Phone type", value: (b) => b.phone_type },
  { header: "Google rating", value: (b) => b.google_rating },
  { header: "Google review count", value: (b) => b.google_review_count },
  { header: "Website status", value: (b) => b.website_status },
  { header: "Opportunity score", value: (b) => b.opportunity_score },
  { header: "Opportunity tier", value: (b) => b.opportunity_tier },
  { header: "Outreach readiness", value: (b) => computeOutreachReadiness(b).tier },
  { header: "Analysis summary", value: (b) => b.analysis_summary },
];

function escapeCsvCell(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function businessesToCsv(businesses: Business[]): string {
  const headerRow = COLUMNS.map((c) => escapeCsvCell(c.header)).join(",");
  const rows = businesses.map((b) => COLUMNS.map((c) => escapeCsvCell(c.value(b))).join(","));
  return [headerRow, ...rows].join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  // Leading BOM so Excel opens UTF-8 CSVs (e.g. accented characters) correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
