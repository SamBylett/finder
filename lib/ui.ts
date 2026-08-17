import type { OpportunityTier, WebsiteStatus } from "@/lib/types";

export function tierBadgeClasses(tier: OpportunityTier): string {
  switch (tier) {
    case "HOT":
      return "bg-red-100 text-red-800 border border-red-200";
    case "OPPORTUNITY":
      return "bg-amber-100 text-amber-800 border border-amber-200";
    case "LOW PRIORITY":
      return "bg-slate-100 text-slate-600 border border-slate-200";
  }
}

export function websiteStatusLabel(status: WebsiteStatus): string {
  switch (status) {
    case "no_website":
      return "No website";
    case "social_only":
      return "Social only";
    case "broken_website":
      return "Broken website";
    case "weak_website":
      return "Weak website";
    case "average_website":
      return "Average website";
    case "strong_website":
      return "Strong website";
    case "not_analysed":
      return "Not analysed";
  }
}

export function websiteStatusBadgeClasses(status: WebsiteStatus): string {
  switch (status) {
    case "no_website":
    case "broken_website":
      return "bg-red-50 text-red-700 border border-red-200";
    case "social_only":
    case "weak_website":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "average_website":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "strong_website":
      return "bg-green-50 text-green-700 border border-green-200";
    case "not_analysed":
      return "bg-slate-50 text-slate-600 border border-slate-200";
  }
}

export function demoPotentialBadgeClasses(tier: "EXCELLENT DEMO" | "GOOD DEMO" | "POSSIBLE" | "LOW VALUE"): string {
  switch (tier) {
    case "EXCELLENT DEMO":
      return "bg-purple-100 text-purple-800 border border-purple-200";
    case "GOOD DEMO":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "POSSIBLE":
      return "bg-slate-100 text-slate-600 border border-slate-200";
    case "LOW VALUE":
      return "bg-slate-50 text-slate-400 border border-slate-200";
  }
}

export function severityClasses(severity: "low" | "medium" | "high"): string {
  switch (severity) {
    case "high":
      return "bg-red-50 text-red-700 border border-red-200";
    case "medium":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "low":
      return "bg-slate-50 text-slate-600 border border-slate-200";
  }
}
