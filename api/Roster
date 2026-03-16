// api/roster.js
// Gets tonight's NBA games + active rosters / probable players
// Sources: NBA CDN (games) + ESPN depth charts (rotation players)
// No auth required on either source

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ESPN team ID map
  const ESPN_TEAM_IDS = {
    ATL:1,BOS:2,BKN:17,CHA:30,CHI:4,CLE:5,DAL:6,DEN:7,DET:8,GSW:9,
    HOU:10,IND:11,LAC:12,LAL:13,MEM:29,MIA:14,MIL:15,MIN:16,NOP:3,
    NYK:18,OKC:25,ORL:19,PHI:20,PHX:21,POR:22,SAC:23,SAS:24,TOR:28,
    UTA:26,WAS:27,
  };

  try {
    // Step 1: Get tonight's games from NBA CDN
    const sbResp = await fetch(
      'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json'
    );
    const sbData = await sbResp.json();
    const games = sbData?.scoreboard?.games || [];

    if (games.length === 0) {
      return res.status(200).json({
        games: [],
        probables: {},
        message: 'No games today',
        fetchedAt: new Date().toISOString()
      });
    }

    // Collect all teams playing tonight
    const teamsTonight = new Set();
    games.forEach(g => {
      teamsTonight.add(g.homeTeam.teamTricode);
      teamsTonight.add(g.awayTeam.teamTricode);
    });

    // Step 2: Fetch ESPN depth chart for each team playing tonight
    const probables = {}; // { "LeBron James": { team, status, depth, position } }
    const teamRosters = {}; // { "LAL": [players] }

    await Promise.allSettled(
      [...teamsTonight].map(async (tricode) => {
        const espnId = ESPN_TEAM_IDS[tricode];
        if (!espnId) return;

        try {
          // ESPN roster endpoint — includes injury status
          const rosterUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${espnId}/roster`;
          const rResp = await fetch(rosterUrl, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
          });
          if (!rResp.ok) return;
          const rData = await rResp.json();

          const players = [];
          const allAthletes = rData?.athletes || [];

          allAthletes.forEach(group => {
            // ESPN groups by position (guards, forwards, centers)
            const items = group?.items || [group];
            items.forEach(athlete => {
              if (!athlete?.fullName) return;

              const injStatus = athlete?.injuries?.[0]?.status || 'ACTIVE';
              const injDesc = athlete?.injuries?.[0]?.shortComment || '';
              const isOut = ['Out', 'Injured Reserve', 'Suspended'].includes(injStatus);
              const isQ = ['Questionable', 'Doubtful', 'Day-To-Day'].includes(injStatus);

              const player = {
                name: athlete.fullName,
                nameLower: athlete.fullName.toLowerCase(),
                team: tricode,
                position: athlete.position?.abbreviation || '',
                jersey: athlete.jersey || '',
                status: isOut ? 'OUT' : isQ ? 'Q' : 'ACTIVE',
                injuryNote: injDesc,
                espnId: athlete.id,
              };

              players.push(player);
              probables[athlete.fullName.toLowerCase()] = player;
            });
          });

          teamRosters[tricode] = players;
        } catch (e) {
          console.error(`Roster fetch failed for ${tricode}:`, e.message);
        }
      })
    );

    // Step 3: Build tonight's game summaries with probable starters
    const gameSummaries = games.map(g => {
      const home = g.homeTeam.teamTricode;
      const away = g.awayTeam.teamTricode;
      return {
        gameId: g.gameId,
        matchup: `${away}@${home}`,
        home,
        away,
        status: g.gameStatusText,
        tipTime: g.gameEt,
        homePlayers: (teamRosters[home] || []).filter(p => p.status !== 'OUT'),
        awayPlayers: (teamRosters[away] || []).filter(p => p.status !== 'OUT'),
        homeOuts: (teamRosters[home] || []).filter(p => p.status === 'OUT').map(p => p.name),
        awayOuts: (teamRosters[away] || []).filter(p => p.status === 'OUT').map(p => p.name),
      };
    });

    const totalActive = Object.values(probables).filter(p => p.status === 'ACTIVE').length;
    const totalOut = Object.values(probables).filter(p => p.status === 'OUT').length;
    const totalQ = Object.values(probables).filter(p => p.status === 'Q').length;

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate'); // 15min cache
    return res.status(200).json({
      games: gameSummaries,
      probables,           // flat lookup by player name (lowercase)
      teamRosters,         // by team tricode
      teamsTonight: [...teamsTonight],
      counts: { active: totalActive, out: totalOut, questionable: totalQ },
      fetchedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('roster error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
