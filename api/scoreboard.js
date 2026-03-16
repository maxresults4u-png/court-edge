// api/scoreboard.js — NBA scoreboard via balldontlie (free, no auth needed)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // balldontlie free API — no key needed for basic game data
    const url = `https://api.balldontlie.io/v1/games?dates[]=${today}&per_page=30`;
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!resp.ok) throw new Error(`balldontlie ${resp.status}`);
    const data = await resp.json();

    const games = (data.data || []).map(g => ({
      gameId: String(g.id),
      status: g.status,
      homeTeam: g.home_team?.abbreviation,
      awayTeam: g.visitor_team?.abbreviation,
      homeScore: g.home_team_score,
      awayScore: g.visitor_team_score,
      tipTime: g.status,
      period: g.period,
    }));

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
    return res.status(200).json({ games, gameDate: today, fetchedAt: new Date().toISOString() });

  } catch (err) {
    console.error('scoreboard error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
