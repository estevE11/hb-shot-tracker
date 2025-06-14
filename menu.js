// Menu and navigation functionality
const MenuManager = {
    // Initialize menu system
    init() {
        // Menu system initialized
    },
    
    // Show a specific section
    showSection(sectionId, data = null) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show selected section
        document.getElementById(sectionId).classList.add('active');
        AppState.currentSection = sectionId;
        
        // Load section-specific data
        switch(sectionId) {
            case 'teams-section':
                this.loadTeams();
                break;
            case 'team-detail-section':
                if (data) {
                    AppState.currentTeam = data;
                    this.loadTeamDetail(data);
                }
                break;
            case 'match-registration-section':
                if (data) {
                    AppState.currentMatch = data;
                    AppState.currentMatchTeam = 1; // Reset to team1
                    this.loadMatchRegistration(data);
                }
                break;
            case 'player-stats-section':
                if (data) {
                    AppState.currentPlayer = data;
                    this.loadPlayerStats(data);
                }
                break;
            case 'matches-section':
                this.loadAllMatches();
                break;
        }
    },
    
    // Navigate back to team detail
    goBackToTeamDetail() {
        if (AppState.currentTeam) {
            this.showSection('team-detail-section', AppState.currentTeam);
        } else {
            this.showSection('teams-section');
        }
    },
    
    // Load teams list
    async loadTeams() {
        try {
            const teams = await DatabaseManager.getTeams();
            const teamsList = document.getElementById('teams-list');
            
            let html = `
                <div class="list-item add-item" onclick="MenuManager.addTeam()">
                    <span>+ Add New Team</span>
                </div>
            `;
            
            teams.forEach(team => {
                const teamJson = JSON.stringify(team).replace(/"/g, '&quot;');
                html += `
                    <div class="list-item" onclick="MenuManager.showSection('team-detail-section', ${teamJson})">
                        <span>${team.name}</span>
                        <span style="color: #666; font-size: 0.9em;">${new Date(team.created_at).toLocaleDateString()}</span>
                    </div>
                `;
            });
            
            teamsList.innerHTML = html;
        } catch (error) {
            console.error('Error loading teams:', error);
        }
    },
    
    // Add new team
    async addTeam() {
        const name = prompt('Enter team name:');
        if (!name || !name.trim()) return;
        
        // Create team creation modal
        this.createTeamModal(name.trim());
    },
    
    // Create team creation modal
    createTeamModal(teamName) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); display: flex; align-items: center; 
            justify-content: center; z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; max-height: 80%; overflow-y: auto;">
                <h3 style="margin-bottom: 20px;">Create Team: ${teamName}</h3>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold;">Player Numbers:</label>
                    <div style="margin-bottom: 10px; color: #666; font-size: 0.9em;">
                        Enter player numbers separated by commas (e.g., 1,2,3,7,10,15)
                    </div>
                    <input type="text" id="player-numbers" placeholder="1,2,3,4,5,6,7,8,9,10" 
                           value="1,2,3,4,5,6,7,8,9,10"
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <div id="player-preview" style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px; min-height: 40px;">
                        <strong>Preview:</strong> <span id="preview-text">1, 2, 3, 4, 5, 6, 7, 8, 9, 10</span>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="this.closest('div').parentElement.remove()" 
                            style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Cancel
                    </button>
                    <button onclick="MenuManager.createTeamFromModal('${teamName}')" 
                            style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Create Team
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add real-time preview
        const input = modal.querySelector('#player-numbers');
        const previewText = modal.querySelector('#preview-text');
        
        input.addEventListener('input', () => {
            const numbers = this.parsePlayerNumbers(input.value);
            previewText.textContent = numbers.length > 0 ? numbers.join(', ') : 'No valid numbers';
            previewText.style.color = numbers.length > 0 ? '#333' : '#dc3545';
        });
    },
    
    // Parse player numbers from input
    parsePlayerNumbers(input) {
        return input.split(',')
            .map(num => parseInt(num.trim()))
            .filter(num => !isNaN(num) && num > 0)
            .sort((a, b) => a - b)
            .filter((num, index, arr) => arr.indexOf(num) === index); // Remove duplicates
    },
    
    // Create team from modal
    async createTeamFromModal(teamName) {
        const input = document.getElementById('player-numbers').value;
        const playerNumbers = this.parsePlayerNumbers(input);
        
        if (playerNumbers.length === 0) {
            alert('Please enter at least one valid player number.');
            return;
        }
        
        try {
            await DatabaseManager.addTeam(teamName, playerNumbers);
            
            // Remove modal
            document.querySelector('div[style*="position: fixed"]').remove();
            
            // Reload teams list
            this.loadTeams();
        } catch (error) {
            console.error('Error creating team:', error);
            alert('Error creating team. Please try again.');
        }
    },
    
    // Load team detail page
    async loadTeamDetail(team) {
        document.getElementById('team-detail-title').textContent = team.name;
        
        try {
            // Load team's player numbers
            const players = await DatabaseManager.getTeamPlayers(team.id);
            const playerNumbers = players.map(p => p.number).sort((a, b) => a - b);
            
            // Load player grid with team's specific player numbers
            const playersGrid = document.getElementById('team-players-grid');
            let playersHtml = '';
            
            playerNumbers.forEach((number, index) => {
                playersHtml += `
                    <button class="player-btn" onclick="MenuManager.showPlayerStats(${team.id}, ${number}, '${team.name}')">
                        ${number}
                    </button>
                `;
            });
            
            playersGrid.innerHTML = playersHtml;
            
            // Update AppState to use this team's player numbers
            AppState.gridNumbers = playerNumbers;
            
            // Load matches
            const matches = await DatabaseManager.getMatchesForTeam(team.id);
            const teams = await DatabaseManager.getTeams();
            const teamMap = {};
            teams.forEach(t => teamMap[t.id] = t.name);
            
            const matchesList = document.getElementById('team-matches-list');
            
            let matchesHtml = `
                <div class="list-item add-item" onclick="MenuManager.addMatch()">
                    <span>+ Add New Match</span>
                </div>
            `;
            
            matches.forEach(match => {
                const opponent = match.team1_id === team.id ? teamMap[match.team2_id] : teamMap[match.team1_id];
                const matchJson = JSON.stringify(match).replace(/"/g, '&quot;');
                matchesHtml += `
                    <div class="list-item" onclick="MenuManager.showSection('match-registration-section', ${matchJson})">
                        <div>
                            <div style="font-weight: bold;">${match.name}</div>
                            <div style="color: #666; font-size: 0.9em;">vs ${opponent}</div>
                        </div>
                        <span style="color: #666; font-size: 0.9em;">${new Date(match.date).toLocaleDateString()}</span>
                    </div>
                `;
            });
            
            matchesList.innerHTML = matchesHtml;
        } catch (error) {
            console.error('Error loading team details:', error);
        }
    },
    
    // Add new match
    async addMatch() {
        const name = prompt('Enter match name:');
        if (!name || !name.trim()) return;
        
        try {
            const teams = await DatabaseManager.getTeams();
            if (teams.length < 2) {
                alert('You need at least 2 teams to create a match.');
                return;
            }
            
            // Create team selection modal
            this.createMatchModal(name.trim(), teams);
        } catch (error) {
            console.error('Error adding match:', error);
        }
    },
    
    // Create match selection modal
    createMatchModal(matchName, teams) {
        let teamOptions = '';
        teams.forEach(team => {
            teamOptions += `<option value="${team.id}">${team.name}</option>`;
        });
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); display: flex; align-items: center; 
            justify-content: center; z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
                <h3 style="margin-bottom: 20px;">Create Match: ${matchName}</h3>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Team 1:</label>
                    <select id="team1-select" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        ${teamOptions}
                    </select>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Team 2:</label>
                    <select id="team2-select" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        ${teamOptions}
                    </select>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Date:</label>
                    <input type="date" id="match-date" value="${new Date().toISOString().split('T')[0]}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="this.closest('div').parentElement.remove()" 
                            style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Cancel
                    </button>
                    <button onclick="MenuManager.createMatchFromModal('${matchName}')" 
                            style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Create Match
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },
    
    // Create match from modal
    async createMatchFromModal(matchName) {
        const team1Id = parseInt(document.getElementById('team1-select').value);
        const team2Id = parseInt(document.getElementById('team2-select').value);
        const matchDate = document.getElementById('match-date').value;
        
        if (team1Id === team2Id) {
            alert('Please select two different teams.');
            return;
        }
        
        try {
            await DatabaseManager.addMatch(team1Id, team2Id, matchName, matchDate);
            
            // Remove modal
            document.querySelector('div[style*="position: fixed"]').remove();
            
            // Reload current team detail if we're in team view
            if (AppState.currentTeam) {
                this.loadTeamDetail(AppState.currentTeam);
            }
        } catch (error) {
            console.error('Error creating match:', error);
        }
    },
    
    // Show player statistics
    showPlayerStats(teamId, playerNumber, teamName) {
        const playerData = {
            teamId: teamId,
            playerNumber: playerNumber,
            teamName: teamName
        };
        this.showSection('player-stats-section', playerData);
    },
    
    // Load match registration page
    async loadMatchRegistration(match) {
        document.getElementById('match-registration-title').textContent = match.name;
        
        try {
            // Get team information
            const team1 = await DatabaseManager.getTeam(match.team1_id);
            const team2 = await DatabaseManager.getTeam(match.team2_id);
            
            // Get current team's player numbers
            const currentTeamId = AppState.currentMatchTeam === 1 ? match.team1_id : match.team2_id;
            const currentTeamPlayers = await DatabaseManager.getTeamPlayers(currentTeamId);
            const playerNumbers = currentTeamPlayers.map(p => p.number).sort((a, b) => a - b);
            
            // Update AppState to use current team's player numbers
            AppState.gridNumbers = playerNumbers;
            
            // Create team swap button and current team display
            const playersGrid = document.getElementById('match-players-grid');
            const currentTeamData = AppState.currentMatchTeam === 1 ? team1 : team2;
            const otherTeamData = AppState.currentMatchTeam === 1 ? team2 : team1;
            
            let playersHtml = `
                <div style="grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; 
                            padding: 15px; background: #f8f9fa; border-radius: 8px; margin-bottom: 15px;">
                    <div style="font-weight: bold; color: #007bff;">
                        Current: ${currentTeamData.name}
                    </div>
                    <button class="player-btn" onclick="MenuManager.swapTeam()" 
                            style="padding: 8px 16px; font-size: 0.9em; background: #17a2b8; border-color: #17a2b8; color: white;">
                        Switch to ${otherTeamData.name}
                    </button>
                </div>
            `;
            
            playerNumbers.forEach((number, index) => {
                const selectedClass = (index === AppState.selectedPlayerIndex) ? 'selected' : '';
                playersHtml += `
                    <button class="player-btn ${selectedClass}" onclick="MenuManager.selectPlayer(${index})">
                        ${number}
                    </button>
                `;
            });
            
            playersGrid.innerHTML = playersHtml;
            
            // Initialize canvas and load shots
            CanvasManager.initializeCanvas('canvas-container');
            await CanvasManager.loadShots();
            
            // Initialize shot type buttons
            this.updateShotTypeButtons();
        } catch (error) {
            console.error('Error loading match registration:', error);
        }
    },
    
    // Swap teams in match
    swapTeam() {
        AppState.currentMatchTeam = AppState.currentMatchTeam === 1 ? 2 : 1;
        AppState.selectedPlayerIndex = null; // Reset player selection when swapping teams
        CanvasManager.resetCurrentShot(); // Reset current shot when swapping teams
        this.loadMatchRegistration(AppState.currentMatch);
    },
    
    // Select player
    selectPlayer(index) {
        AppState.selectedPlayerIndex = index;
        this.loadMatchRegistration(AppState.currentMatch);
    },
    
    // Load player statistics page
    async loadPlayerStats(playerData) {
        document.getElementById('player-stats-title').textContent = 
            `Player ${playerData.playerNumber} - ${playerData.teamName}`;
        
        try {
            // Load match filters
            const matches = await DatabaseManager.getMatchesForTeam(playerData.teamId);
            const teams = await DatabaseManager.getTeams();
            const teamMap = {};
            teams.forEach(team => teamMap[team.id] = team.name);
            
            const filtersContainer = document.getElementById('match-filters-list');
            
            let filtersHtml = `
                <div class="match-filter-item ${AppState.selectedMatchFilters.size === 0 ? 'selected' : ''}" onclick="MenuManager.toggleAllMatches()">
                    <input type="checkbox" ${AppState.selectedMatchFilters.size === 0 ? 'checked' : ''}>
                    <span>All Matches</span>
                </div>
            `;
            
            matches.forEach(match => {
                const isSelected = AppState.selectedMatchFilters.has(match.id);
                const opponent = match.team1_id === playerData.teamId ? teamMap[match.team2_id] : teamMap[match.team1_id];
                filtersHtml += `
                    <div class="match-filter-item ${isSelected ? 'selected' : ''}" onclick="MenuManager.toggleMatchFilter(${match.id})">
                        <input type="checkbox" ${isSelected ? 'checked' : ''}>
                        <span>${match.name} vs ${opponent}</span>
                    </div>
                `;
            });
            
            filtersContainer.innerHTML = filtersHtml;
            
            // Load statistics
            await this.updatePlayerStats(playerData);
            
            // Initialize stats canvas and load shots
            CanvasManager.initializeCanvas('canvas-container-stats');
            await CanvasManager.loadShots();
            
            // Initialize shot type filters UI
            this.updateShotTypeFiltersUI();
        } catch (error) {
            console.error('Error loading player stats:', error);
        }
    },
    
    // Update player statistics
    async updatePlayerStats(playerData) {
        try {
            const matchIds = AppState.selectedMatchFilters.size > 0 ? 
                Array.from(AppState.selectedMatchFilters) : null;
                
            const shots = await DatabaseManager.getShotsForPlayer(
                playerData.teamId, 
                playerData.playerNumber, 
                matchIds
            );
            
            this.displayStats(shots);
        } catch (error) {
            console.error('Error updating player stats:', error);
        }
    },
    
    // Display statistics
    displayStats(shots) {
        const totalShots = shots.length;
        const goals = shots.filter(shot => shot.goal).length;
        const misses = totalShots - goals;
        const accuracy = totalShots > 0 ? Math.round((goals / totalShots) * 100) : 0;
        
        // Break down by shot type
        const staticShots = shots.filter(shot => !shot.shot_type || shot.shot_type === 'static');
        const penaltyShots = shots.filter(shot => shot.shot_type === 'penalty');
        const counterShots = shots.filter(shot => shot.shot_type === 'counter');
        
        const staticGoals = staticShots.filter(shot => shot.goal).length;
        const penaltyGoals = penaltyShots.filter(shot => shot.goal).length;
        const counterGoals = counterShots.filter(shot => shot.goal).length;
        
        const staticAccuracy = staticShots.length > 0 ? Math.round((staticGoals / staticShots.length) * 100) : 0;
        const penaltyAccuracy = penaltyShots.length > 0 ? Math.round((penaltyGoals / penaltyShots.length) * 100) : 0;
        const counterAccuracy = counterShots.length > 0 ? Math.round((counterGoals / counterShots.length) * 100) : 0;
        
        const statsContainer = document.getElementById('player-stats-info');
        statsContainer.innerHTML = `
            <div class="stat-item">
                <div class="stat-number">${totalShots}</div>
                <div class="stat-label">Total Shots</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${goals}</div>
                <div class="stat-label">Goals</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${misses}</div>
                <div class="stat-label">Misses</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${accuracy}%</div>
                <div class="stat-label">Accuracy</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${staticShots.length}</div>
                <div class="stat-label">Static Play</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${staticAccuracy}%</div>
                <div class="stat-label">Static Accuracy</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${penaltyShots.length}</div>
                <div class="stat-label">Penalties (7m)</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${penaltyAccuracy}%</div>
                <div class="stat-label">Penalty Accuracy</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${counterShots.length}</div>
                <div class="stat-label">Counter Attacks</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${counterAccuracy}%</div>
                <div class="stat-label">Counter Accuracy</div>
            </div>
        `;
    },
    
    // Toggle all matches filter
    async toggleAllMatches() {
        AppState.selectedMatchFilters.clear();
        if (AppState.currentPlayer) {
            await this.loadPlayerStats(AppState.currentPlayer);
        }
    },
    
    // Toggle specific match filter
    async toggleMatchFilter(matchId) {
        if (AppState.selectedMatchFilters.has(matchId)) {
            AppState.selectedMatchFilters.delete(matchId);
        } else {
            AppState.selectedMatchFilters.add(matchId);
        }
        
        if (AppState.currentPlayer) {
            await this.updatePlayerStats(AppState.currentPlayer);
            await CanvasManager.loadShots(); // Reload shots with new filter
        }
    },
    
    // Load all matches page
    async loadAllMatches() {
        try {
            const matches = await DatabaseManager.getMatches();
            const teams = await DatabaseManager.getTeams();
            const teamMap = {};
            teams.forEach(team => teamMap[team.id] = team.name);
            
            const matchesList = document.getElementById('all-matches-list');
            let html = '';
            
            matches.forEach(match => {
                const team1Name = teamMap[match.team1_id] || 'Unknown Team';
                const team2Name = teamMap[match.team2_id] || 'Unknown Team';
                html += `
                    <div class="list-item" onclick="MenuManager.viewMatchDetails(${match.id})">
                        <div>
                            <div style="font-weight: bold;">${match.name}</div>
                            <div style="color: #666; font-size: 0.9em;">${team1Name} vs ${team2Name}</div>
                        </div>
                        <span style="color: #666; font-size: 0.9em;">${new Date(match.date).toLocaleDateString()}</span>
                    </div>
                `;
            });
            
            if (matches.length === 0) {
                html = '<div class="list-item" style="text-align: center; color: #666;">No matches found</div>';
            }
            
            matchesList.innerHTML = html;
        } catch (error) {
            console.error('Error loading all matches:', error);
        }
    },
    
    // View match details
    async viewMatchDetails(matchId) {
        try {
            const match = await DatabaseManager.getMatch(matchId);
            if (match) {
                this.showSection('match-registration-section', match);
            }
        } catch (error) {
            console.error('Error viewing match details:', error);
        }
    },
    
    // Reset shot points
    resetShot() {
        CanvasManager.resetCurrentShot();
        this.updateShotTypeButtons();
    },
    
    // Toggle penalty shot mode
    togglePenalty() {
        if (!CanvasManager.isPenaltyButtonEnabled()) return;
        
        const currentType = CanvasManager.getCurrentShotType();
        const newType = currentType === 'penalty' ? 'static' : 'penalty';
        CanvasManager.setShotType(newType);
        this.updateShotTypeButtons();
    },
    
    // Toggle counter attack mode
    toggleCounter() {
        if (!CanvasManager.isCounterButtonEnabled()) return;
        
        const currentType = CanvasManager.getCurrentShotType();
        const newType = currentType === 'counter' ? 'static' : 'counter';
        CanvasManager.setShotType(newType);
        this.updateShotTypeButtons();
    },
    
    // Update shot type button states
    updateShotTypeButtons() {
        const penaltyBtn = document.getElementById('penalty-btn');
        const counterBtn = document.getElementById('counter-btn');
        
        if (!penaltyBtn || !counterBtn) return;
        
        const currentType = CanvasManager.getCurrentShotType();
        const penaltyEnabled = CanvasManager.isPenaltyButtonEnabled();
        const counterEnabled = CanvasManager.isCounterButtonEnabled();
        
        // Update penalty button
        penaltyBtn.disabled = !penaltyEnabled;
        penaltyBtn.style.opacity = penaltyEnabled ? '1' : '0.5';
        penaltyBtn.style.background = currentType === 'penalty' ? '#dc3545' : '#ff6b6b';
        penaltyBtn.style.borderColor = currentType === 'penalty' ? '#dc3545' : '#ff6b6b';
        
        // Update counter button
        counterBtn.disabled = !counterEnabled;
        counterBtn.style.opacity = counterEnabled ? '1' : '0.5';
        counterBtn.style.background = currentType === 'counter' ? '#155724' : '#28a745';
        counterBtn.style.borderColor = currentType === 'counter' ? '#155724' : '#28a745';
    },
    
    // Toggle all shot types filter
    async toggleAllShotTypes() {
        AppState.selectedShotTypeFilters.clear();
        if (AppState.currentPlayer) {
            await this.loadPlayerStats(AppState.currentPlayer);
        }
    },
    
    // Toggle specific shot type filter
    async toggleShotTypeFilter(shotType) {
        if (AppState.selectedShotTypeFilters.has(shotType)) {
            AppState.selectedShotTypeFilters.delete(shotType);
        } else {
            AppState.selectedShotTypeFilters.add(shotType);
        }
        
        if (AppState.currentPlayer) {
            await this.updatePlayerStats(AppState.currentPlayer);
            await CanvasManager.loadShots(); // Reload shots with new filter
        }
        
        // Update UI
        this.updateShotTypeFiltersUI();
    },
    
    // Update shot type filters UI
    updateShotTypeFiltersUI() {
        const allShotsItem = document.querySelector('#shot-type-filters-list .match-filter-item:first-child');
        const filterItems = document.querySelectorAll('#shot-type-filters-list .match-filter-item:not(:first-child)');
        
        const hasActiveFilters = AppState.selectedShotTypeFilters.size > 0;
        
        // Update "All Shots" item
        if (allShotsItem) {
            const checkbox = allShotsItem.querySelector('input[type="checkbox"]');
            const isAllSelected = !hasActiveFilters;
            
            allShotsItem.classList.toggle('selected', isAllSelected);
            checkbox.checked = isAllSelected;
        }
        
        // Update individual filter items
        filterItems.forEach(item => {
            const shotType = item.onclick.toString().match(/'([^']+)'/)?.[1];
            if (shotType) {
                const isSelected = AppState.selectedShotTypeFilters.has(shotType);
                const checkbox = item.querySelector('input[type="checkbox"]');
                
                item.classList.toggle('selected', isSelected);
                checkbox.checked = isSelected;
            }
        });
    }
};