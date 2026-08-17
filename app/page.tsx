import Link from "next/link";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">UK Local Opportunity Finder</h1>
          <p className="mt-1 text-sm text-slate-500">
            Find UK local service businesses with strong Google reviews but a weak digital
            presence — good prospects for a website / digital upsell.
          </p>
        </div>
        <Link
          href="/demos"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        >
          View demo sites →
        </Link>
      </header>
      <Dashboard />
    </main>
  );
}
