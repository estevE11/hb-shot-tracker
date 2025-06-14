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
    currentShot: {
        points: [], // Array of {x, y} points (max 3)
        isComplete: false
    },
    
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
        this.canvas.addEventListener('click', this.onClick.bind(this));
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
        const render = () => {
            this.render();
            if (AppState.currentSection === 'match-registration-section' || 
                AppState.currentSection === 'player-stats-section') {
                requestAnimationFrame(render);
            }
        };
        requestAnimationFrame(render);
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
        const p0 = this.pitchToCanvas(shot.points[0].x, shot.points[0].y);
        const p1 = this.pitchToCanvas(shot.points[1].x, shot.points[1].y);
        const p2 = this.pitchToCanvas(shot.points[2].x, shot.points[2].y);
        
        // Draw trajectory
        this.ctx.beginPath();
        this.ctx.moveTo(p0.x, p0.y);
        this.ctx.lineTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.strokeStyle = shot.goal ? 'green' : 'red';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Draw points
        this.renderCircle(p0.x, p0.y, '#FF5722'); // Orange
        this.renderCircle(p1.x, p1.y, '#2196F3'); // Blue
        this.renderCircle(p2.x, p2.y, '#FF9800'); // Amber
        
        // Draw player number
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText(shot.playerNumber, p0.x - 10, p0.y - 10);
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.strokeText(shot.playerNumber, p0.x - 10, p0.y - 10);
    },
    
    // Render current shot being registered
    renderCurrentShot() {
        const points = this.currentShot.points;
        
        // Draw points that have been clicked
        points.forEach((point, index) => {
            const canvasPoint = this.pitchToCanvas(point.x, point.y);
            const colors = ['#FF5722', '#2196F3', '#FF9800']; // Orange, Blue, Amber
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
    onClick(e) {
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
        
        // If we have 3 points, save the shot
        if (this.currentShot.points.length === 3) {
            this.saveCurrentShot();
        }
    },
    
    // Save current shot to database and add to shots list
    async saveCurrentShot() {
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
                true // All shots are goals for now
            );
            
            // Add to shots list for immediate rendering
            this.shotsList.push({
                points: [...this.currentShot.points],
                goal: true,
                playerNumber: playerNumber
            });
            
        } catch (error) {
            console.error('Error saving shot:', error);
        }
        
        // Reset current shot
        this.resetCurrentShot();
    },
    
    // Reset current shot
    resetCurrentShot() {
        this.currentShot.points = [];
        this.currentShot.isComplete = false;
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
                    points: [
                        { x: Number(shot.x0), y: Number(shot.y0) },
                        { x: Number(shot.x1), y: Number(shot.y1) },
                        { x: Number(shot.x2), y: Number(shot.y2) }
                    ],
                    goal: shot.goal,
                    playerNumber: shot.player_number
                }));
            } catch (error) {
                console.error('Error loading shots:', error);
            }
        } else if (AppState.currentSection === 'player-stats-section' && AppState.currentPlayer) {
            // Load shots for current player (this section already filters by player)
            try {
                const matchIds = AppState.selectedMatchFilters.size > 0 ? 
                    Array.from(AppState.selectedMatchFilters) : null;
                    
                const shots = await DatabaseManager.getShotsForPlayer(
                    AppState.currentPlayer.teamId, 
                    AppState.currentPlayer.playerNumber, 
                    matchIds
                );
                
                this.shotsList = shots.map(shot => ({
                    points: [
                        { x: Number(shot.x0), y: Number(shot.y0) },
                        { x: Number(shot.x1), y: Number(shot.y1) },
                        { x: Number(shot.x2), y: Number(shot.y2) }
                    ],
                    goal: shot.goal,
                    playerNumber: shot.player_number
                }));
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
    }
}; 