// Database setup and operations
const db = new Dexie('ShotTrackerDB');
db.version(1).stores({
    teams: '++id, name, created_at',
    players: '++id, team_id, number, [team_id+number]',
    matches: '++id, team1_id, team2_id, name, date, created_at',
    shots: '++id, match_id, team_id, player_number, x0, y0, x1, y1, x2, y2, goal, created_at, [match_id+team_id], [team_id+player_number], [match_id+team_id+player_number]'
});

// Database operations
const DatabaseManager = {
    // Initialize database
    async init() {
        try {
            await db.open();
            return true;
        } catch (error) {
            console.error('Database initialization error:', error);
            return false;
        }
    },

    // Team operations
    async addTeam(name, playerNumbers) {
        try {
            // Add team
            const teamId = await db.teams.add({
                name: name.trim(),
                created_at: new Date()
            });
            
            // Add players for this team
            const playerPromises = playerNumbers.map(number => 
                db.players.add({
                    team_id: teamId,
                    number: number
                })
            );
            
            await Promise.all(playerPromises);
            
            return teamId;
        } catch (error) {
            console.error('Error adding team and players:', error);
            throw error;
        }
    },

    async getTeams() {
        return await db.teams.orderBy('created_at').reverse().toArray();
    },

    async getTeam(id) {
        return await db.teams.get(id);
    },
    
    async getTeamPlayers(teamId) {
        return await db.players.where('team_id').equals(teamId).toArray();
    },

    // Match operations
    async addMatch(team1Id, team2Id, name, date) {
        return await db.matches.add({
            team1_id: team1Id,
            team2_id: team2Id,
            name: name.trim(),
            date: new Date(date),
            created_at: new Date()
        });
    },

    async getMatches() {
        return await db.matches.orderBy('created_at').reverse().toArray();
    },

    async getMatch(id) {
        return await db.matches.get(id);
    },

    async getMatchesForTeam(teamId) {
        return await db.matches.where('team1_id').equals(teamId)
            .or('team2_id').equals(teamId)
            .reverse().sortBy('created_at');
    },

    // Shot operations
    async addShot(matchId, teamId, playerNumber, x0, y0, x1, y1, x2, y2, isGoal) {
        const shotData = {
            match_id: matchId,
            team_id: teamId,
            player_number: playerNumber,
            x0: x0.toFixed(3),
            y0: y0.toFixed(3),
            x1: x1.toFixed(3),
            y1: y1.toFixed(3),
            x2: x2.toFixed(3),
            y2: y2.toFixed(3),
            goal: isGoal,
            created_at: new Date()
        };

        try {
            const result = await db.shots.add(shotData);
            
            // Verify it was saved
            const savedShot = await db.shots.get(result);
            
            return result;
        } catch (error) {
            console.error('Error saving shot:', error);
            throw error;
        }
    },

    async getShotsForMatch(matchId, teamId) {
        return await db.shots.where(['match_id', 'team_id'])
            .equals([matchId, teamId])
            .toArray();
    },

    async getShotsForPlayer(teamId, playerNumber, matchIds = null) {
        let shotsQuery = db.shots.where(['team_id', 'player_number'])
            .equals([teamId, playerNumber]);
        
        const shots = await shotsQuery.toArray();
        
        if (matchIds && matchIds.length > 0) {
            return shots.filter(shot => matchIds.includes(shot.match_id));
        }
        
        return shots;
    }
}; 