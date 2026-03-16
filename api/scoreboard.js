// api/scoreboard.js
// Proxies NBA.com ScoreboardV3 — tonight's games, teams, tip times
// Also pulls injury data from ESPN free feed
// Deploy to Vercel /api/ folder

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NBA_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.nba.com/',
    'Origin': 'https://www.nba.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'x-nba-stats-origin': 'stats',
    'x-nba-stats-token': 'true',
  };

  try {
    // Get today's date in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    const [year, month, day] = today.split('-');
    const gameDate = `${month}%2F${day}%2F${year}`; // MM%2FDD%2FYYYY

    // ScoreboardV3
    const scoreboardUrl = `https://stats.nba.com/stats/scoreboardv3?GameDate=${gameDate}&LeagueID=00&DayOffset=0`;

    const sbResp = await fetch(scoreboardUrl, { headers: NBA_HEADERS });
    const sbData = await sbResp.json();

    const games = [];

    if (sbData?.scoreboard?.games) {
      sbData.scoreboard.games.forEach(g => {
        games.push({
          gameId: g.gameId,
          status: g.gameStatusText,
          homeTeam: g.homeTeam?.teamTricode,
          awayTeam: g.awayTeam?.teamTricode,
          homeScore: g.homeTeam?.score,
          awayScore: g.awayTeam?.score,
          tipTime: g.gameEt, // ET tip time string
          period: g.period,
          gameClock: g.gameClock,
        });
      });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); // 5min cache for live scores
    return res.status(200).json({
      games,
      gameDate: today,
      fetchedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('scoreboard error:', err);
    return res.status(500).json({ error: err.message });
  }
}
