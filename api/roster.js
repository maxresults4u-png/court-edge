// api/roster.js
// Gets tonight's active rosters using ESPN team roster endpoints
// Falls back gracefully if any team fetch fails

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ESPN_TEAM_IDS = {
    ATL:1,BOS:2,BKN:17,CHA:30,CHI:4,CLE:5,DAL:6,DEN:7,DET:8,GSW:9,
    HOU:10,IND:11,LAC:12,LAL:13,MEM:29,MIA:14,MIL:15,MIN:16,NOP:3,
    NYK:18,OKC:25,ORL:19,PHI:20,PHX:21,POR:22,SAC:23,SAS:24,TOR:28,
    UTA:26,WAS:27,
  };

  try {
    // Step 1: Get tonight's games from NBA CDN
    const sbResp = await fetch(
      'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json',
      { headers: { 'Accept': 'application/json' } }
    );

    if (!sbResp.ok) throw new Error(`NBA CDN ${sbResp.status}`);
    const sbData = await sbResp.json();
    const games = sbData?.scoreboard?.games || [];

    if (games.length === 0) {
      return res.status(200).json({
        games: [], probables: {}, teamRosters: {},
        teamsTonight: [], counts: { active:0, out:0, questionable:0 },
        message: 'No games today',
        fetchedAt: new Date().toISOString()
      });
    }

    // Teams playing tonight
    const teamsTonight = new Set();
    games.forEach(g => {
      if (g.homeTeam?.teamTricode) teamsTonight.add(g.homeTeam.teamTricode);
      if (g.awayTeam?.teamTricode) teamsTonight.add(g.awayTeam.teamTricode);
    });

    // Step 2: Fetch ESPN roster for each team — fully wrapped in try/catch
    const probables = {};
    const teamRosters = {};

    const rosterFetches = [...teamsTonight].map(async (tricode) => {
      const espnId = ESPN_TEAM_IDS[tricode];
      if (!espnId) return;

      try {
        const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${espnId}/roster`;
        const resp = await fetch(url, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(8000)
        });
        if (!resp.ok) return;

        const data = await resp.json();
        const players = [];

        // ESPN returns athletes in groups array OR flat array — handle both
        const groups = Array.isArray(data?.athletes) ? data.athletes : [];

        groups.forEach(group => {
          // Each group may have items[] or be a player directly
          const items = Array.isArray(group?.items) ? group.items : 
                        (group?.id ? [group] : []);

          items.forEach(athlete => {
            if (!athlete?.fullName && !athlete?.displayName) return;
            const name = athlete.fullName || athlete.displayName || '';
            if (!name) return;

            // Injury status
            const injArray = athlete?.injuries || [];
            const inj = injArray[0];
            const injType = inj?.status || '';
            let status = 'ACTIVE';
            if (['Out', 'Injured Reserve', 'Suspended', 'Out For Season'].includes(injType)) {
              status = 'OUT';
            } else if (['Questionable', 'Doubtful', 'Day-To-Day', 'Probable'].includes(injType)) {
              status = 'Q';
            }

            const player = {
              name,
              nameLower: name.toLowerCase(),
              team: tricode,
              position: athlete?.position?.abbreviation || '',
              status,
              injuryNote: inj?.shortComment || inj?.longComment || '',
            };

            players.push(player);
            probables[name.toLowerCase()] = player;
          });
        });

        teamRosters[tricode] = players;
      } catch (teamErr) {
        console.error(`Roster fetch failed for ${tricode}:`, teamErr.message);
        teamRosters[tricode] = []; // empty but don't crash
      }
    });

    await Promise.allSettled(rosterFetches);

    // Step 3: Build game summaries
    const gameSummaries = games.map(g => {
      const home = g.homeTeam?.teamTricode || '';
      const away = g.awayTeam?.teamTricode || '';
      const homeRoster = teamRosters[home] || [];
      const awayRoster = teamRosters[away] || [];
      return {
        gameId: g.gameId,
        matchup: `${away}@${home}`,
        home, away,
        status: g.gameStatusText || '',
        tipTime: g.gameEt || '',
        homeOuts: homeRoster.filter(p => p.status === 'OUT').map(p => p.name),
        awayOuts: awayRoster.filter(p => p.status === 'OUT').map(p => p.name),
        homeQ: homeRoster.filter(p => p.status === 'Q').map(p => p.name),
        awayQ: awayRoster.filter(p => p.status === 'Q').map(p => p.name),
      };
    });

    const counts = {
      active: Object.values(probables).filter(p => p.status === 'ACTIVE').length,
      out: Object.values(probables).filter(p => p.status === 'OUT').length,
      questionable: Object.values(probables).filter(p => p.status === 'Q').length,
    };

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return res.status(200).json({
      games: gameSummaries,
      probables,
      teamRosters,
      teamsTonight: [...teamsTonight],
      counts,
      fetchedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('roster top-level error:', err.message);
    // Return empty but valid response — don't crash the app
    return res.status(200).json({
      games: [], probables: {}, teamRosters: {},
      teamsTonight: [], counts: { active:0, out:0, questionable:0 },
      error: err.message,
      fetchedAt: new Date().toISOString()
    });
  }
}
