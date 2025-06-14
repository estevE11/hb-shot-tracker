// Canvas functionality and shot tracking
const CanvasManager = {
    // Canvas variables
    canvas: null,
    ctx: null,
    canvasWidth: 800,
    canvasHeight: 800,
    
    // Background image
    bg: new Image(),
    bgLoaded: false,
    
    // Shot data
    shotsList: [], // All shots to render
    currentShot: { points: [], isGoal: false, shotType: 'static' },
    isRenderLoopRunning: false,
    
    // Pitch boundaries
    pitchBounds: {
        x: 40,
        y: 55,
        w: 730,
        h: 730
    },
    
    // Initialize canvas manager
    init() {
        // Load background image
        this.bg.onload = () => {
            this.bgLoaded = true;
        };
        this.bg.onerror = () => {
            this.bgLoaded = false;
        };
        this.bg.src = 'hbpitch.png';
    },
    
    // Initialize canvas
    initializeCanvas(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        container.appendChild(this.canvas);
        
        this.resizeCanvas();
        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Start render loop
        this.startRenderLoop();
    },
    
    // Resize canvas
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        this.canvasWidth = Math.min(containerWidth, 800);
        this.canvasHeight = this.canvasWidth;
        
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        
        // Adjust pitch bounds
        this.pitchBounds.x = this.canvasWidth * 0.05;
        this.pitchBounds.y = this.canvasHeight * 0.07;
        this.pitchBounds.w = this.canvasWidth * 0.91;
        this.pitchBounds.h = this.canvasHeight * 0.91;
    },
    
    // Start render loop
    startRenderLoop() {
        if (this.isRenderLoopRunning) return;
        this.isRenderLoopRunning = true;
        this.renderLoop();
    },
    
    // Main render loop
    renderLoop() {
        if (!this.canvas || !this.ctx) {
            this.isRenderLoopRunning = false;
            return;
        }
        
        this.render();
        
        if (this.isRenderLoopRunning) {
            requestAnimationFrame(() => this.renderLoop());
        }
    },
    
    // Main render function
    render() {
        if (!this.canvas || !this.ctx) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.drawBackground();
        
        // Render all shots in the list
        this.shotsList.forEach(shot => {
            this.renderShot(shot);
        });
        
        // Render current shot being registered
        this.renderCurrentShot();
    },
    
    // Draw background
    drawBackground() {
        if (this.bgLoaded && this.bg.complete) {
            const ratio = this.bg.height / this.bg.width;
            const scaledHeight = this.canvas.width * ratio;
            this.ctx.drawImage(this.bg, 0, 0, this.canvas.width, scaledHeight);
        } else {
            // Fallback green field
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Field boundaries
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(this.pitchBounds.x, this.pitchBounds.y, this.pitchBounds.w, this.pitchBounds.h);
            
            // Center line
            this.ctx.beginPath();
            this.ctx.moveTo(this.pitchBounds.x, this.pitchBounds.y + this.pitchBounds.h / 2);
            this.ctx.lineTo(this.pitchBounds.x + this.pitchBounds.w, this.pitchBounds.y + this.pitchBounds.h / 2);
            this.ctx.stroke();
            
            // Center circle
            this.ctx.beginPath();
            this.ctx.arc(this.pitchBounds.x + this.pitchBounds.w / 2, this.pitchBounds.y + this.pitchBounds.h / 2, 50, 0, 2 * Math.PI);
            this.ctx.stroke();
        }
    },
    
    // Render a completed shot
    renderShot(shot) {
        const p0 = this.pitchToCanvas(shot.x0, shot.y0);
        const p1 = this.pitchToCanvas(shot.x1, shot.y1);
        const p2 = this.pitchToCanvas(shot.x2, shot.y2);
        
        // Shot line color based on type
        let shotColor = '#2196F3'; // Default blue for static
        if (shot.shot_type === 'penalty') {
            shotColor = '#FF5722'; // Red for penalty
        } else if (shot.shot_type === 'counter') {
            shotColor = '#4CAF50'; // Green for counter
        }
        
        // Draw trajectory
        this.ctx.beginPath();
        this.ctx.moveTo(p0.x, p0.y);
        this.ctx.lineTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.strokeStyle = shot.goal ? 'green' : 'red';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Draw points with shot type colors
        this.renderCircle(p0.x, p0.y, shotColor); // Start point with shot type color
        this.renderCircle(p1.x, p1.y, '#2196F3'); // Blue for mid point
        this.renderCircle(p2.x, p2.y, '#FF9800'); // Amber for target
        
        // Draw player number
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText(shot.player_number, p0.x - 10, p0.y - 10);
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.strokeText(shot.player_number, p0.x - 10, p0.y - 10);
    },
    
    // Render current shot being registered
    renderCurrentShot() {
        const points = this.currentShot.points;
        
        // Shot type color
        let shotColor = '#2196F3'; // Default blue for static
        if (this.currentShot.shotType === 'penalty') {
            shotColor = '#FF5722'; // Red for penalty
        } else if (this.currentShot.shotType === 'counter') {
            shotColor = '#4CAF50'; // Green for counter
        }
        
        // Draw points that have been clicked
        points.forEach((point, index) => {
            const canvasPoint = this.pitchToCanvas(point.x, point.y);
            const colors = [shotColor, '#2196F3', '#FF9800']; // Start with shot type color, then Blue, Amber
            this.renderCircle(canvasPoint.x, canvasPoint.y, colors[index]);
        });
        
        // Draw lines between points
        if (points.length >= 2) {
            const p0 = this.pitchToCanvas(points[0].x, points[0].y);
            const p1 = this.pitchToCanvas(points[1].x, points[1].y);
            
            this.ctx.beginPath();
            this.ctx.moveTo(p0.x, p0.y);
            this.ctx.lineTo(p1.x, p1.y);
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        if (points.length >= 3) {
            const p1 = this.pitchToCanvas(points[1].x, points[1].y);
            const p2 = this.pitchToCanvas(points[2].x, points[2].y);
            
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    },
    
    // Render a circle
    renderCircle(x, y, color = 'red') {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    },
    
    // Handle canvas clicks
    handleCanvasClick(e) {
        if (AppState.selectedPlayerIndex === null) {
            alert('Please select a player number before registering a shot.');
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const pitchCoords = this.canvasToPitch(x, y);
        
        // Check if click is within pitch bounds
        if (pitchCoords.x < 0 || pitchCoords.x > 1 || pitchCoords.y < 0 || pitchCoords.y > 1) {
            return;
        }
        
        // Add point to current shot
        this.currentShot.points.push(pitchCoords);
        
        // Check if shot is complete
        const isPenalty = this.currentShot.shotType === 'penalty';
        const requiredPoints = isPenalty ? 1 : 3;
        
        if (this.currentShot.points.length >= requiredPoints) {
            this.completePenaltyShot();
        }
    },
    
    // Complete penalty shot with fixed center point
    completePenaltyShot() {
        if (this.currentShot.shotType === 'penalty' && this.currentShot.points.length === 1) {
            // Fixed center coordinates (center of the canvas/pitch)
            const centerX = 0.5; // Center X in pitch coordinates
            const centerY = 0.79; // Center Y in pitch coordinates
            
            // Create complete shot with fixed penalty points + user target
            const userPoint = this.currentShot.points[0];
            this.currentShot.points = [
                { x: centerX, y: centerY },     // Start point (center)
                { x: centerX, y: centerY },     // Mid point (same as start for penalty)
                { x: userPoint.x, y: userPoint.y } // End point (user target)
            ];
        }
        
        // Check if it's a goal (you can customize this logic)
        const targetPoint = this.currentShot.points[2];
        this.currentShot.isGoal = this.isPointInGoal(targetPoint.x, targetPoint.y);
        
        // Save to database
        this.saveCurrentShot();
    },
    
    // Save current shot to database and add to shots list
    async saveCurrentShot() {
        if (this.currentShot.points.length < 3) return;
        
        const currentTeamId = AppState.currentMatchTeam === 1 ? 
            AppState.currentMatch.team1_id : AppState.currentMatch.team2_id;
        
        const playerNumber = AppState.gridNumbers[AppState.selectedPlayerIndex];
        
        // Save to database
        try {
            await DatabaseManager.addShot(
                AppState.currentMatch.id,
                currentTeamId,
                playerNumber,
                this.currentShot.points[0].x, this.currentShot.points[0].y,
                this.currentShot.points[1].x, this.currentShot.points[1].y,
                this.currentShot.points[2].x, this.currentShot.points[2].y,
                this.currentShot.isGoal,
                this.currentShot.shotType
            );
            
            // Add to shots list for immediate rendering
            this.shotsList.push({
                x0: this.currentShot.points[0].x,
                y0: this.currentShot.points[0].y,
                x1: this.currentShot.points[1].x,
                y1: this.currentShot.points[1].y,
                x2: this.currentShot.points[2].x,
                y2: this.currentShot.points[2].y,
                goal: this.currentShot.isGoal,
                player_number: playerNumber,
                shot_type: this.currentShot.shotType
            });
            
        } catch (error) {
            console.error('Error saving shot:', error);
        }
        
        // Reset current shot
        this.resetCurrentShot();
    },
    
    // Check if point is in goal area (customize as needed)
    isPointInGoal(x, y) {
        // Simple goal detection - you can adjust this logic
        return x > 0.8 && y > 0.3 && y < 0.7;
    },
    
    // Reset current shot
    resetCurrentShot() {
        this.currentShot = { points: [], isGoal: false, shotType: 'static' };
    },
    
    // Load shots for current context
    async loadShots() {
        this.shotsList = [];
        
        if (AppState.currentSection === 'match-registration-section' && AppState.currentMatch) {
            // Only load shots if a player is selected
            if (AppState.selectedPlayerIndex === null) {
                return; // No player selected, show no shots
            }
            
            // Load shots for current match, team, and selected player only
            const currentTeamId = AppState.currentMatchTeam === 1 ? 
                AppState.currentMatch.team1_id : AppState.currentMatch.team2_id;
            
            const selectedPlayerNumber = AppState.gridNumbers[AppState.selectedPlayerIndex];
            
            try {
                const shots = await DatabaseManager.getShotsForMatch(AppState.currentMatch.id, currentTeamId);
                // Filter to only show shots from the selected player
                const playerShots = shots.filter(shot => shot.player_number === selectedPlayerNumber);
                
                this.shotsList = playerShots.map(shot => ({
                    x0: Number(shot.x0),
                    y0: Number(shot.y0),
                    x1: Number(shot.x1),
                    y1: Number(shot.y1),
                    x2: Number(shot.x2),
                    y2: Number(shot.y2),
                    goal: shot.goal,
                    player_number: shot.player_number,
                    shot_type: shot.shot_type
                }));
            } catch (error) {
                console.error('Error loading shots:', error);
            }
        } else if (AppState.currentSection === 'player-stats-section' && AppState.currentPlayer) {
            // Load shots for current player (this section already filters by player)
            try {
                const matchIds = AppState.selectedMatchFilters.size > 0 ? 
                    Array.from(AppState.selectedMatchFilters) : null;
                    
                const shotTypes = AppState.selectedShotTypeFilters && AppState.selectedShotTypeFilters.size > 0 ?
                    Array.from(AppState.selectedShotTypeFilters) : null;
                
                this.shotsList = await DatabaseManager.getShotsForPlayer(
                    AppState.currentPlayer.teamId, 
                    AppState.currentPlayer.playerNumber, 
                    matchIds,
                    shotTypes
                );
            } catch (error) {
                console.error('Error loading player shots:', error);
            }
        }
    },
    
    // Coordinate conversion functions
    canvasToPitch(x, y) {
        return {
            x: (x - this.pitchBounds.x) / this.pitchBounds.w,
            y: (y - this.pitchBounds.y) / this.pitchBounds.h
        };
    },
    
    pitchToCanvas(x, y) {
        return {
            x: x * this.pitchBounds.w + this.pitchBounds.x,
            y: y * this.pitchBounds.h + this.pitchBounds.y
        };
    },
    
    // Set shot type (called by UI buttons)
    setShotType(type) {
        // Only allow setting shot type if no points are registered yet
        if (this.currentShot.points.length === 0) {
            this.currentShot.shotType = type;
        }
    },
    
    // Get current shot type
    getCurrentShotType() {
        return this.currentShot.shotType;
    },
    
    // Check if penalty button should be enabled
    isPenaltyButtonEnabled() {
        return this.currentShot.points.length === 0;
    },
    
    // Check if counter button should be enabled
    isCounterButtonEnabled() {
        return this.currentShot.points.length === 0 && this.currentShot.shotType !== 'penalty';
    }
}; 