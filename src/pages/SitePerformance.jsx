import React, { useEffect, useState } from "react";
import { RefreshCw, Search, TrendingUp, MousePointerClick, Eye, Target, ChevronDown } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { base44 } from "@/api/base44Client";
import BackHeader from "@/components/layout/BackHeader";
import OptionSheet from "@/components/site/OptionSheet";
import SiteFooter from "@/components/layout/SiteFooter";
import { Skeleton } from "@/components/ui/skeleton";

const RANGES = [["7", "Last 7 days"], ["28", "Last 28 days"], ["90", "Last 90 days"]];
const pct = (n) => `${(n * 100).toFixed(1)}%`;
const num = (n) => n.toLocaleString("en-US");

function StatCard({ icon: Icon, label, value, hint = undefined }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-heading text-4xl tracking-wide mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function Table({ title, rows, keyLabel, renderKey }) {
  return (
    <section aria-label={title}>
      <h2 className="font-heading text-3xl tracking-wide mb-3">{title}</h2>
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              <th className="text-left font-semibold px-4 py-2">{keyLabel}</th>
              <th className="text-right font-semibold px-2 py-2">Clicks</th>
              <th className="text-right font-semibold px-2 py-2 hidden sm:table-cell">Impr.</th>
              <th className="text-right font-semibold px-4 py-2">CTR</th>
              <th className="text-right font-semibold px-4 py-2 hidden sm:table-cell">Pos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-4 py-2 max-w-[40vw] truncate">{renderKey(r)}</td>
                <td className="px-2 py-2 text-right font-semibold">{num(r.clicks)}</td>
                <td className="px-2 py-2 text-right hidden sm:table-cell">{num(r.impressions)}</td>
                <td className="px-4 py-2 text-right">{pct(r.ctr)}</td>
                <td className="px-4 py-2 text-right hidden sm:table-cell">{r.position.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SitePerformance() {
  const [data, setData] = useState(null);
  const [sites, setSites] = useState([]);
  const [siteUrl, setSiteUrl] = useState("");
  const [days, setDays] = useState("28");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [siteSheet, setSiteSheet] = useState(false);
  const [rangeSheet, setRangeSheet] = useState(false);

  const load = async (site, range) => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("searchConsolePerformance", { siteUrl: site, days: range });
      const d = res.data;
      setSites(d.sites || []);
      if (d.message) {
        setData(null);
        setError(d.message);
      } else {
        setData(d);
        setSiteUrl(d.siteUrl);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load performance data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("", days);
  }, []);

  const onSite = (v) => {
    setSiteUrl(v);
    load(v, days);
  };
  const onRange = (v) => {
    setDays(v);
    load(siteUrl, v);
  };

  const siteLabel = sites.find((s) => s.siteUrl === siteUrl)?.siteUrl || "Select site";
  const rangeLabel = RANGES.find(([v]) => v === days)?.[1] || "Select range";

  return (
    <div>
      <BackHeader title="Search performance" />
      <main className="w-full max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-end justify-between gap-3">
          <p className="text-muted-foreground text-sm">Synced from Google Search Console.</p>
          <button
            type="button"
            onClick={() => load(siteUrl, days)}
            className="h-11 px-4 rounded-xl border border-border bg-card font-semibold flex items-center gap-2 select-none"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setSiteSheet(true)}
            disabled={!sites.length}
            className="flex-1 min-w-[180px] h-12 rounded-xl border-2 border-input bg-card px-3 flex items-center justify-between gap-2 font-medium focus:border-primary disabled:opacity-50 select-none"
          >
            <span className="truncate">{siteLabel}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setRangeSheet(true)}
            className="h-12 rounded-xl border-2 border-input bg-card px-3 flex items-center justify-between gap-2 font-medium focus:border-primary select-none"
          >
            <span>{rangeLabel}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          </button>
        </div>

        <OptionSheet
          open={siteSheet}
          onOpenChange={setSiteSheet}
          title="Select site"
          value={siteUrl}
          onSelect={onSite}
          options={sites.map((s) => ({ value: s.siteUrl, label: s.siteUrl }))}
        />
        <OptionSheet
          open={rangeSheet}
          onOpenChange={setRangeSheet}
          title="Date range"
          value={days}
          onSelect={onRange}
          options={RANGES.map(([v, l]) => ({ value: v, label: l }))}
        />

        {error && <p role="alert" className="text-destructive font-medium">{error}</p>}

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl bg-secondary" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-2xl bg-secondary" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={MousePointerClick} label="Clicks" value={num(data.totals.clicks)} />
              <StatCard icon={Eye} label="Impressions" value={num(data.totals.impressions)} />
              <StatCard icon={TrendingUp} label="Avg CTR" value={pct(data.totals.ctr)} />
              <StatCard icon={Target} label="Avg Position" value={data.totals.position.toFixed(1)} />
            </div>

            <section aria-label="Daily performance">
              <h2 className="font-heading text-3xl tracking-wide mb-3">Clicks over time</h2>
              <div className="rounded-2xl bg-card border border-border p-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="clicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(131 39% 30%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(131 39% 30%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(40 25% 82%)" }} />
                    <Area type="monotone" dataKey="clicks" stroke="hsl(131 39% 30%)" strokeWidth={2} fill="url(#clicks)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {data.topQueries.length > 0 && (
              <Table
                title="Top queries"
                rows={data.topQueries}
                keyLabel="Query"
                renderKey={(r) => (
                  <span className="flex items-center gap-2">
                    <Search className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
                    {r.query}
                  </span>
                )}
              />
            )}
            {data.topPages.length > 0 && (
              <Table title="Top pages" rows={data.topPages} keyLabel="Page" renderKey={(r) => <span className="truncate">{r.page}</span>} />
            )}
          </>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
