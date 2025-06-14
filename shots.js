// Application state management
const AppState = {
    // Current section and navigation
    currentSection: 'menu-section',
    currentTeam: null,
    currentMatch: null,
    currentPlayer: null,
    selectedMatchFilters: new Set(),
    selectedShotTypeFilters: new Set(), // For filtering by shot type in player stats
    currentMatchTeam: 1, // 1 for team1, 2 for team2
    
    // Player selection
    selectedPlayerIndex: null,
    gridNumbers: [] // Will be loaded dynamically for each team
};

// Application manager - coordinates all modules
const App = {
    // Initialize the application
    async init() {
        try {
            // Initialize all modules
            const dbInitialized = await DatabaseManager.init();
            if (!dbInitialized) {
                throw new Error('Database initialization failed');
            }
            
            CanvasManager.init();
            MenuManager.init();
            
            // Load initial section
            MenuManager.showSection('menu-section');
            
        } catch (error) {
            console.error('Application initialization error:', error);
        }
    }
};

// Global function references for HTML onclick handlers
// Navigation functions
function showSection(sectionId, data = null) {
    MenuManager.showSection(sectionId, data);
}

function goBackToTeamDetail() {
    MenuManager.goBackToTeamDetail();
}

// Team management functions
function addTeam() {
    MenuManager.addTeam();
}

function addMatch() {
    MenuManager.addMatch();
}

function createMatchFromModal() {
    MenuManager.createMatchFromModal();
}

function showPlayerStats(teamId, playerNumber, teamName) {
    MenuManager.showPlayerStats(teamId, playerNumber, teamName);
}

// Match registration functions
function swapTeam() {
    MenuManager.swapTeam();
}

function selectPlayer(index) {
    MenuManager.selectPlayer(index);
}

function resetShot() {
    MenuManager.resetShot();
}

function togglePenalty() {
    MenuManager.togglePenalty();
}

function toggleCounter() {
    MenuManager.toggleCounter();
}

// Player stats functions
function toggleAllMatches() {
    MenuManager.toggleAllMatches();
}

function toggleMatchFilter(matchId) {
    MenuManager.toggleMatchFilter(matchId);
}

function toggleAllShotTypes() {
    MenuManager.toggleAllShotTypes();
}

function toggleShotTypeFilter(shotType) {
    MenuManager.toggleShotTypeFilter(shotType);
}

// Matches functions
function viewMatchDetails(matchId) {
    MenuManager.viewMatchDetails(matchId);
}

// Start the application when page loads
window.addEventListener('load', () => {
    App.init();
});