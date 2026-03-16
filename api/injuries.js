// api/injuries.js
// Fetches NBA injury data from ESPN's free public API
// No key required — ESPN provides this openly
// Deploy to Vercel /api/ folder

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries';

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `ESPN API error: ${response.status}` });
    }

    const data = await response.json();

    // Parse into flat injury list
    const injuries = [];

    if (data?.injuries) {
      data.injuries.forEach(teamEntry => {
        const teamAbbr = teamEntry?.team?.abbreviation?.toUpperCase();
        teamEntry?.injuries?.forEach(inj => {
          const athlete = inj?.athlete;
          const status = inj?.status?.toUpperCase(); // OUT, QUESTIONABLE, DOUBTFUL, DAY-TO-DAY
          if (!athlete?.displayName) return;

          injuries.push({
            name: athlete.displayName.toLowerCase(),
            team: teamAbbr,
            status,                          // OUT | QUESTIONABLE | DOUBTFUL | DAY-TO-DAY
            description: inj?.shortComment, // e.g. "Left knee - Out"
            date: inj?.date,
          });
        });
      });
    }

    // Build lookup map for fast access
    const injuryMap = {};
    injuries.forEach(p => {
      injuryMap[p.name] = p;
    });

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate'); // 15min cache
    return res.status(200).json({
      injuries,
      injuryMap,
      count: injuries.length,
      fetchedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('injuries error:', err);
    return res.status(500).json({ error: err.message });
  }
}
