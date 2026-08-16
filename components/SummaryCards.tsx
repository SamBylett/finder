import type { ResultsSummary } from "@/lib/types";

export default function SummaryCards({ summary }: { summary: ResultsSummary }) {
  const cards = [
    { label: "Businesses analysed", value: summary.totalAnalysed, accent: "text-slate-900" },
    { label: "Hot opportunities", value: summary.hot, accent: "text-red-600" },
    { label: "Opportunities", value: summary.opportunity, accent: "text-amber-600" },
    { label: "Low priority", value: summary.lowPriority, accent: "text-slate-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">{card.label}</div>
          <div className={`mt-1 text-3xl font-bold ${card.accent}`}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}
