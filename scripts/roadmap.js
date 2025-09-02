/**
 * Roadmap Manager - Handles visual roadmap with timeline, milestones, and progress tracking
 * Manages project configuration, milestone management, and car animation
 */

class RoadmapManager {
    static canvas = null;
    static ctx = null;
    static projectConfig = null;
    static milestones = [];
    static carPosition = 0;
    static animationId = null;
    static isInitialized = false;

    // Canvas dimensions and styling
    static canvasWidth = 800;
    static canvasHeight = 300;
    static roadY = 200;
    static roadHeight = 40;
    static carSize = 30;
    static carMovementOffset = 0;
    static lastUpdateTime = 0;

    /**
     * Initialize the roadmap system with enhanced features
     */
    static async init() {
        try {
            console.log('Initializing RoadmapManager...');
            
            this.canvas = document.getElementById('roadmapCanvas');
            if (!this.canvas) {
                throw new Error('Roadmap canvas not found');
            }

            this.ctx = this.canvas.getContext('2d');
            
            // Add rounded rectangle support for older browsers
            this.addRoundRectSupport();
            
            this.setupCanvas();
            this.setupMilestoneEventListeners();
            
            // Load project configuration and milestones
            await this.loadProjectData();
            
            // Initialize car position and movement
            this.carPosition = 0;
            this.carMovementOffset = 0;
            this.lastUpdateTime = Date.now();
            
            // Update current date display
            this.updateCurrentDateDisplay();
            
            // Start animation loop
            this.startAnimation();
            
            this.isInitialized = true;
            console.log('RoadmapManager initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize RoadmapManager:', error);
            throw error;
        }
    }

    /**
     * Set up canvas properties
     */
    static setupCanvas() {
        // Add loading state
        this.canvas.classList.add('loading');
        
        // Set up responsive canvas
        this.resizeCanvas();
        
        // Handle window resize
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Set up canvas styling
        this.canvas.style.cursor = 'pointer';
        
        // Test canvas context
        if (!this.ctx) {
            throw new Error('Canvas context not available');
        }
        
        // Set default canvas properties
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Remove loading state after setup
        setTimeout(() => {
            this.canvas.classList.remove('loading');
        }, 500);
    }

    /**
     * Resize canvas to fit container
     */
    static resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        this.canvasWidth = Math.max(600, rect.width - 40);
        this.canvasHeight = 300;
        
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        
        // Redraw after resize
        if (this.isInitialized) {
            this.draw();
        }
    }

    /**
     * Set up canvas properties
     */
    static setupCanvas() {
        // Add loading state
        this.canvas.classList.add('loading');
        
        // Set up responsive canvas
        this.resizeCanvas();
        
        // Handle window resize
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Set up canvas styling
        this.canvas.style.cursor = 'pointer';
        
        // Test canvas context
        if (!this.ctx) {
            throw new Error('Canvas context not available');
        }
        
        // Set default canvas properties
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Remove loading state after setup
        setTimeout(() => {
            this.canvas.classList.remove('loading');
        }, 500);
    }

    /**
     * Load project data from storage
     */
    static async loadProjectData() {
        try {
            // Load project configuration
            this.projectConfig = await StorageManager.get('project_config');
            
            // Normalize project config to ensure name field exists
            if (this.projectConfig) {
                if (this.projectConfig.projectName && !this.projectConfig.name) {
                    this.projectConfig.name = this.projectConfig.projectName;
                }
                if (!this.projectConfig.name && !this.projectConfig.projectName) {
                    this.projectConfig.name = 'Project Roadmap';
                }
            }
            
            // Load milestones
            this.milestones = await StorageManager.getAllFromStore('milestones') || [];
            
            // Update UI
            this.updateProjectInfo();
            this.updateMilestoneList();
            
        } catch (error) {
            console.error('Failed to load project data:', error);
            this.projectConfig = null;
            this.milestones = [];
            this.updateMilestoneList();
        }
    }

    /**
     * Update project information display with enhanced formatting
     */
    static updateProjectInfo() {
        const startDateElement = document.querySelector('.start-date');
        const endDateElement = document.querySelector('.end-date');
        
        if (this.projectConfig) {
            if (startDateElement) {
                startDateElement.textContent = `Start: ${this.formatDateWithRelative(this.projectConfig.startDate)}`;
            }
            if (endDateElement) {
                endDateElement.textContent = `End: ${this.formatDateWithRelative(this.projectConfig.endDate)}`;
            }
            
            // Update section header title with project name
            const sectionHeader = document.querySelector('#roadmap-section .section-header h2');
            if (sectionHeader && this.projectConfig.name) {
                sectionHeader.textContent = this.projectConfig.name;
            }
        } else {
            if (startDateElement) {
                startDateElement.textContent = 'Start: Not Set';
            }
            if (endDateElement) {
                endDateElement.textContent = 'End: Not Set';
            }
            
            // Reset section header to default
            const sectionHeader = document.querySelector('#roadmap-section .section-header h2');
            if (sectionHeader) {
                sectionHeader.textContent = 'Project Roadmap';
            }
        }
        
        // Update current date display
        this.updateCurrentDateDisplay();
    }

    /**
     * Start animation loop
     */
    static startAnimation() {
        const animate = () => {
            this.update();
            this.draw();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    /**
     * Stop animation loop
     */
    static stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Update animation state with enhanced date tracking
     */
    static update() {
        if (!this.projectConfig) {
            this.carPosition = 0;
            return;
        }

        const now = new Date();
        const startDate = new Date(this.projectConfig.startDate);
        const endDate = new Date(this.projectConfig.endDate);
        
        // Calculate car position based on current date with smooth animation
        let targetPosition;
        
        if (now < startDate) {
            targetPosition = 0;
        } else if (now > endDate) {
            targetPosition = 1;
        } else {
            const totalDuration = endDate.getTime() - startDate.getTime();
            const elapsed = now.getTime() - startDate.getTime();
            targetPosition = elapsed / totalDuration;
        }
        
        // Smooth animation to target position
        const animationSpeed = 0.02; // Adjust speed of car movement
        if (Math.abs(this.carPosition - targetPosition) > 0.001) {
            this.carPosition += (targetPosition - this.carPosition) * animationSpeed;
        } else {
            this.carPosition = targetPosition;
        }
        
        // Add subtle car movement effect (slight wobble when moving)
        if (this.carPosition > 0 && this.carPosition < 1) {
            this.carMovementOffset = Math.sin(Date.now() * 0.01) * 0.5;
        } else {
            this.carMovementOffset = 0;
        }
    }

    /**
     * Draw the roadmap
     */
    static draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Draw background
        this.drawBackground();
        
        // Draw road
        this.drawRoad();
        
        // Draw timeline
        this.drawTimeline();
        
        // Draw milestones
        this.drawMilestones();
        
        // Draw car
        this.drawCar();
        
        // Draw project info
        this.drawProjectInfo();
    }

    /**
     * Draw enhanced background with sky and landscape
     */
    static drawBackground() {
        // Sky gradient
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.roadY - 50);
        skyGradient.addColorStop(0, '#87ceeb');
        skyGradient.addColorStop(0.5, '#e0f6ff');
        skyGradient.addColorStop(1, '#f0f9ff');
        
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.roadY - 30);
        
        // Ground gradient
        const groundGradient = this.ctx.createLinearGradient(0, this.roadY + this.roadHeight, 0, this.canvasHeight);
        groundGradient.addColorStop(0, '#a7f3d0');
        groundGradient.addColorStop(0.5, '#6ee7b7');
        groundGradient.addColorStop(1, '#34d399');
        
        this.ctx.fillStyle = groundGradient;
        this.ctx.fillRect(0, this.roadY + this.roadHeight, this.canvasWidth, this.canvasHeight - (this.roadY + this.roadHeight));
        
        // Draw clouds
        this.drawClouds();
        
        // Draw distant mountains
        this.drawMountains();
        
        // Draw trees/landscape elements
        this.drawLandscapeElements();
    }

    /**
     * Draw fluffy clouds in the sky
     */
    static drawClouds() {
        const clouds = [
            { x: this.canvasWidth * 0.2, y: 40, size: 25 },
            { x: this.canvasWidth * 0.6, y: 30, size: 30 },
            { x: this.canvasWidth * 0.85, y: 50, size: 20 }
        ];

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        clouds.forEach(cloud => {
            // Multiple circles to create cloud shape
            for (let i = 0; i < 5; i++) {
                const offsetX = (i - 2) * (cloud.size * 0.3);
                const offsetY = Math.sin(i) * (cloud.size * 0.2);
                const radius = cloud.size * (0.6 + Math.random() * 0.4);
                
                this.ctx.beginPath();
                this.ctx.arc(cloud.x + offsetX, cloud.y + offsetY, radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }

    /**
     * Draw distant mountains
     */
    static drawMountains() {
        this.ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        
        // Mountain silhouette
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.roadY - 30);
        
        const peaks = [
            { x: this.canvasWidth * 0.15, y: this.roadY - 80 },
            { x: this.canvasWidth * 0.35, y: this.roadY - 60 },
            { x: this.canvasWidth * 0.55, y: this.roadY - 90 },
            { x: this.canvasWidth * 0.75, y: this.roadY - 50 },
            { x: this.canvasWidth * 0.9, y: this.roadY - 70 }
        ];
        
        peaks.forEach(peak => {
            this.ctx.lineTo(peak.x, peak.y);
        });
        
        this.ctx.lineTo(this.canvasWidth, this.roadY - 30);
        this.ctx.lineTo(this.canvasWidth, this.roadY - 30);
        this.ctx.lineTo(0, this.roadY - 30);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Draw landscape elements (trees, bushes)
     */
    static drawLandscapeElements() {
        // Simple trees along the roadside
        const treePositions = [
            { x: this.canvasWidth * 0.1, size: 15 },
            { x: this.canvasWidth * 0.25, size: 12 },
            { x: this.canvasWidth * 0.7, size: 18 },
            { x: this.canvasWidth * 0.9, size: 14 }
        ];

        treePositions.forEach(tree => {
            const treeY = this.roadY + this.roadHeight + 10;
            
            // Tree trunk
            this.ctx.fillStyle = '#92400e';
            this.ctx.fillRect(tree.x - 2, treeY, 4, tree.size * 0.8);
            
            // Tree crown
            this.ctx.fillStyle = '#059669';
            this.ctx.beginPath();
            this.ctx.arc(tree.x, treeY - 5, tree.size * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Tree highlight
            this.ctx.fillStyle = '#10b981';
            this.ctx.beginPath();
            this.ctx.arc(tree.x - 3, treeY - 8, tree.size * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Add some grass details
        this.ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
        for (let i = 0; i < this.canvasWidth; i += 30) {
            const grassY = this.roadY + this.roadHeight + 5;
            this.ctx.fillRect(i + Math.random() * 20, grassY + Math.random() * 10, 2, 8);
            this.ctx.fillRect(i + 10 + Math.random() * 20, grassY + Math.random() * 10, 1, 6);
        }
    }

    /**
     * Draw road with enhanced styling
     */
    static drawRoad() {
        const roadWidth = this.canvasWidth - 100;
        const roadX = 50;
        
        // Road shadow (depth effect)
        this.ctx.fillStyle = '#1a202c';
        this.ctx.fillRect(roadX + 2, this.roadY + 2, roadWidth, this.roadHeight);
        
        // Road base with gradient
        const roadGradient = this.ctx.createLinearGradient(0, this.roadY, 0, this.roadY + this.roadHeight);
        roadGradient.addColorStop(0, '#4a5568');
        roadGradient.addColorStop(0.3, '#2d3748');
        roadGradient.addColorStop(0.7, '#2d3748');
        roadGradient.addColorStop(1, '#4a5568');
        
        this.ctx.fillStyle = roadGradient;
        this.ctx.fillRect(roadX, this.roadY, roadWidth, this.roadHeight);
        
        // Road edges with highlights
        this.ctx.fillStyle = '#1a202c';
        this.ctx.fillRect(roadX, this.roadY, roadWidth, 3);
        this.ctx.fillRect(roadX, this.roadY + this.roadHeight - 3, roadWidth, 3);
        
        // Road edge highlights
        this.ctx.fillStyle = '#718096';
        this.ctx.fillRect(roadX, this.roadY + 3, roadWidth, 1);
        this.ctx.fillRect(roadX, this.roadY + this.roadHeight - 4, roadWidth, 1);
        
        // Road center line (dashed)
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([15, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(roadX, this.roadY + this.roadHeight / 2);
        this.ctx.lineTo(roadX + roadWidth, this.roadY + this.roadHeight / 2);
        this.ctx.stroke();
        
        // Center line highlight
        this.ctx.strokeStyle = '#f7fafc';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([15, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(roadX, this.roadY + this.roadHeight / 2);
        this.ctx.lineTo(roadX + roadWidth, this.roadY + this.roadHeight / 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Road texture (subtle pattern)
        this.drawRoadTexture(roadX, roadWidth);
        
        // Start and end markers
        this.drawRoadMarkers(roadX, roadWidth);
    }

    /**
     * Draw road texture for realism
     */
    static drawRoadTexture(roadX, roadWidth) {
        this.ctx.fillStyle = 'rgba(26, 32, 44, 0.1)';
        
        // Add subtle texture dots
        for (let i = 0; i < roadWidth; i += 20) {
            for (let j = 0; j < this.roadHeight; j += 15) {
                if (Math.random() > 0.7) {
                    this.ctx.fillRect(roadX + i + Math.random() * 10, this.roadY + j + Math.random() * 8, 2, 1);
                }
            }
        }
    }

    /**
     * Draw start and end road markers
     */
    static drawRoadMarkers(roadX, roadWidth) {
        // Start marker
        this.ctx.fillStyle = '#10b981';
        this.ctx.fillRect(roadX - 3, this.roadY - 5, 6, this.roadHeight + 10);
        
        // Start flag
        this.ctx.fillStyle = '#059669';
        this.ctx.beginPath();
        this.ctx.moveTo(roadX + 3, this.roadY - 5);
        this.ctx.lineTo(roadX + 25, this.roadY + 3);
        this.ctx.lineTo(roadX + 3, this.roadY + 11);
        this.ctx.closePath();
        this.ctx.fill();
        
        // End marker
        this.ctx.fillStyle = '#ef4444';
        this.ctx.fillRect(roadX + roadWidth - 3, this.roadY - 5, 6, this.roadHeight + 10);
        
        // End flag
        this.ctx.fillStyle = '#dc2626';
        this.ctx.beginPath();
        this.ctx.moveTo(roadX + roadWidth - 3, this.roadY - 5);
        this.ctx.lineTo(roadX + roadWidth - 25, this.roadY + 3);
        this.ctx.lineTo(roadX + roadWidth - 3, this.roadY + 11);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Marker labels
        this.ctx.fillStyle = '#374151';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('START', roadX + 15, this.roadY - 10);
        this.ctx.fillText('END', roadX + roadWidth - 15, this.roadY - 10);
    }

    /**
     * Draw enhanced timeline with better markers
     */
    static drawTimeline() {
        if (!this.projectConfig) return;
        
        const roadWidth = this.canvasWidth - 100;
        const roadX = 50;
        const startDate = new Date(this.projectConfig.startDate);
        const endDate = new Date(this.projectConfig.endDate);
        const now = new Date();
        
        // Timeline markers
        const markers = 5;
        for (let i = 0; i <= markers; i++) {
            const x = roadX + (roadWidth * i / markers);
            const y = this.roadY + this.roadHeight + 20;
            
            // Calculate marker date
            const totalDuration = endDate.getTime() - startDate.getTime();
            const markerDate = new Date(startDate.getTime() + (totalDuration * i / markers));
            
            // Highlight current date marker
            const isToday = Math.abs(markerDate - now) < 24 * 60 * 60 * 1000;
            
            // Marker line with different styles
            this.ctx.strokeStyle = isToday ? '#3b82f6' : '#718096';
            this.ctx.lineWidth = isToday ? 3 : 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.roadY + this.roadHeight);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            
            // Marker dot
            this.ctx.fillStyle = isToday ? '#3b82f6' : '#718096';
            this.ctx.beginPath();
            this.ctx.arc(x, y, isToday ? 4 : 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Date label with current date highlighting
            this.ctx.fillStyle = isToday ? '#1e40af' : '#4a5568';
            this.ctx.font = isToday ? 'bold 10px sans-serif' : '9px sans-serif';
            this.ctx.textAlign = 'center';
            
            // Format date for display
            let dateText;
            if (i === 0) {
                dateText = 'START';
            } else if (i === markers) {
                dateText = 'END';
            } else {
                dateText = this.formatDate(markerDate);
            }
            
            this.ctx.fillText(dateText, x, y + (isToday ? 18 : 15));
            
            // Add "TODAY" label if this is the current date
            if (isToday) {
                this.ctx.fillStyle = '#3b82f6';
                this.ctx.font = 'bold 8px sans-serif';
                this.ctx.fillText('TODAY', x, y + 28);
            }
        }
        
        // Draw current date indicator
        this.drawCurrentDateIndicator(roadX, roadWidth, startDate, endDate);
    }

    /**
     * Draw current date indicator on timeline
     */
    static drawCurrentDateIndicator(roadX, roadWidth, startDate, endDate) {
        const now = new Date();
        
        if (now >= startDate && now <= endDate) {
            const totalDuration = endDate.getTime() - startDate.getTime();
            const elapsed = now.getTime() - startDate.getTime();
            const position = elapsed / totalDuration;
            const x = roadX + (roadWidth * position);
            
            // Current date line
            this.ctx.strokeStyle = '#ef4444';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.roadY - 30);
            this.ctx.lineTo(x, this.roadY + this.roadHeight + 40);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Current date flag
            this.ctx.fillStyle = '#ef4444';
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.roadY - 30);
            this.ctx.lineTo(x + 15, this.roadY - 20);
            this.ctx.lineTo(x, this.roadY - 10);
            this.ctx.closePath();
            this.ctx.fill();
            
            // "NOW" label
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 8px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('NOW', x + 7, this.roadY - 17);
        }
    }

    /**
     * Draw enhanced milestones with interactive features
     */
    static drawMilestones() {
        if (!this.projectConfig || this.milestones.length === 0) return;
        
        const roadWidth = this.canvasWidth - 100;
        const roadX = 50;
        const startDate = new Date(this.projectConfig.startDate);
        const endDate = new Date(this.projectConfig.endDate);
        const totalDuration = endDate.getTime() - startDate.getTime();
        
        this.milestones.forEach((milestone, index) => {
            const milestoneDate = new Date(milestone.date);
            const position = (milestoneDate.getTime() - startDate.getTime()) / totalDuration;
            
            if (position >= 0 && position <= 1) {
                const x = roadX + (roadWidth * position);
                const y = this.roadY - 25;
                
                // Check if milestone is completed or overdue
                const now = new Date();
                const isCompleted = milestone.completed;
                const isOverdue = !isCompleted && now > milestoneDate;
                const isUpcoming = !isCompleted && now <= milestoneDate;
                
                // Flag pole with status color
                let flagColor = '#8b5cf6'; // Default purple
                if (isCompleted) flagColor = '#10b981'; // Green
                else if (isOverdue) flagColor = '#ef4444'; // Red
                else if (isUpcoming) flagColor = '#f59e0b'; // Orange
                
                // Flag pole shadow
                this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(x + 1, y + 1);
                this.ctx.lineTo(x + 1, this.roadY + 1);
                this.ctx.stroke();
                
                // Flag pole
                this.ctx.strokeStyle = flagColor;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x, this.roadY);
                this.ctx.stroke();
                
                // Flag with gradient
                const flagGradient = this.ctx.createLinearGradient(x, y, x + 22, y + 14);
                flagGradient.addColorStop(0, flagColor);
                flagGradient.addColorStop(1, this.darkenColor(flagColor, 0.2));
                
                this.ctx.fillStyle = flagGradient;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x + 22, y + 7);
                this.ctx.lineTo(x, y + 14);
                this.ctx.closePath();
                this.ctx.fill();
                
                // Flag border
                this.ctx.strokeStyle = this.darkenColor(flagColor, 0.3);
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x + 22, y + 7);
                this.ctx.lineTo(x, y + 14);
                this.ctx.closePath();
                this.ctx.stroke();
                
                // Status icon on flag
                this.ctx.fillStyle = 'white';
                this.ctx.font = 'bold 8px sans-serif';
                this.ctx.textAlign = 'center';
                let statusIcon = '📍';
                if (isCompleted) statusIcon = '✅';
                else if (isOverdue) statusIcon = '⚠️';
                else if (isUpcoming) statusIcon = '⏰';
                
                this.ctx.fillText(statusIcon, x + 11, y + 9);
                
                // Milestone title with background
                this.drawMilestoneTitle(milestone, x, y);
                
                // Store milestone bounds for click detection
                if (!this.milestoneBounds) this.milestoneBounds = [];
                this.milestoneBounds[index] = {
                    x: x - 15,
                    y: y - 15,
                    width: 45,
                    height: 50,
                    milestone: milestone,
                    index: index
                };
            }
        });
    }

    /**
     * Draw milestone title with background
     */
    static drawMilestoneTitle(milestone, x, y) {
        const titleText = milestone.title;
        const maxWidth = 80;
        
        // Measure text
        this.ctx.font = '10px sans-serif';
        let textWidth = this.ctx.measureText(titleText).width;
        
        if (textWidth > maxWidth) {
            // Truncate text if too long
            const truncated = titleText.substring(0, 12) + '...';
            textWidth = this.ctx.measureText(truncated).width;
            
            // Title background
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.fillRect(x - textWidth/2 - 3, y - 18, textWidth + 6, 12);
            
            // Title text
            this.ctx.fillStyle = '#374151';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(truncated, x, y - 9);
        } else {
            // Title background
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.fillRect(x - textWidth/2 - 3, y - 18, textWidth + 6, 12);
            
            // Title text
            this.ctx.fillStyle = '#374151';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(titleText, x, y - 9);
        }
    }

    /**
     * Darken a color by a percentage
     */
    static darkenColor(color, percent) {
        // Simple color darkening function
        const colorMap = {
            '#8b5cf6': '#7c3aed',
            '#10b981': '#059669',
            '#ef4444': '#dc2626',
            '#f59e0b': '#d97706'
        };
        return colorMap[color] || color;
    }

    /**
     * Draw enhanced car with realistic details and animation
     */
    static drawCar() {
        const roadWidth = this.canvasWidth - 100;
        const roadX = 50;
        const baseCarX = roadX + (roadWidth * this.carPosition) - this.carSize / 2;
        const carX = baseCarX + (this.carMovementOffset || 0);
        const carY = this.roadY + (this.roadHeight - this.carSize) / 2 - 5;
        
        // Car shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.ellipse(carX + this.carSize / 2, carY + this.carSize * 0.8, 
                        this.carSize * 0.6, this.carSize * 0.2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Car body gradient
        const carGradient = this.ctx.createLinearGradient(carX, carY, carX, carY + this.carSize * 0.7);
        carGradient.addColorStop(0, '#60a5fa');
        carGradient.addColorStop(0.3, '#3b82f6');
        carGradient.addColorStop(0.7, '#2563eb');
        carGradient.addColorStop(1, '#1d4ed8');
        
        // Main car body
        this.ctx.fillStyle = carGradient;
        this.ctx.fillRect(carX + 2, carY + 5, this.carSize - 4, this.carSize * 0.5);
        
        // Car roof
        this.ctx.fillStyle = '#1e40af';
        this.ctx.fillRect(carX + 6, carY, this.carSize - 12, this.carSize * 0.4);
        
        // Windshield
        const windshieldGradient = this.ctx.createLinearGradient(carX, carY, carX, carY + 10);
        windshieldGradient.addColorStop(0, 'rgba(173, 216, 230, 0.8)');
        windshieldGradient.addColorStop(1, 'rgba(135, 206, 235, 0.6)');
        
        this.ctx.fillStyle = windshieldGradient;
        this.ctx.fillRect(carX + 7, carY + 1, this.carSize - 14, 8);
        
        // Car windows (side)
        this.ctx.fillStyle = 'rgba(135, 206, 235, 0.7)';
        this.ctx.fillRect(carX + 3, carY + 8, 4, this.carSize * 0.25);
        this.ctx.fillRect(carX + this.carSize - 7, carY + 8, 4, this.carSize * 0.25);
        
        // Car highlights
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.fillRect(carX + 4, carY + 6, this.carSize - 8, 2);
        
        // Wheels with improved design
        this.drawCarWheel(carX + 5, carY + this.carSize * 0.65);
        this.drawCarWheel(carX + this.carSize - 8, carY + this.carSize * 0.65);
        
        // Enhanced progress indicator with current date info
        const percentage = Math.round(this.carPosition * 100);
        const progressInfo = this.getProgressInfo();
        
        // Progress background with rounded corners
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.beginPath();
        this.ctx.roundRect(carX - 8, carY - 30, this.carSize + 16, 20, 5);
        this.ctx.fill();
        
        // Progress border
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(carX - 8, carY - 30, this.carSize + 16, 20, 5);
        this.ctx.stroke();
        
        // Progress text with current status
        this.ctx.fillStyle = progressInfo.color;
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${percentage}%`, carX + this.carSize / 2, carY - 20);
        
        // Status text
        this.ctx.fillStyle = '#4a5568';
        this.ctx.font = '8px sans-serif';
        this.ctx.fillText(progressInfo.status, carX + this.carSize / 2, carY - 12);
        
        // Speed indicator (small dots for motion effect)
        if (this.carPosition > 0 && this.carPosition < 1) {
            this.drawMotionEffects(carX, carY);
        }
    }

    /**
     * Draw detailed car wheel
     */
    static drawCarWheel(x, y) {
        const wheelRadius = 5;
        
        // Tire
        this.ctx.fillStyle = '#1a202c';
        this.ctx.beginPath();
        this.ctx.arc(x, y, wheelRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Rim
        this.ctx.fillStyle = '#718096';
        this.ctx.beginPath();
        this.ctx.arc(x, y, wheelRadius - 1, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Hub
        this.ctx.fillStyle = '#e2e8f0';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Spokes
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + Math.cos(angle) * 3, y + Math.sin(angle) * 3);
            this.ctx.stroke();
        }
    }

    /**
     * Draw motion effects behind the car
     */
    static drawMotionEffects(carX, carY) {
        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        this.ctx.lineWidth = 2;
        
        for (let i = 0; i < 3; i++) {
            const offset = (i + 1) * 8;
            const alpha = 0.4 - (i * 0.1);
            
            this.ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.moveTo(carX - offset, carY + 10);
            this.ctx.lineTo(carX - offset - 5, carY + 10);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(carX - offset, carY + 18);
            this.ctx.lineTo(carX - offset - 5, carY + 18);
            this.ctx.stroke();
        }
    }

    /**
     * Draw project information
     */
    static drawProjectInfo() {
        if (!this.projectConfig) {
            // Draw "Configure Project" message
            this.ctx.fillStyle = '#718096';
            this.ctx.font = '16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Click "Configure Project" to set up your roadmap', 
                            this.canvasWidth / 2, this.canvasHeight / 2);
            return;
        }
        
        // Project title - use the project name from config
        this.ctx.fillStyle = '#2d3748';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.projectConfig.name || 'Project Roadmap', 
                        this.canvasWidth / 2, 30);
        
        // Days remaining
        const now = new Date();
        const endDate = new Date(this.projectConfig.endDate);
        const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        let statusText = '';
        let statusColor = '#4a5568';
        
        if (daysRemaining > 0) {
            statusText = `${daysRemaining} days remaining`;
            statusColor = '#059669';
        } else if (daysRemaining === 0) {
            statusText = 'Due today';
            statusColor = '#d97706';
        } else {
            statusText = `${Math.abs(daysRemaining)} days overdue`;
            statusColor = '#dc2626';
        }
        
        this.ctx.fillStyle = statusColor;
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(statusText, this.canvasWidth / 2, 50);
    }

    /**
     * Handle canvas click events with milestone interaction
     */
    static handleCanvasClick(event) {
        if (!this.projectConfig) {
            this.showProjectConfig();
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        // Check if click is on an existing milestone
        if (this.milestoneBounds) {
            for (let i = 0; i < this.milestoneBounds.length; i++) {
                const bounds = this.milestoneBounds[i];
                if (bounds && 
                    clickX >= bounds.x && 
                    clickX <= bounds.x + bounds.width &&
                    clickY >= bounds.y && 
                    clickY <= bounds.y + bounds.height) {
                    
                    this.showMilestoneDetailsModal(bounds.milestone, bounds.index);
                    return;
                }
            }
        }
        
        // Check if click is on the road area for milestone creation
        if (clickY >= this.roadY - 50 && clickY <= this.roadY + this.roadHeight + 20) {
            this.showMilestoneModal(clickX);
        }
    }

    /**
     * Show milestone details modal for editing/viewing
     */
    static showMilestoneDetailsModal(milestone, index) {
        const isCompleted = milestone.completed;
        const milestoneDate = new Date(milestone.date);
        const now = new Date();
        const isOverdue = !isCompleted && now > milestoneDate;
        
        let statusBadge = '';
        if (isCompleted) {
            statusBadge = '<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">✅ Completed</span>';
        } else if (isOverdue) {
            statusBadge = '<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">⚠️ Overdue</span>';
        } else {
            statusBadge = '<span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">⏰ Upcoming</span>';
        }
        
        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">Milestone Details</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 1rem;">
                    ${statusBadge}
                </div>
                
                <div class="form-group">
                    <label class="form-label">Milestone Title</label>
                    <input type="text" class="form-input" id="editMilestoneTitle" 
                           value="${milestone.title}" placeholder="Enter milestone title">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Date</label>
                    <input type="date" class="form-input" id="editMilestoneDate" 
                           value="${milestone.date}"
                           min="${this.projectConfig.startDate}" 
                           max="${this.projectConfig.endDate}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-textarea" id="editMilestoneDescription" 
                              placeholder="Enter milestone description">${milestone.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" id="editMilestoneCompleted" ${isCompleted ? 'checked' : ''}> 
                        Mark as completed
                    </label>
                </div>
                
                ${milestone.completedAt ? 
                    `<div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem;">
                        Completed: ${new Date(milestone.completedAt).toLocaleDateString()}
                    </div>` : ''
                }
            </div>
            <div class="modal-footer">
                <button class="btn btn-danger" onclick="RoadmapManager.deleteMilestone(${index})">Delete</button>
                <button class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
                <button class="btn btn-primary" onclick="RoadmapManager.updateMilestone(${index})">Update Milestone</button>
            </div>
        `;
        
        app.showModal(modalContent);
    }

    /**
     * Update existing milestone
     */
    static async updateMilestone(index) {
        try {
            const titleInput = document.getElementById('editMilestoneTitle');
            const dateInput = document.getElementById('editMilestoneDate');
            const descriptionInput = document.getElementById('editMilestoneDescription');
            const completedInput = document.getElementById('editMilestoneCompleted');
            
            if (!titleInput || !dateInput) {
                throw new Error('Form elements not found');
            }
            
            const milestone = this.milestones[index];
            const wasCompleted = milestone.completed;
            const isNowCompleted = completedInput.checked;
            
            // Update milestone data
            milestone.title = titleInput.value.trim();
            milestone.date = dateInput.value;
            milestone.description = descriptionInput ? descriptionInput.value.trim() : '';
            milestone.completed = isNowCompleted;
            milestone.updatedAt = new Date().toISOString();
            
            // Set completion timestamp if newly completed
            if (!wasCompleted && isNowCompleted) {
                milestone.completedAt = new Date().toISOString();
            } else if (wasCompleted && !isNowCompleted) {
                milestone.completedAt = null;
            }
            
            // Validation
            if (!milestone.title) {
                throw new Error('Milestone title is required');
            }
            
            if (!milestone.date) {
                throw new Error('Milestone date is required');
            }
            
            // Validate with storage manager
            const validation = StorageManager.validateMilestoneData(milestone);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            
            // Save to storage
            await StorageManager.saveToStore('milestones', milestone);
            
            // Update local array
            this.milestones[index] = milestone;
            
            // Clear milestone bounds to force recalculation
            this.milestoneBounds = null;
            
            // Update milestone list display
            this.updateMilestoneList();
            
            app.hideModal();
            app.showSuccess('Milestone updated successfully!');
            
            console.log('Milestone updated:', milestone);
            
        } catch (error) {
            console.error('Failed to update milestone:', error);
            app.showError(error.message);
        }
    }

    /**
     * Delete milestone
     */
    static async deleteMilestone(index) {
        try {
            const milestone = this.milestones[index];
            
            // Confirm deletion
            if (!confirm(`Are you sure you want to delete the milestone "${milestone.title}"?`)) {
                return;
            }
            
            // Delete from storage
            await StorageManager.deleteFromStore('milestones', milestone.id);
            
            // Remove from local array
            this.milestones.splice(index, 1);
            
            // Clear milestone bounds to force recalculation
            this.milestoneBounds = null;
            
            // Update milestone list display
            this.updateMilestoneList();
            
            app.hideModal();
            app.showSuccess('Milestone deleted successfully!');
            
            console.log('Milestone deleted:', milestone.title);
            
        } catch (error) {
            console.error('Failed to delete milestone:', error);
            app.showError('Failed to delete milestone: ' + error.message);
        }
    }

    /**
     * Show enhanced project configuration modal
     */
    static showProjectConfig() {
        const config = this.projectConfig || {};
        const isExisting = !!this.projectConfig;
        const hasExistingMilestones = this.milestones && this.milestones.length > 0;
        
        // Calculate project statistics if existing
        let projectStats = '';
        if (isExisting) {
            const startDate = new Date(config.startDate);
            const endDate = new Date(config.endDate);
            const now = new Date();
            const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            const elapsedDays = Math.max(0, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
            const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
            
            projectStats = `
                <div class="project-stats">
                    <h4>Project Statistics</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">${totalDays}</div>
                            <div class="stat-label">Total Days</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${elapsedDays}</div>
                            <div class="stat-label">Days Elapsed</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${progressPercent}%</div>
                            <div class="stat-label">Progress</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${this.milestones?.length || 0}</div>
                            <div class="stat-label">Milestones</div>
                        </div>
                    </div>
                </div>
            `;
        }

        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">${isExisting ? 'Edit' : 'Create'} Project Configuration</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body project-config-body">
                ${projectStats}
                
                <div class="form-group">
                    <label class="form-label">Project Name *</label>
                    <input type="text" class="form-input" id="projectName" 
                           value="${(config.name || config.projectName || '').replace(/"/g, '&quot;')}" 
                           placeholder="Enter project name (e.g., Website Redesign)">
                    <small class="form-help">A clear, descriptive name for your project</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Project Description</label>
                    <textarea class="form-input" id="projectDescription" 
                              placeholder="Describe your project goals, scope, and key deliverables..."
                              rows="3">${(config.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                    <small class="form-help">Optional: Provide context and objectives for your project</small>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Start Date *</label>
                        <input type="date" class="form-input" id="projectStartDate" 
                               value="${config.startDate || ''}"
                               min="${new Date(Date.now() - 365*24*60*60*1000).toISOString().split('T')[0]}"
                               max="${new Date(Date.now() + 5*365*24*60*60*1000).toISOString().split('T')[0]}">
                        <small class="form-help">When does your project begin?</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">End Date *</label>
                        <input type="date" class="form-input" id="projectEndDate" 
                               value="${config.endDate || ''}"
                               min="${config.startDate || new Date().toISOString().split('T')[0]}"
                               max="${new Date(Date.now() + 5*365*24*60*60*1000).toISOString().split('T')[0]}">
                        <small class="form-help">Target completion date</small>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Project Status</label>
                    <select class="form-input" id="projectStatus">
                        <option value="planning" ${config.status === 'planning' ? 'selected' : ''}>📋 Planning</option>
                        <option value="active" ${config.status === 'active' || !config.status ? 'selected' : ''}>🚀 Active</option>
                        <option value="on-hold" ${config.status === 'on-hold' ? 'selected' : ''}>⏸️ On Hold</option>
                        <option value="completed" ${config.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
                    </select>
                </div>
                
                ${hasExistingMilestones ? `
                    <div class="warning-section">
                        <div class="warning-box">
                            <strong>⚠️ Important:</strong> Changing dates may affect ${this.milestones.length} existing milestone(s). 
                            Milestones outside the new date range will need to be adjusted.
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer project-config-footer">
                ${isExisting ? `<button class="btn btn-danger" onclick="RoadmapManager.showResetConfirmation()">Reset Project</button>` : ''}
                <button class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
                <button class="btn btn-primary" onclick="RoadmapManager.saveProjectConfig()">
                    ${isExisting ? 'Update Project' : 'Create Project'}
                </button>
            </div>
        `;
        
        app.showModal(modalContent);
        
        // Set up date input validation
        this.setupDateValidation();
    }

    /**
     * Set up dynamic date validation
     */
    static setupDateValidation() {
        const startDateInput = document.getElementById('projectStartDate');
        const endDateInput = document.getElementById('projectEndDate');
        
        if (startDateInput && endDateInput) {
            startDateInput.addEventListener('change', () => {
                endDateInput.min = startDateInput.value;
                if (endDateInput.value && new Date(endDateInput.value) <= new Date(startDateInput.value)) {
                    endDateInput.value = '';
                }
            });
        }
    }

    /**
     * Save project configuration with enhanced validation and milestone handling
     */
    static async saveProjectConfig() {
        try {
            // Get form elements
            const nameInput = document.getElementById('projectName');
            const descInput = document.getElementById('projectDescription');
            const startDateInput = document.getElementById('projectStartDate');
            const endDateInput = document.getElementById('projectEndDate');
            const statusInput = document.getElementById('projectStatus');
            
            if (!nameInput || !startDateInput || !endDateInput) {
                throw new Error('Required form elements not found');
            }
            
            const isExisting = !!this.projectConfig;
            const oldConfig = this.projectConfig ? { ...this.projectConfig } : null;
            
            const config = {
                name: nameInput.value.trim(),
                description: descInput ? descInput.value.trim() : '',
                startDate: startDateInput.value,
                endDate: endDateInput.value,
                status: statusInput ? statusInput.value : 'active',
                createdAt: this.projectConfig?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Enhanced validation
            const validation = this.validateProjectConfig(config);
            if (!validation.isValid) {
                throw new Error(validation.errors.join('\n'));
            }
            
            // Check milestone compatibility if dates changed
            const milestonesNeedAdjustment = await this.checkMilestoneCompatibility(config, oldConfig);
            if (milestonesNeedAdjustment.length > 0) {
                const shouldContinue = await this.showMilestoneAdjustmentDialog(milestonesNeedAdjustment);
                if (!shouldContinue) {
                    return; // User cancelled
                }
            }
            
            // Save to storage using data model
            const roadmapModel = StorageManager.createRoadmapModel({
                projectName: config.name,
                description: config.description,
                startDate: config.startDate,
                endDate: config.endDate,
                status: config.status
            });
            
            // Ensure the config has the name field for consistency
            const finalConfig = {
                ...roadmapModel,
                name: roadmapModel.projectName || config.name,
                description: config.description,
                startDate: config.startDate,
                endDate: config.endDate,
                status: config.status,
                createdAt: roadmapModel.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await StorageManager.set('project_config', finalConfig);
            this.projectConfig = finalConfig;
            
            // Adjust milestones if needed
            if (milestonesNeedAdjustment.length > 0) {
                await this.adjustIncompatibleMilestones(milestonesNeedAdjustment, config);
            }
            
            // Update UI
            this.updateProjectInfo();
            this.updateMilestoneList();
            
            // Success feedback
            app.hideModal();
            const message = isExisting ? 'Project updated successfully!' : 'Project created successfully!';
            app.showSuccess(message);
            
            console.log('Project configuration saved:', finalConfig);
            console.log('Config name:', finalConfig.name);
            console.log('Config description:', finalConfig.description);
            
        } catch (error) {
            console.error('Failed to save project config:', error);
            app.showError(error.message);
        }
    }

    /**
     * Validate project configuration
     */
    static validateProjectConfig(config) {
        const errors = [];
        
        // Name validation
        if (!config.name) {
            errors.push('Project name is required');
        } else if (config.name.length < 3) {
            errors.push('Project name must be at least 3 characters long');
        } else if (config.name.length > 100) {
            errors.push('Project name must be less than 100 characters');
        }
        
        // Date validation
        if (!config.startDate || !config.endDate) {
            errors.push('Start and end dates are required');
        } else {
            const startDate = new Date(config.startDate);
            const endDate = new Date(config.endDate);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                errors.push('Invalid date format');
            } else {
                if (startDate >= endDate) {
                    errors.push('End date must be after start date');
                }
                
                // Project duration checks
                const durationDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
                if (durationDays < 1) {
                    errors.push('Project must be at least 1 day long');
                } else if (durationDays > 1825) { // 5 years
                    errors.push('Project duration cannot exceed 5 years');
                }
                
                // Date range checks
                const now = new Date();
                const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
                const fiveYearsFromNow = new Date(now.getTime() + (5 * 365 * 24 * 60 * 60 * 1000));
                
                if (startDate < oneYearAgo) {
                    errors.push('Start date cannot be more than 1 year in the past');
                }
                
                if (endDate > fiveYearsFromNow) {
                    errors.push('End date cannot be more than 5 years in the future');
                }
            }
        }
        
        // Description validation
        if (config.description && config.description.length > 1000) {
            errors.push('Description must be less than 1000 characters');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Check milestone compatibility with new project dates
     */
    static async checkMilestoneCompatibility(newConfig, oldConfig) {
        if (!this.milestones || this.milestones.length === 0) {
            return [];
        }
        
        if (!oldConfig) {
            return []; // New project, no compatibility issues
        }
        
        const newStartDate = new Date(newConfig.startDate);
        const newEndDate = new Date(newConfig.endDate);
        const incompatibleMilestones = [];
        
        this.milestones.forEach(milestone => {
            const milestoneDate = new Date(milestone.date);
            if (milestoneDate < newStartDate || milestoneDate > newEndDate) {
                incompatibleMilestones.push(milestone);
            }
        });
        
        return incompatibleMilestones;
    }

    /**
     * Show milestone adjustment dialog
     */
    static async showMilestoneAdjustmentDialog(incompatibleMilestones) {
        const milestoneList = incompatibleMilestones
            .map(m => `• ${m.title} (${this.formatDate(m.date)})`)
            .join('\n');
        
        const message = `The following ${incompatibleMilestones.length} milestone(s) are outside the new project date range:\n\n${milestoneList}\n\nThese milestones will be automatically adjusted or removed. Continue?`;
        
        return confirm(message);
    }

    /**
     * Adjust incompatible milestones
     */
    static async adjustIncompatibleMilestones(incompatibleMilestones, newConfig) {
        const newStartDate = new Date(newConfig.startDate);
        const newEndDate = new Date(newConfig.endDate);
        let adjustedCount = 0;
        let removedCount = 0;
        
        for (const milestone of incompatibleMilestones) {
            const milestoneDate = new Date(milestone.date);
            
            // Try to adjust milestone date
            if (milestoneDate < newStartDate) {
                // Move to start date
                milestone.date = newConfig.startDate;
                milestone.updatedAt = new Date().toISOString();
                await StorageManager.saveToStore('milestones', milestone);
                adjustedCount++;
            } else if (milestoneDate > newEndDate) {
                // Move to end date
                milestone.date = newConfig.endDate;
                milestone.updatedAt = new Date().toISOString();
                await StorageManager.saveToStore('milestones', milestone);
                adjustedCount++;
            }
        }
        
        // Reload milestones
        await this.loadProjectData();
        
        if (adjustedCount > 0 || removedCount > 0) {
            const message = `Milestone adjustment complete: ${adjustedCount} adjusted, ${removedCount} removed`;
            app.showSuccess(message);
        }
    }

    /**
     * Show milestone creation modal
     */
    static showMilestoneModal(clickX) {
        if (!this.projectConfig) return;
        
        // Calculate date based on click position
        const roadWidth = this.canvasWidth - 100;
        const roadX = 50;
        const position = (clickX - roadX) / roadWidth;
        
        const startDate = new Date(this.projectConfig.startDate);
        const endDate = new Date(this.projectConfig.endDate);
        const totalDuration = endDate.getTime() - startDate.getTime();
        const suggestedDate = new Date(startDate.getTime() + (totalDuration * position));
        
        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">Add Milestone</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Milestone Title</label>
                    <input type="text" class="form-input" id="milestoneTitle" 
                           placeholder="Enter milestone title">
                </div>
                <div class="form-group">
                    <label class="form-label">Date</label>
                    <input type="date" class="form-input" id="milestoneDate" 
                           value="${suggestedDate.toISOString().split('T')[0]}"
                           min="${this.projectConfig.startDate}" 
                           max="${this.projectConfig.endDate}">
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-textarea" id="milestoneDescription" 
                              placeholder="Enter milestone description"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
                <button class="btn btn-primary" onclick="RoadmapManager.saveMilestone()">Add Milestone</button>
            </div>
        `;
        
        app.showModal(modalContent);
    }

    /**
     * Save new milestone with enhanced data model
     */
    static async saveMilestone() {
        try {
            const titleInput = document.getElementById('milestoneTitle');
            const dateInput = document.getElementById('milestoneDate');
            const descriptionInput = document.getElementById('milestoneDescription');
            
            if (!titleInput || !dateInput) {
                throw new Error('Form elements not found');
            }
            
            const milestoneData = {
                title: titleInput.value.trim(),
                date: dateInput.value,
                description: descriptionInput ? descriptionInput.value.trim() : '',
                projectId: 'default',
                completed: false,
                completedAt: null
            };
            
            // Use storage manager data model
            const milestone = StorageManager.createMilestoneModel(milestoneData);
            
            // Validation using storage manager
            const validation = StorageManager.validateMilestoneData(milestone);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            
            // Additional validation for date range
            const milestoneDate = new Date(milestone.date);
            const startDate = new Date(this.projectConfig.startDate);
            const endDate = new Date(this.projectConfig.endDate);
            
            if (milestoneDate < startDate || milestoneDate > endDate) {
                throw new Error('Milestone date must be within project timeline');
            }
            
            // Check for duplicate milestones on same date
            const existingOnSameDate = this.milestones.find(m => m.date === milestone.date);
            if (existingOnSameDate) {
                if (!confirm(`A milestone already exists on ${milestone.date}. Do you want to create another one?`)) {
                    return;
                }
            }
            
            // Save to storage
            await StorageManager.saveToStore('milestones', milestone);
            
            // Add to local array
            this.milestones.push(milestone);
            
            // Sort milestones by date
            this.milestones.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Clear milestone bounds to force recalculation
            this.milestoneBounds = null;
            
            // Update milestone list display
            this.updateMilestoneList();
            
            app.hideModal();
            app.showSuccess('Milestone added successfully!');
            
            console.log('Milestone created:', milestone);
            
        } catch (error) {
            console.error('Failed to save milestone:', error);
            app.showError(error.message);
        }
    }

    /**
     * Refresh the roadmap display
     */
    static async refresh() {
        await this.loadProjectData();
        this.draw();
    }

    /**
     * Format date for display
     */
    static formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }

    /**
     * Get progress information based on current date
     */
    static getProgressInfo() {
        if (!this.projectConfig) {
            return { status: 'Not Set', color: '#718096' };
        }

        const now = new Date();
        const startDate = new Date(this.projectConfig.startDate);
        const endDate = new Date(this.projectConfig.endDate);
        
        if (now < startDate) {
            const daysUntilStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
            return { 
                status: `Starts in ${daysUntilStart} days`, 
                color: '#059669' 
            };
        } else if (now > endDate) {
            const daysOverdue = Math.ceil((now - endDate) / (1000 * 60 * 60 * 24));
            return { 
                status: `${daysOverdue} days overdue`, 
                color: '#dc2626' 
            };
        } else {
            const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            const daysElapsed = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
            const daysRemaining = totalDays - daysElapsed;
            
            if (daysRemaining <= 3) {
                return { 
                    status: `${daysRemaining} days left`, 
                    color: '#dc2626' 
                };
            } else if (daysRemaining <= 7) {
                return { 
                    status: `${daysRemaining} days left`, 
                    color: '#d97706' 
                };
            } else {
                return { 
                    status: `${daysRemaining} days left`, 
                    color: '#059669' 
                };
            }
        }
    }

    /**
     * Add rounded rectangle support for older browsers
     */
    static addRoundRectSupport() {
        if (!CanvasRenderingContext2D.prototype.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
                if (width < 2 * radius) radius = width / 2;
                if (height < 2 * radius) radius = height / 2;
                
                this.beginPath();
                this.moveTo(x + radius, y);
                this.arcTo(x + width, y, x + width, y + height, radius);
                this.arcTo(x + width, y + height, x, y + height, radius);
                this.arcTo(x, y + height, x, y, radius);
                this.arcTo(x, y, x + width, y, radius);
                this.closePath();
            };
        }
    }

    /**
     * Enhanced date formatting with relative time
     */
    static formatDateWithRelative(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const formatted = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        if (diffDays === 0) {
            return `${formatted} (Today)`;
        } else if (diffDays === 1) {
            return `${formatted} (Tomorrow)`;
        } else if (diffDays === -1) {
            return `${formatted} (Yesterday)`;
        } else if (diffDays > 0 && diffDays <= 7) {
            return `${formatted} (${diffDays} days)`;
        } else if (diffDays < 0 && diffDays >= -7) {
            return `${formatted} (${Math.abs(diffDays)} days ago)`;
        }
        
        return formatted;
    }

    /**
     * Update current date display in UI
     */
    static updateCurrentDateDisplay() {
        const currentDateElement = document.getElementById('currentDate');
        if (currentDateElement) {
            const now = new Date();
            const options = { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                weekday: 'short'
            };
            currentDateElement.textContent = now.toLocaleDateString('en-US', options);
        }
    }

    /**
     * Set up milestone-related event listeners
     */
    static setupMilestoneEventListeners() {
        // Canvas click for milestone interaction
        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        
        // Add milestone button
        const addMilestoneBtn = document.getElementById('addMilestoneBtn');
        if (addMilestoneBtn) {
            addMilestoneBtn.addEventListener('click', () => {
                if (this.projectConfig) {
                    this.showMilestoneModal(this.canvasWidth / 2);
                } else {
                    app.showError('Please configure your project first');
                }
            });
        }
    }

    /**
     * Update milestone list display
     */
    static updateMilestoneList() {
        const milestoneList = document.getElementById('milestoneList');
        if (!milestoneList) return;

        if (!this.milestones || this.milestones.length === 0) {
            milestoneList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🏔️</div>
                    <div class="empty-state-title">No milestones yet</div>
                    <div class="empty-state-text">Click "Add Milestone" or click on the roadmap to create your first milestone</div>
                </div>
            `;
            return;
        }

        // Sort milestones by date
        const sortedMilestones = [...this.milestones].sort((a, b) => new Date(a.date) - new Date(b.date));

        const milestonesHTML = sortedMilestones.map((milestone, index) => {
            const milestoneDate = new Date(milestone.date);
            const now = new Date();
            const isCompleted = milestone.completed;
            const isOverdue = !isCompleted && now > milestoneDate;
            const daysFromNow = Math.ceil((milestoneDate - now) / (1000 * 60 * 60 * 24));

            let statusClass = 'upcoming';
            let statusText = '';
            let statusIcon = '⏰';

            if (isCompleted) {
                statusClass = 'completed';
                statusText = 'Completed';
                statusIcon = '✅';
            } else if (isOverdue) {
                statusClass = 'overdue';
                statusText = `${Math.abs(daysFromNow)} days overdue`;
                statusIcon = '⚠️';
            } else if (daysFromNow === 0) {
                statusClass = 'today';
                statusText = 'Due today';
                statusIcon = '🎯';
            } else if (daysFromNow === 1) {
                statusText = 'Due tomorrow';
                statusIcon = '⏰';
            } else if (daysFromNow <= 7) {
                statusText = `${daysFromNow} days left`;
                statusIcon = '⏰';
            } else {
                statusText = `${daysFromNow} days left`;
                statusIcon = '📅';
            }

            return `
                <div class="milestone-item ${statusClass}" onclick="RoadmapManager.showMilestoneDetailsModal(RoadmapManager.milestones[${this.milestones.indexOf(milestone)}], ${this.milestones.indexOf(milestone)})">
                    <div class="milestone-content">
                        <div class="milestone-flag">${statusIcon}</div>
                        <div class="milestone-details">
                            <div class="milestone-title">${milestone.title}</div>
                            <div class="milestone-date">${this.formatDate(milestone.date)} - ${statusText}</div>
                            ${milestone.description ? `<div class="milestone-description">${milestone.description.substring(0, 100)}${milestone.description.length > 100 ? '...' : ''}</div>` : ''}
                        </div>
                    </div>
                    <div class="milestone-actions">
                        <button class="milestone-edit" onclick="event.stopPropagation(); RoadmapManager.showMilestoneDetailsModal(RoadmapManager.milestones[${this.milestones.indexOf(milestone)}], ${this.milestones.indexOf(milestone)})">Edit</button>
                        <button class="milestone-delete" onclick="event.stopPropagation(); RoadmapManager.deleteMilestone(${this.milestones.indexOf(milestone)})">Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        milestoneList.innerHTML = milestonesHTML;
    }

    /**
     * Show reset confirmation dialog
     */
    static showResetConfirmation() {
        const milestoneCount = this.milestones?.length || 0;
        
        const confirmationContent = `
            <div class="modal-header">
                <h3 class="modal-title">⚠️ Reset Project</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="warning-section">
                    <div class="reset-warning">
                        <h4>This action will permanently delete:</h4>
                        <ul>
                            <li>Current project configuration</li>
                            <li>All ${milestoneCount} milestone(s)</li>
                            <li>Project progress history</li>
                        </ul>
                        <p><strong>This action cannot be undone.</strong></p>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Type "RESET" to confirm:</label>
                    <input type="text" class="form-input" id="resetConfirmation" 
                           placeholder="Type RESET to confirm">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
                <button class="btn btn-danger" onclick="RoadmapManager.performReset()">Reset Project</button>
            </div>
        `;
        
        app.showModal(confirmationContent);
    }

    /**
     * Perform complete project reset
     */
    static async performReset() {
        try {
            const confirmationInput = document.getElementById('resetConfirmation');
            if (!confirmationInput || confirmationInput.value !== 'RESET') {
                app.showError('Please type "RESET" to confirm');
                return;
            }
            
            console.log('Performing project reset...');
            
            // Clear project configuration
            await StorageManager.remove('project_config');
            this.projectConfig = null;
            
            // Delete all milestones
            if (this.milestones && this.milestones.length > 0) {
                for (const milestone of this.milestones) {
                    await StorageManager.deleteFromStore('milestones', milestone.id);
                }
            }
            this.milestones = [];
            
            // Clear milestone bounds
            this.milestoneBounds = null;
            
            // Reset car position
            this.carPosition = 0;
            this.carMovementOffset = 0;
            
            // Update UI
            this.updateProjectInfo();
            this.updateMilestoneList();
            
            // Force canvas redraw
            this.draw();
            
            app.hideModal();
            app.showSuccess('Project reset successfully! You can now create a new project.');
            
            console.log('Project reset completed');
            
        } catch (error) {
            console.error('Failed to reset project:', error);
            app.showError('Failed to reset project: ' + error.message);
        }
    }

    /**
     * Export project configuration and milestones
     */
    static async exportProjectData() {
        try {
            if (!this.projectConfig) {
                throw new Error('No project configuration to export');
            }
            
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                projectConfig: this.projectConfig,
                milestones: this.milestones || [],
                statistics: this.getProjectStatistics()
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${this.projectConfig.name.replace(/[^a-z0-9]/gi, '_')}_roadmap_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            app.showSuccess('Project data exported successfully!');
            
        } catch (error) {
            console.error('Failed to export project:', error);
            app.showError('Failed to export project: ' + error.message);
        }
    }

    /**
     * Import project configuration and milestones
     */
    static async importProjectData(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            // Validate import data
            if (!importData.projectConfig) {
                throw new Error('Invalid import file: missing project configuration');
            }
            
            // Confirm import
            const existingProject = this.projectConfig?.name || 'None';
            const message = `Import project "${importData.projectConfig.name}"?\n\nThis will replace:\n- Current project: ${existingProject}\n- All existing milestones\n\nContinue?`;
            
            if (!confirm(message)) {
                return;
            }
            
            // Import project configuration
            this.projectConfig = importData.projectConfig;
            await StorageManager.set('project_config', this.projectConfig);
            
            // Clear existing milestones
            if (this.milestones && this.milestones.length > 0) {
                for (const milestone of this.milestones) {
                    await StorageManager.deleteFromStore('milestones', milestone.id);
                }
            }
            
            // Import milestones
            this.milestones = [];
            if (importData.milestones && importData.milestones.length > 0) {
                for (const milestone of importData.milestones) {
                    // Generate new ID to avoid conflicts
                    const newMilestone = StorageManager.createMilestoneModel(milestone);
                    await StorageManager.saveToStore('milestones', newMilestone);
                    this.milestones.push(newMilestone);
                }
            }
            
            // Update UI
            this.updateProjectInfo();
            this.updateMilestoneList();
            this.draw();
            
            app.showSuccess(`Project "${importData.projectConfig.name}" imported successfully!`);
            
        } catch (error) {
            console.error('Failed to import project:', error);
            app.showError('Failed to import project: ' + error.message);
        }
    }

    /**
     * Get project statistics
     */
    static getProjectStatistics() {
        if (!this.projectConfig) {
            return null;
        }
        
        const startDate = new Date(this.projectConfig.startDate);
        const endDate = new Date(this.projectConfig.endDate);
        const now = new Date();
        
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const elapsedDays = Math.max(0, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
        const remainingDays = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
        const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
        
        const completedMilestones = this.milestones?.filter(m => m.completed).length || 0;
        const totalMilestones = this.milestones?.length || 0;
        const overdueMilestones = this.milestones?.filter(m => !m.completed && new Date(m.date) < now).length || 0;
        
        return {
            totalDays,
            elapsedDays,
            remainingDays,
            progressPercent,
            totalMilestones,
            completedMilestones,
            overdueMilestones,
            milestonesCompletionRate: totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0
        };
    }

    /**
     * Clean up resources
     */
    static cleanup() {
        this.stopAnimation();
        this.isInitialized = false;
    }
}

// Export for module usage
if (typeof window !== 'undefined') {
    window.RoadmapManager = RoadmapManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoadmapManager;
}