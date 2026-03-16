// api/playerstats.js
// Proxies NBA.com LeagueDashPlayerStats — Last 10 Games
// Deploy to Vercel /api/ folder

export default async function handler(req, res) {
  // CORS — allow your Vercel domain + localhost
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const lastN = req.query.lastN || '10';
  const season = req.query.season || '2025-26';

  const url = `https://stats.nba.com/stats/leaguedashplayerstats?` +
    `College=&Conference=&Country=&DateFrom=&DateTo=&Division=&` +
    `DraftPick=&DraftYear=&GameScope=&GameSegment=&Height=&` +
    `LastNGames=${lastN}&LeagueID=00&Location=&MeasureType=Base&` +
    `Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&` +
    `PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&` +
    `PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&` +
    `SeasonType=Regular+Season&ShotClockRange=&StarterBench=&` +
    `TeamID=&TwoWay=0&VsConference=&VsDivision=&Weight=`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.nba.com/',
        'Origin': 'https://www.nba.com',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'x-nba-stats-origin': 'stats',
        'x-nba-stats-token': 'true',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `NBA API error: ${response.status}` });
    }

    const data = await response.json();

    // Parse into clean player objects
    const headers = data.resultSets[0].headers;
    const rows = data.resultSets[0].rowSet;

    const players = rows.map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return {
        name: obj.PLAYER_NAME?.toLowerCase(),
        team: obj.TEAM_ABBREVIATION,
        gp: obj.GP,
        min: obj.MIN,
        pts: obj.PTS,
        reb: obj.REB,
        ast: obj.AST,
        stl: obj.STL,
        blk: obj.BLK,
        tov: obj.TOV,
        fgPct: obj.FG_PCT,
        fg3Pct: obj.FG3_PCT,
        ftPct: obj.FT_PCT,
        fantasyPts: obj.NBA_FANTASY_PTS,
        plusMinus: obj.PLUS_MINUS,
      };
    });

    // Cache for 1 hour
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({ players, season, lastN: parseInt(lastN), fetchedAt: new Date().toISOString() });

  } catch (err) {
    console.error('playerstats error:', err);
    return res.status(500).json({ error: err.message });
  }
}
