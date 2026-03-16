 // api/odds.js — The Odds API v4: tonight's NBA totals + spreads
// Free tier: 500 requests/month. Cached 10min to preserve quota.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const API_KEY = 'c9714976cf423a8ed53bc334799e71b5';

  try {
    // Fetch NBA odds — totals + spreads + h2h (moneyline)
    const url = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${API_KEY}&regions=us&markets=totals,spreads,h2h&oddsFormat=american&dateFormat=iso`;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Odds API ${resp.status}: ${await resp.text()}`);

    const data = await resp.json();

    // Remaining quota info from response headers
    const remaining = resp.headers.get('x-requests-remaining') || '?';
    const used = resp.headers.get('x-requests-used') || '?';

    // Parse into our teamMap format
    const teamMap = {};
    const gamesList = [];

    // NBA team name → abbreviation
    const TEAM_ABB = {
      'Atlanta Hawks':'ATL','Boston Celtics':'BOS','Brooklyn Nets':'BKN',
      'Charlotte Hornets':'CHA','Chicago Bulls':'CHI','Cleveland Cavaliers':'CLE',
      'Dallas Mavericks':'DAL','Denver Nuggets':'DEN','Detroit Pistons':'DET',
      'Golden State Warriors':'GSW','Houston Rockets':'HOU','Indiana Pacers':'IND',
      'Los Angeles Clippers':'LAC','Los Angeles Lakers':'LAL','Memphis Grizzlies':'MEM',
      'Miami Heat':'MIA','Milwaukee Bucks':'MIL','Minnesota Timberwolves':'MIN',
      'New Orleans Pelicans':'NOP','New York Knicks':'NYK','Oklahoma City Thunder':'OKC',
      'Orlando Magic':'ORL','Philadelphia 76ers':'PHI','Phoenix Suns':'PHX',
      'Portland Trail Blazers':'POR','Sacramento Kings':'SAC','San Antonio Spurs':'SAS',
      'Toronto Raptors':'TOR','Utah Jazz':'UTA','Washington Wizards':'WAS',
    };

    // Only include tonight's games (within next 24 hours)
    const now = new Date();
    const cutoff = new Date(now.getTime() + 28 * 60 * 60 * 1000); // 28hr window

    for (const game of data) {
      const gameTime = new Date(game.commence_time);
      if (gameTime > cutoff) continue; // skip future games

      const home = TEAM_ABB[game.home_team] || game.home_team;
      const away = TEAM_ABB[game.away_team] || game.away_team;

      let total = null, homeSpread = null, homeML = null, awayML = null;

      // Use DraftKings as primary bookmaker, fallback to first available
      const books = game.bookmakers || [];
      const dk = books.find(b => b.key === 'draftkings') || books[0];

      if (dk) {
        for (const mkt of dk.markets || []) {
          if (mkt.key === 'totals') {
            const over = mkt.outcomes?.find(o => o.name === 'Over');
            if (over) total = over.point;
          }
          if (mkt.key === 'spreads') {
            const homeLine = mkt.outcomes?.find(o => o.name === game.home_team);
            if (homeLine) homeSpread = homeLine.point;
          }
          if (mkt.key === 'h2h') {
            const homeO = mkt.outcomes?.find(o => o.name === game.home_team);
            const awayO = mkt.outcomes?.find(o => o.name === game.away_team);
            if (homeO) homeML = homeO.price;
            if (awayO) awayML = awayO.price;
          }
        }
      }

      if (!total) continue; // skip games with no total

      const spread = homeSpread || 0;
      const homeImpl = +((total / 2) - (spread / 2)).toFixed(1);
      const awayImpl = +(total - homeImpl).toFixed(1);
      const gameStr = `${away}@${home}`;

      teamMap[home] = { total, impliedPts: homeImpl, spread, moneyline: homeML, opponent: away, gameStr };
      teamMap[away] = { total, impliedPts: awayImpl, spread: -spread, moneyline: awayML, opponent: home, gameStr };
      gamesList.push({ home, away, total, homeImpl, awayImpl, homeSpread: spread, gameStr, tipTime: game.commence_time });
    }

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate'); // 10min cache
    return res.status(200).json({
      teamMap,
      gamesList,
      gamesCount: gamesList.length,
      quotaRemaining: remaining,
      quotaUsed: used,
      fetchedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('odds error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
