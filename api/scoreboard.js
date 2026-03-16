// api/scoreboard.js — NBA CDN static JSON (public, no auth required)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // NBA's own public CDN — no auth, no blocks, updates every ~30 seconds
    const url = 'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json';
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Origin': 'https://www.nba.com',
        'Referer': 'https://www.nba.com/',
      }
    });

    if (!resp.ok) throw new Error(`NBA CDN ${resp.status}`);
    const data = await resp.json();

    const games = [];
    const gamesList = data?.scoreboard?.games || [];

    gamesList.forEach(g => {
      games.push({
        gameId: g.gameId,
        status: g.gameStatusText,
        homeTeam: g.homeTeam?.teamTricode,
        awayTeam: g.awayTeam?.teamTricode,
        homeScore: g.homeTeam?.score,
        awayScore: g.awayTeam?.score,
        tipTime: g.gameEt,
        period: g.period,
        gameClock: g.gameClock,
      });
    });

    const today = new Date().toISOString().split('T')[0];
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json({ games, gameDate: today, fetchedAt: new Date().toISOString() });

  } catch (err) {
    console.error('scoreboard error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
