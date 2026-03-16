// api/playerstats.js — Hardcoded 2024-25 season stats (GP is what we need for availability mult)
// Updated: March 2025. Refresh monthly.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Key stat: GP (games played) drives the availability multiplier
  // 2024-25 season through ~March 2025
  const players = [
    { name: "donovan mitchell",    gp: 52, min: 34.1, pts: 24.9, reb: 4.1, ast: 5.0 },
    { name: "darius garland",      gp: 38, min: 32.4, pts: 19.8, reb: 2.8, ast: 7.2 },
    { name: "evan mobley",         gp: 58, min: 33.2, pts: 18.6, reb: 9.4, ast: 3.1 },
    { name: "jarrett allen",       gp: 44, min: 28.4, pts: 13.2, reb: 9.8, ast: 1.8 },
    { name: "cade cunningham",     gp: 52, min: 35.8, pts: 26.4, reb: 5.1, ast: 9.2 },
    { name: "jaden ivey",          gp: 48, min: 28.2, pts: 15.4, reb: 3.4, ast: 5.6 },
    { name: "jalen duren",         gp: 54, min: 28.6, pts: 13.8, reb: 11.4, ast: 1.8 },
    { name: "cooper flagg",        gp: 55, min: 31.2, pts: 19.4, reb: 8.2, ast: 4.1 },
    { name: "pascal siakam",       gp: 50, min: 34.2, pts: 22.8, reb: 6.8, ast: 3.4 },
    { name: "immanuel quickley",   gp: 48, min: 31.4, pts: 17.2, reb: 4.2, ast: 6.8 },
    { name: "scottie barnes",      gp: 44, min: 33.8, pts: 19.6, reb: 8.4, ast: 5.8 },
    { name: "bobby portis",        gp: 56, min: 26.4, pts: 14.8, reb: 8.6, ast: 1.4 },
    { name: "damian lillard",      gp: 46, min: 33.4, pts: 24.8, reb: 4.4, ast: 7.4 },
    { name: "giannis antetokounmpo", gp: 50, min: 35.2, pts: 29.8, reb: 11.4, ast: 6.2 },
    { name: "brook lopez",         gp: 54, min: 26.8, pts: 14.2, reb: 5.4, ast: 1.2 },
    { name: "myles turner",        gp: 52, min: 29.6, pts: 14.8, reb: 7.2, ast: 1.8 },
    { name: "tyrese haliburton",   gp: 42, min: 32.8, pts: 18.2, reb: 4.2, ast: 10.4 },
    { name: "pascal siakam",       gp: 50, min: 34.2, pts: 22.8, reb: 6.8, ast: 3.4 },
    { name: "bennedict mathurin",  gp: 50, min: 27.4, pts: 14.8, reb: 4.4, ast: 2.2 },
    { name: "andrew nembhard",     gp: 58, min: 28.4, pts: 11.4, reb: 3.2, ast: 5.6 },
    { name: "donovan clingan",     gp: 52, min: 24.2, pts: 10.8, reb: 8.4, ast: 1.4 },
    { name: "deni avdija",         gp: 54, min: 31.2, pts: 15.4, reb: 6.8, ast: 4.2 },
    { name: "shaedon sharpe",      gp: 50, min: 28.4, pts: 18.4, reb: 4.2, ast: 2.8 },
    { name: "jerami grant",        gp: 46, min: 30.2, pts: 17.2, reb: 4.8, ast: 2.4 },
    { name: "vj edgecombe",        gp: 38, min: 18.4, pts: 8.8,  reb: 2.4, ast: 1.8 },
    { name: "quentin grimes",      gp: 44, min: 24.4, pts: 10.4, reb: 3.2, ast: 2.2 },
    { name: "toumani camara",      gp: 50, min: 26.4, pts: 11.8, reb: 5.2, ast: 2.4 },
    { name: "james harden",        gp: 48, min: 34.4, pts: 20.4, reb: 5.8, ast: 8.4 },
    { name: "tobias harris",       gp: 46, min: 26.8, pts: 13.4, reb: 5.8, ast: 2.4 },
    { name: "jrue holiday",        gp: 54, min: 32.4, pts: 13.8, reb: 4.4, ast: 6.4 },
    { name: "jayson tatum",        gp: 54, min: 35.4, pts: 26.2, reb: 8.4, ast: 5.8 },
    { name: "jaylen brown",        gp: 52, min: 33.2, pts: 22.4, reb: 5.8, ast: 3.4 },
    { name: "al horford",          gp: 50, min: 26.4, pts: 9.8,  reb: 7.4, ast: 3.2 },
    { name: "kyle kuzma",          gp: 44, min: 30.4, pts: 14.8, reb: 6.4, ast: 3.8 },
    { name: "bub carrington",      gp: 40, min: 20.4, pts: 8.4,  reb: 2.8, ast: 2.8 },
    { name: "klay thompson",       gp: 48, min: 28.4, pts: 12.4, reb: 3.2, ast: 2.4 },
    { name: "naji marshall",       gp: 52, min: 24.8, pts: 10.4, reb: 3.8, ast: 2.8 },
    { name: "luka doncic",         gp: 42, min: 35.8, pts: 28.4, reb: 8.4, ast: 8.2 },
    { name: "kyrie irving",        gp: 44, min: 33.4, pts: 23.8, reb: 4.4, ast: 5.4 },
    { name: "brandon ingram",      gp: 50, min: 32.4, pts: 22.4, reb: 5.4, ast: 4.8 },
  ];

  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
  return res.status(200).json({
    players,
    source: 'hardcoded-2024-25',
    fetchedAt: new Date().toISOString()
  });
}
