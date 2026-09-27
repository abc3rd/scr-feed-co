import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const SITES_URL = 'https://www.googleapis.com/webmasters/v3/sites';
const fmt = (d) => d.toISOString().slice(0, 10);

// Pulls Google Search Console performance for the builder's connected account.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_search_console');
    const body = await req.json().catch(() => ({}));
    const days = Math.min(Math.max(parseInt(body.days) || 28, 1), 90);

    const sitesRes = await fetch(SITES_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
    const sitesData = await sitesRes.json();
    if (!sitesRes.ok) return Response.json({ error: sitesData.error?.message || 'Failed to list Search Console sites' }, { status: 502 });
    const sites = (sitesData.siteEntry || []).map((s) => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel }));
    const queryable = sites.filter((s) => s.permissionLevel === 'siteOwner' || s.permissionLevel === 'siteUser' || s.permissionLevel === 'siteFullUser');

    const siteUrl = body.siteUrl || queryable[0]?.siteUrl || sites[0]?.siteUrl;
    if (!siteUrl) return Response.json({ sites, message: 'No Search Console sites found for this account.' });

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const startDate = fmt(start);
    const endDate = fmt(end);
    const queryUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

    const query = (dimensions, rowLimit) =>
      fetch(queryUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, dimensions, rowLimit }),
      }).then((r) => r.json());

    const [byDate, byQuery, byPage] = await Promise.all([
      query(['date'], days + 1),
      query(['query'], 25),
      query(['page'], 25),
    ]);

    if (byDate.error) return Response.json({ error: byDate.error.message || 'Search Console query failed' }, { status: 502 });

    const dateRows = byDate.rows || [];
    const clicks = dateRows.reduce((a, r) => a + (r.clicks || 0), 0);
    const impressions = dateRows.reduce((a, r) => a + (r.impressions || 0), 0);
    const totals = {
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : 0,
      position: impressions ? dateRows.reduce((a, r) => a + (r.position || 0) * (r.impressions || 0), 0) / impressions : 0,
    };

    const daily = dateRows
      .map((r) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const topQueries = (byQuery.rows || []).map((r) => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }));
    const topPages = (byPage.rows || []).map((r) => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }));

    return Response.json({ sites, siteUrl, startDate, endDate, days, totals, daily, topQueries, topPages });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}