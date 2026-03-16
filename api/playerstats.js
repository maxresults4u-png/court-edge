// api/playerstats.js — player stats via balldontlie free API
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Get current season averages — per_page=100 gets us the top players
    const url = `https://api.balldontlie.io/v1/season_averages?season=2024&per_page=100`;
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });

    if (!resp.ok) throw new Error(`balldontlie stats ${resp.status}`);
    const data = await resp.json();

    const players = (data.data || []).map(p => ({
      name: p.player?.last_name ? `${p.player.first_name} ${p.player.last_name}`.toLowerCase() : '',
      gp: p.games_played || 0,
      min: p.min || '0',
      pts: p.pts || 0,
      reb: p.reb || 0,
      ast: p.ast || 0,
      stl: p.stl || 0,
      blk: p.blk || 0,
      fg_pct: p.fg_pct || 0,
    })).filter(p => p.name && p.gp > 0);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({ players, fetchedAt: new Date().toISOString() });

  } catch (err) {
    console.error('playerstats error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
