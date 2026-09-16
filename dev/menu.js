const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
// Menu and navigation functionality
const MenuManager = {
    // Initialize menu system
    init() {
        // Make dynamically rendered list actions keyboard accessible.
        new MutationObserver(() => {
            document.querySelectorAll('.list-item[onclick], .match-filter-item[onclick]').forEach(item => {
                item.tabIndex = 0;
                item.setAttribute('role', 'button');
                if (item.classList.contains('match-filter-item')) {
                    item.setAttribute('aria-pressed', item.classList.contains('selected'));
                    const checkbox = item.querySelector('input');
                    if (checkbox) { checkbox.tabIndex = -1; checkbox.setAttribute('aria-hidden', 'true'); }
                }
                item.onkeydown = event => {
                    if (event.target === item && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); item.click(); }
                };
            });
        }).observe(document.querySelector('main'), {childList: true, subtree: true});
    },
    
    // Show a specific section
    showSection(sectionId, data = null) {
        if (CanvasManager.saving) return;
        if (sectionId !== AppState.currentSection) {
            CanvasManager.resetCurrentShot();
            AppState.highlightedShotId = null;
            AppState.hoveredShotId = null;
            if (sectionId === 'match-registration-section') AppState.selectedPlayerIndex = null;
            if (sectionId === 'player-stats-section') {
                AppState.selectedMatchFilters.clear();
                AppState.selectedShotTypeFilters.clear();
            }
        }
        window.scrollTo(0, 0);
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show selected section
        document.getElementById(sectionId).classList.add('active');
        AppState.currentSection = sectionId;
        
        // Load section-specific data
        switch(sectionId) {
            case 'menu-section':
                this.loadHome();
                break;
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
                const teamJson = escapeHTML(JSON.stringify(team));
                html += `
                    <div class="list-item" onclick="MenuManager.showSection('team-detail-section', ${teamJson})">
                        <span>${escapeHTML(team.name)}</span>
                        <span style="color: #666; font-size: 0.9em;">${new Date(team.created_at).toLocaleDateString()}</span>
                    </div>
                `;
            });
            
            teamsList.innerHTML = html;
        } catch (error) {
            console.error('Error loading teams:', error);
        }
    },
    
    async loadHome() {
        const [teams, matches] = await Promise.all([DatabaseManager.getTeams(), DatabaseManager.getMatches()]);
        document.getElementById('home-team-count').textContent = `${teams.length} teams in your roster`;
        document.getElementById('home-match-count').textContent = `${matches.length} matches recorded`;
        const names = Object.fromEntries(teams.map(team => [team.id, team.name]));
        document.getElementById('recent-matches').innerHTML = matches.length ? matches.slice(0, 3).map(match => `<div class="list-item" onclick="MenuManager.viewMatchDetails(${match.id})"><div><strong>${escapeHTML(match.name)}</strong><p class="preview-roster">${escapeHTML(names[match.team1_id] || 'Team 1')} vs ${escapeHTML(names[match.team2_id] || 'Team 2')}</p></div><span>${new Date(match.date).toLocaleDateString()} ↗</span></div>`).join('') : '<div class="empty-state"><strong>Your next match starts here.</strong>Add two teams to your roster, then create a match to start tracking.</div>';
    },

    addTeam() { this.openTeamModal(''); },

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message; toast.hidden = false;
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
    },

    openDialog(id, content) {
        document.getElementById(id)?.remove();
        const dialog = document.createElement('dialog');
        dialog.id = id;
        dialog.innerHTML = content;
        dialog.setAttribute('aria-labelledby', `${id}-title`);
        dialog.addEventListener('close', () => dialog.remove());
        document.body.append(dialog);
        dialog.showModal();
        return dialog;
    },

    // Edit current team
    async editCurrentTeam() {
        if (!AppState.currentTeam) return;
        const team = AppState.currentTeam;
        const players = await DatabaseManager.getTeamPlayers(team.id);
        const playerNumbers = players.map(p => p.number).sort((a, b) => a - b).join(',');
        
        this.openTeamModal(team.name, playerNumbers, team.id);
    },
    
    // Create/Edit team modal
    openTeamModal(teamName, initialPlayers = '1,2,3,4,5,6,7,8,9,10', teamId = null) {
        const dialog = this.openDialog('team-modal', `<form id="team-form"><h2 id="team-modal-title">${teamId ? 'Edit team' : 'Build your roster'}</h2><p>Add a team and its shirt numbers. You can update these later.</p><label for="team-modal-name">Team name</label><input id="team-modal-name" required maxlength="80" placeholder="e.g. Barcelona" value="${escapeHTML(teamName)}"><label for="player-numbers">Shirt numbers</label><input id="player-numbers" required value="${escapeHTML(initialPlayers)}" aria-describedby="player-preview"><div id="player-preview" class="preview-roster">Separate numbers with commas. Use 1–99.<br><span id="preview-text"></span></div><div class="form-error" role="alert"></div><div class="modal-actions"><button type="button" class="back-btn" onclick="this.closest('dialog').close()">Cancel</button><button class="primary-btn" type="submit">${teamId ? 'Save changes' : 'Create team'}</button></div></form>`);
        dialog.querySelector('form').onsubmit = event => { event.preventDefault(); this.saveTeamFromModal(teamId); };
        const input = dialog.querySelector('#player-numbers');
        input.oninput = () => { dialog.querySelector('#preview-text').textContent = this.parsePlayerNumbers(input.value).join(' · '); };
        input.oninput();
    },

    // Parse player numbers from input
    parsePlayerNumbers(input) {
        return input.split(',')
            .map(num => /^\d+$/.test(num.trim()) ? Number(num.trim()) : NaN)
            .filter(num => Number.isInteger(num) && num > 0 && num <= 99)
            .sort((a, b) => a - b)
            .filter((num, index, arr) => arr.indexOf(num) === index); // Remove duplicates
    },
    
    // Save team from modal (handles both Create and Update)
    async saveTeamFromModal(teamId = null) {
        const teamName = document.getElementById('team-modal-name').value;
        const input = document.getElementById('player-numbers').value;
        const playerNumbers = this.parsePlayerNumbers(input);
        const submit = document.querySelector('#team-modal [type=submit]');
        if (submit.disabled) return;
        
        if (!teamName || !teamName.trim()) {
            document.querySelector('#team-modal .form-error').textContent = 'Please enter a team name.';
            return;
        }
        
        if (playerNumbers.length === 0) {
            document.querySelector('#team-modal .form-error').textContent = 'Enter at least one shirt number between 1 and 99.';
            return;
        }
        
        submit.disabled = true;
        try {
            if (teamId) {
                // Update existing team
                await DatabaseManager.updateTeam(teamId, teamName, playerNumbers);
                // Update AppState if it's the current team
                if (AppState.currentTeam && AppState.currentTeam.id === teamId) {
                    AppState.currentTeam.name = teamName;
                }
            } else {
                // Create new team
                await DatabaseManager.addTeam(teamName, playerNumbers);
            }
            
            // Remove modal
            const modal = document.getElementById('team-modal');
            if (modal) modal.close();
            
            // Reload views
            if (teamId && AppState.currentSection === 'team-detail-section') {
                this.loadTeamDetail(AppState.currentTeam);
            } else {
                this.showSection('teams-section');
            }
        } catch (error) {
            console.error('Error saving team:', error);
            document.querySelector('#team-modal .form-error').textContent = 'Could not save this team. Please try again.';
            submit.disabled = false;
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
                    <button class="player-btn" onclick="MenuManager.showPlayerStats(${team.id}, ${number}, AppState.currentTeam.name)">
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
                const matchJson = escapeHTML(JSON.stringify(match));
                matchesHtml += `
                    <div class="list-item" onclick="MenuManager.showSection('match-registration-section', ${matchJson})">
                        <div>
                            <div style="font-weight: bold;">${escapeHTML(match.name)}</div>
                            <div style="color: #666; font-size: 0.9em;">vs ${escapeHTML(opponent)}</div>
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
    
    async addMatch() {
        const teams = await DatabaseManager.getTeams();
        if (teams.length < 2) {
            this.showSection('teams-section');
            this.showToast('Add two teams before starting your first match.');
            return;
        }
        this.createMatchModal('', teams);
    },

    createMatchModal(matchName, teams) {
        const options = teams.map(team => `<option value="${team.id}">${escapeHTML(team.name)}</option>`).join('');
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        const dialog = this.openDialog('match-modal', `<form><h2 id="match-modal-title">Start a match</h2><p>Set up the fixture, then jump straight into tracking.</p><label for="match-name">Match name</label><input id="match-name" required maxlength="100" placeholder="e.g. Saturday league · Round 4"><label for="team1-select">Your team</label><select id="team1-select">${options}</select><label for="team2-select">Opponent</label><select id="team2-select">${options}</select><label for="match-date">Match date</label><input id="match-date" type="date" required value="${date}"><div class="form-error" role="alert"></div><div class="modal-actions"><button type="button" class="back-btn" onclick="this.closest('dialog').close()">Cancel</button><button class="primary-btn" type="submit">Start tracking →</button></div></form>`);
        const first = dialog.querySelector('#team1-select');
        const second = dialog.querySelector('#team2-select');
        first.value = AppState.currentTeam?.id || teams[0].id;
        second.value = teams.find(team => team.id !== Number(first.value)).id;
        dialog.querySelector('form').onsubmit = event => { event.preventDefault(); this.createMatchFromModal(); };
    },

    async createMatchFromModal() {
        const dialog = document.getElementById('match-modal');
        const team1Id = Number(dialog.querySelector('#team1-select').value);
        const team2Id = Number(dialog.querySelector('#team2-select').value);
        const name = dialog.querySelector('#match-name').value.trim();
        const date = dialog.querySelector('#match-date').value;
        if (team1Id === team2Id || !name || !date) {
            dialog.querySelector('.form-error').textContent = 'Enter a name, date, and two different teams.';
            return;
        }
        const submit = dialog.querySelector('[type=submit]');
        submit.disabled = true;
        try {
            const id = await DatabaseManager.addMatch(team1Id, team2Id, name, date + 'T12:00:00');
            AppState.currentTeam = await DatabaseManager.getTeam(team1Id);
            dialog.close();
            this.showSection('match-registration-section', await DatabaseManager.getMatch(id));
        } catch (error) {
            dialog.querySelector('.form-error').textContent = 'Could not save this match. Please try again.';
            submit.disabled = false;
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
                <div class="team-switch"><strong>${escapeHTML(currentTeamData.name)}</strong><button class="text-btn" onclick="MenuManager.swapTeam()">⇄ ${escapeHTML(otherTeamData.name)}</button></div>
            `;
            
            playerNumbers.forEach((number, index) => {
                const selectedClass = (index === AppState.selectedPlayerIndex) ? 'selected' : '';
                playersHtml += `
                    <button class="player-btn ${selectedClass}" aria-pressed="${index === AppState.selectedPlayerIndex}" onclick="MenuManager.selectPlayer(${index})">
                        ${number}
                    </button>
                `;
            });
            
            playersGrid.innerHTML = playersHtml;
            
            // Initialize canvas and load shots
            CanvasManager.initializeCanvas('canvas-container');
            await CanvasManager.loadShots();
            
            // Initialize status and shot list
            CanvasManager.updateStatus();
            await this.updateMatchShotList();
            
            // Initialize shot type buttons
            this.updateShotTypeButtons();
        } catch (error) {
            console.error('Error loading match registration:', error);
        }
    },
    
    // Swap teams in match
    swapTeam() {
        if (CanvasManager.saving) return;
        AppState.currentMatchTeam = AppState.currentMatchTeam === 1 ? 2 : 1;
        AppState.selectedPlayerIndex = null; // Reset player selection when swapping teams
        AppState.highlightedShotId = null; // Reset highlight
        CanvasManager.resetCurrentShot(); // Reset current shot when swapping teams
        this.loadMatchRegistration(AppState.currentMatch);
    },
    
    // Select player
    selectPlayer(index) {
        if (CanvasManager.saving) return;
        CanvasManager.resetCurrentShot();
        AppState.selectedPlayerIndex = index;
        AppState.highlightedShotId = null; // Reset highlight
        
        // If we're already in registration section, just refresh the components
        if (AppState.currentSection === 'match-registration-section') {
            this.refreshMatchRegistration();
        } else {
            this.loadMatchRegistration(AppState.currentMatch);
        }
    },

    // Refresh only the necessary parts of the registration view
    async refreshMatchRegistration() {
        try {
            const match = AppState.currentMatch;
            const team1 = await DatabaseManager.getTeam(match.team1_id);
            const team2 = await DatabaseManager.getTeam(match.team2_id);
            const currentTeamId = AppState.currentMatchTeam === 1 ? match.team1_id : match.team2_id;
            const currentTeamPlayers = await DatabaseManager.getTeamPlayers(currentTeamId);
            const playerNumbers = currentTeamPlayers.map(p => p.number).sort((a, b) => a - b);
            
            AppState.gridNumbers = playerNumbers;
            
            // Refresh player buttons
            const playersGrid = document.getElementById('match-players-grid');
            const currentTeamData = AppState.currentMatchTeam === 1 ? team1 : team2;
            const otherTeamData = AppState.currentMatchTeam === 1 ? team2 : team1;
            
            let playersHtml = `
                <div class="team-switch"><strong>${escapeHTML(currentTeamData.name)}</strong><button class="text-btn" onclick="MenuManager.swapTeam()">⇄ ${escapeHTML(otherTeamData.name)}</button></div>
            `;
            
            playerNumbers.forEach((number, index) => {
                const selectedClass = (index === AppState.selectedPlayerIndex) ? 'selected' : '';
                playersHtml += `
                    <button class="player-btn ${selectedClass}" aria-pressed="${index === AppState.selectedPlayerIndex}" onclick="MenuManager.selectPlayer(${index})">
                        ${number}
                    </button>
                `;
            });
            playersGrid.innerHTML = playersHtml;

            // Refresh shots and status
            await CanvasManager.loadShots();
            CanvasManager.updateStatus();
            await this.updateMatchShotList();
        } catch (error) {
            console.error('Error refreshing match registration:', error);
        }
    },

    // Update the shot list for the current player in match registration
    async updateMatchShotList() {
        const listContainer = document.getElementById('match-shot-list');
        if (!listContainer) return;

        if (AppState.selectedPlayerIndex === null) {
            listContainer.innerHTML = '<div class="list-item" style="text-align: center; color: #666;">Select a player to see their history</div>';
            return;
        }

        const currentTeamId = AppState.currentMatchTeam === 1 ? 
            AppState.currentMatch.team1_id : AppState.currentMatch.team2_id;
        const playerNumber = AppState.gridNumbers[AppState.selectedPlayerIndex];

        try {
            const shots = await DatabaseManager.getShotsForMatch(AppState.currentMatch.id, currentTeamId);
            const playerShots = shots.filter(shot => shot.player_number === playerNumber)
                                     .sort((a, b) => b.created_at - a.created_at);

            if (playerShots.length === 0) {
                listContainer.innerHTML = '<div class="list-item" style="text-align: center; color: #666;">No shots recorded yet</div>';
                return;
            }

            let html = '';
            playerShots.forEach(shot => {
                const typeLabel = shot.shot_type === 'penalty' ? '7m' : 
                                 shot.shot_type === 'counter' ? 'Fast' : 'Static';
                const resultLabel = shot.goal ? 'GOAL' : 'MISS';
                const resultColor = shot.goal ? '#28a745' : '#dc3545';
                const isHighlighted = AppState.highlightedShotId === shot.id;
                
                html += `
                    <div class="list-item" 
                         style="background: ${isHighlighted ? '#e7f3ff' : 'white'}" 
                         onclick="highlightShot(${shot.id})"
                         onmouseenter="hoverShot(${shot.id})"
                         onmouseleave="hoverShot(null)">
                        <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                            <span style="font-weight: bold; width: 50px;">${typeLabel}</span>
                            <span style="color: ${resultColor}; font-weight: bold; width: 60px;">${resultLabel}</span>
                            <span style="color: #666; font-size: 0.8em;">${new Date(shot.created_at).toLocaleTimeString()}</span>
                        </div>
                        <button onclick="event.stopPropagation(); deleteShot(${shot.id})" 
                                style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
                            Delete
                        </button>
                    </div>
                `;
            });
            listContainer.innerHTML = html;
        } catch (error) {
            console.error('Error updating match shot list:', error);
        }
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
                        <span>${escapeHTML(match.name)} vs ${escapeHTML(opponent)}</span>
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
                matchIds,
                AppState.selectedShotTypeFilters.size ? Array.from(AppState.selectedShotTypeFilters) : null
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
            <p class="breakdown">Static: ${staticGoals}/${staticShots.length} · ${staticAccuracy}% &nbsp; / &nbsp; 7m: ${penaltyGoals}/${penaltyShots.length} · ${penaltyAccuracy}% &nbsp; / &nbsp; Fast break: ${counterGoals}/${counterShots.length} · ${counterAccuracy}%</p>
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
            await this.loadPlayerStats(AppState.currentPlayer);
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
                            <div style="font-weight: bold;">${escapeHTML(match.name)}</div>
                            <div style="color: #666; font-size: 0.9em;">${escapeHTML(team1Name)} vs ${escapeHTML(team2Name)}</div>
                        </div>
                        <span style="color: #666; font-size: 0.9em;">${new Date(match.date).toLocaleDateString()}</span>
                    </div>
                `;
            });
            
            if (matches.length === 0) {
                html = '<div class="list-item" style="text-align: center; color: #666;">No matches yet. Create a match to start tracking.</div>';
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
                AppState.currentTeam = await DatabaseManager.getTeam(match.team1_id);
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
        
        penaltyBtn.setAttribute('aria-pressed', currentType === 'penalty');
        counterBtn.setAttribute('aria-pressed', currentType === 'counter');
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