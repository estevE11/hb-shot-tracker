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
        
        // Check if canvas already exists in this container
        let canvas = container.querySelector('canvas');
        if (!canvas) {
            container.innerHTML = '';
            this.canvas = document.createElement('canvas');
            container.appendChild(this.canvas);
            
            this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
            this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        } else {
            this.canvas = canvas;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
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

        // Render Goal/Save popup if awaiting confirmation
        if (AppState.isAwaitingConfirmation && this.currentShot.points.length === 3) {
            this.renderGoalSavePopup();
        }
    },

    // Render the Goal/Save popup inside the canvas
    renderGoalSavePopup() {
        const lastPoint = this.currentShot.points[2];
        const canvasPoint = this.pitchToCanvas(lastPoint.x, lastPoint.y);
        
        const popupW = 120;
        const popupH = 40;
        
        // Ensure popup stays within canvas horizontal bounds
        const popupX = Math.max(10, Math.min(this.canvas.width - popupW - 10, canvasPoint.x - popupW / 2));
        
        // If near the top, show below the point, otherwise show above
        let popupY = canvasPoint.y - popupH - 15;
        if (popupY < 10) {
            popupY = canvasPoint.y + 15;
        }

        // Draw shadow/background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(popupX + 2, popupY + 2, popupW, popupH);

        // Draw Goal button (Green)
        this.ctx.fillStyle = '#28a745';
        this.ctx.fillRect(popupX, popupY, popupW / 2, popupH);
        
        // Draw Save button (Red)
        this.ctx.fillStyle = '#dc3545';
        this.ctx.fillRect(popupX + popupW / 2, popupY, popupW / 2, popupH);

        // Draw text
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('GOAL', popupX + popupW / 4, popupY + popupH / 2);
        this.ctx.fillText('SAVE', popupX + (3 * popupW) / 4, popupY + popupH / 2);

        // Draw borders
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(popupX, popupY, popupW, popupH);
        this.ctx.beginPath();
        this.ctx.moveTo(popupX + popupW / 2, popupY);
        this.ctx.lineTo(popupX + popupW / 2, popupY + popupH);
        this.ctx.stroke();

        // Reset text alignment
        this.ctx.textAlign = 'start';
        this.ctx.textBaseline = 'alphabetic';
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
        
        const isHighlighted = AppState.highlightedShotId === shot.id;
        const isHovered = AppState.hoveredShotId === shot.id;
        const shouldHighlight = isHighlighted || isHovered;
        
        // Draw trajectory
        this.ctx.beginPath();
        this.ctx.moveTo(p0.x, p0.y);
        this.ctx.lineTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.strokeStyle = shot.goal ? (shouldHighlight ? '#00FF00' : 'green') : (shouldHighlight ? '#FF0000' : 'red');
        this.ctx.lineWidth = shouldHighlight ? 6 : 3;
        
        if (shouldHighlight) {
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = 'white';
        }
        
        this.ctx.stroke();
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
        
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
            
            // Draw point number
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(index + 1, canvasPoint.x, canvasPoint.y);
        });
        
        // Reset text align for other renders
        this.ctx.textAlign = 'start';
        this.ctx.textBaseline = 'alphabetic';
        
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

        // Handle Goal/Save popup clicks
        if (AppState.isAwaitingConfirmation) {
            this.handleConfirmationClick(x, y);
            return;
        }
        
        const pitchCoords = this.canvasToPitch(x, y);
        
        // Check if click is within pitch bounds
        if (pitchCoords.x < 0 || pitchCoords.x > 1 || pitchCoords.y < 0 || pitchCoords.y > 1) {
            return;
        }
        
        // Add point to current shot
        this.currentShot.points.push(pitchCoords);
        this.updateStatus();
        
        // Check if shot is complete
        const isPenalty = this.currentShot.shotType === 'penalty';
        const requiredPoints = isPenalty ? 1 : 3;
        
        if (this.currentShot.points.length >= requiredPoints) {
            this.processShotCompletion();
        }
    },

    // Handle clicks on the Goal/Save buttons
    handleConfirmationClick(x, y) {
        const lastPoint = this.currentShot.points[2];
        const canvasPoint = this.pitchToCanvas(lastPoint.x, lastPoint.y);
        
        const popupW = 120;
        const popupH = 40;
        
        const popupX = Math.max(10, Math.min(this.canvas.width - popupW - 10, canvasPoint.x - popupW / 2));
        
        let popupY = canvasPoint.y - popupH - 15;
        if (popupY < 10) {
            popupY = canvasPoint.y + 15;
        }

        // Goal button (left half)
        if (x >= popupX && x <= popupX + popupW / 2 && y >= popupY && y <= popupY + popupH) {
            this.currentShot.isGoal = true;
            AppState.isAwaitingConfirmation = false;
            this.saveCurrentShot();
        } 
        // Save button (right half)
        else if (x > popupX + popupW / 2 && x <= popupX + popupW && y >= popupY && y <= popupY + popupH) {
            this.currentShot.isGoal = false;
            AppState.isAwaitingConfirmation = false;
            this.saveCurrentShot();
        }
    },

    // Logic for completing a shot registration
    processShotCompletion() {
        if (this.currentShot.shotType === 'penalty' && this.currentShot.points.length === 1) {
            const centerX = 0.5;
            const centerY = 0.79;
            const userPoint = this.currentShot.points[0];
            this.currentShot.points = [
                { x: centerX, y: centerY },
                { x: centerX, y: centerY },
                { x: userPoint.x, y: userPoint.y }
            ];
        }
        
        const targetPoint = this.currentShot.points[2];
        
        // Only show popup if it's in the goal area
        if (this.isPointInGoal(targetPoint.x, targetPoint.y)) {
            AppState.isAwaitingConfirmation = true;
            this.updateStatus();
        } else {
            this.currentShot.isGoal = false;
            this.saveCurrentShot();
        }
    },
    
    // Save current shot to database and add to shots list
    async async_saveCurrentShot() {
        if (this.currentShot.points.length < 3) return;
        
        const currentTeamId = AppState.currentMatchTeam === 1 ? 
            AppState.currentMatch.team1_id : AppState.currentMatch.team2_id;
        
        const playerNumber = AppState.gridNumbers[AppState.selectedPlayerIndex];
        
        // Save to database
        try {
            const p0 = this.currentShot.points[0];
            const p1 = this.currentShot.points[1];
            const p2 = this.currentShot.points[2];

            const result = await DatabaseManager.addShot(
                AppState.currentMatch.id,
                currentTeamId,
                playerNumber,
                p0.x, p0.y,
                p1.x, p1.y,
                p2.x, p2.y,
                this.currentShot.isGoal,
                this.currentShot.shotType
            );
            
            // Add to shots list for immediate rendering with correct types (Numbers)
            this.shotsList.push({
                id: result,
                x0: Number(p0.x),
                y0: Number(p0.y),
                x1: Number(p1.x),
                y1: Number(p1.y),
                x2: Number(p2.x),
                y2: Number(p2.y),
                goal: this.currentShot.isGoal,
                player_number: playerNumber,
                shot_type: this.currentShot.shotType
            });

            // Update UI list
            await MenuManager.updateMatchShotList();
            
        } catch (error) {
            console.error('Error saving shot:', error);
        }
        
        // Reset current shot
        this.resetCurrentShot();
        this.render(); // Force immediate render
    },
    
    // Original method rename to keep consistency if called elsewhere
    async saveCurrentShot() {
        return await this.async_saveCurrentShot();
    },
    
    // Check if point is in goal area (at either end of the vertical pitch)
    isPointInGoal(x, y) {
        // Based on user calibration:
        // Top Goal: x between 0.21 and 0.78, y between 0.05 and 0.44
        const isNearTopGoal = (y >= 0.0 && y <= 0.45) && (x >= 0.20 && x <= 0.80);
        
        // Mirrored Bottom Goal (approximate)
        const isNearBottomGoal = (y >= 0.55 && y <= 1.0) && (x >= 0.20 && x <= 0.80);
        
        return isNearTopGoal || isNearBottomGoal;
    },

    // Reset current shot
    resetCurrentShot() {
        this.currentShot = { points: [], isGoal: false, shotType: 'static' };
        AppState.isAwaitingConfirmation = false;
        this.updateStatus();
    },

    // Update status text
    updateStatus() {
        const statusEl = document.getElementById('shot-status');
        if (!statusEl) return;

        if (AppState.selectedPlayerIndex === null) {
            statusEl.textContent = 'Select a player to start';
            statusEl.style.color = '#dc3545';
            return;
        }

        const playerNumber = AppState.gridNumbers[AppState.selectedPlayerIndex];
        const points = this.currentShot.points.length;
        const type = this.currentShot.shotType === 'penalty' ? 'Penalty (7m)' : 
                     this.currentShot.shotType === 'counter' ? 'Counter' : 'Static';

        statusEl.style.color = '#007bff';
        
        if (AppState.isAwaitingConfirmation) {
            statusEl.textContent = `Player ${playerNumber} - ${type}: IS IT A GOAL? (Select on Canvas)`;
            statusEl.style.color = '#28a745';
            return;
        }

        if (points === 0) {
            statusEl.textContent = `Player ${playerNumber} - ${type}: Click Shot Origin (Point 1)`;
        } else if (points === 1) {
            statusEl.textContent = `Player ${playerNumber} - ${type}: Click Trajectory (Point 2)`;
        } else if (points === 2) {
            statusEl.textContent = `Player ${playerNumber} - ${type}: Click Target Goal (Point 3)`;
        } else if (points === 3) {
            statusEl.textContent = `Player ${playerNumber} - ${type}: Saving...`;
        }

        // Force a render to show popup or status changes
        this.render();
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
                    id: shot.id,
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
            this.updateStatus();
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