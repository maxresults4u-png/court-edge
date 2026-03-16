// api/dvp.js
// Proxies NBA.com LeagueDashPtDefend — Defense vs Position (DVP)
// This is the single most valuable endpoint for DFS — FP allowed by team vs each position
// Deploy to Vercel /api/ folder

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const season = req.query.season || '2025-26';
  // position: G, F, C  — we'll call all three and merge
  const positions = ['G', 'F', 'C'];

  const NBA_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.nba.com/',
    'Origin': 'https://www.nba.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'x-nba-stats-origin': 'stats',
    'x-nba-stats-token': 'true',
    'Cache-Control': 'no-cache',
  };

  try {
    // Fetch all 3 positions in parallel
    const fetches = positions.map(pos => {
      const url = `https://stats.nba.com/stats/leaguedashptdefend?` +
        `College=&Conference=&Country=&DateFrom=&DateTo=&Division=&` +
        `DraftPick=&DraftYear=&GameSegment=&Height=&LastNGames=0&` +
        `LeagueID=00&Location=&Month=0&OpponentTeamID=0&Outcome=&` +
        `PORound=0&PerMode=PerGame&Period=0&PlayerExperience=&` +
        `PlayerPosition=${pos}&PtMeasureType=OverAll&Rank=N&` +
        `Season=${season}&SeasonSegment=&SeasonType=Regular+Season&` +
        `StarterBench=&TeamID=&VsConference=&VsDivision=&Weight=`;
      return fetch(url, { headers: NBA_HEADERS }).then(r => r.json()).then(d => ({ pos, data: d }));
    });

    const results = await Promise.all(fetches);

    // Build DVP map: { teamAbbr: { G: fpAllowed, F: fpAllowed, C: fpAllowed } }
    const dvp = {};

    results.forEach(({ pos, data }) => {
      if (!data?.resultSets?.[0]) return;
      const headers = data.resultSets[0].headers;
      const rows = data.resultSets[0].rowSet;

      rows.forEach(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);

        const team = obj.TEAM_ABBREVIATION;
        if (!team) return;
        if (!dvp[team]) dvp[team] = {};

        // NBA_FANTASY_PTS is the key field — FP allowed to this position
        dvp[team][pos] = {
          fpAllowed: obj.NBA_FANTASY_PTS,
          fgPctAllowed: obj.FG_PCT,
          ptsAllowed: obj.PTS,
          gp: obj.GP,
        };
      });
    });

    // Compute league averages per position for normalization
    const leagueAvg = {};
    positions.forEach(pos => {
      const vals = Object.values(dvp)
        .filter(t => t[pos]?.fpAllowed != null)
        .map(t => t[pos].fpAllowed);
      leagueAvg[pos] = vals.reduce((a, b) => a + b, 0) / vals.length;
    });

    // Add multipliers: fpAllowed / leagueAvg[pos]
    // >1.0 = soft on this position (good for DFS), <1.0 = tough
    Object.keys(dvp).forEach(team => {
      positions.forEach(pos => {
        if (dvp[team][pos]) {
          dvp[team][pos].mult = dvp[team][pos].fpAllowed / leagueAvg[pos];
        }
      });
    });

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({ dvp, leagueAvg, season, fetchedAt: new Date().toISOString() });

  } catch (err) {
    console.error('dvp error:', err);
    return res.status(500).json({ error: err.message });
  }
}
