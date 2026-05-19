import { events } from '../core/CentralEventBus.js';

export class UIManager {
    constructor() {
        this.scoreElement = document.getElementById('score');
        this.speedElement = document.getElementById('speed');
        this.gameOverElement = document.getElementById('game-over');
        this.finalScoreElement = document.getElementById('final-score');
        this.uiContainer = document.getElementById('ui');
        
        this.highScoreKey = 'neon-surge-high-scores';
        this.maxHighScores = 5;
        
        this.initCrosshair();
        this.initLeaderboard();
        this.initMultiplier();
        this.initEventListeners();
    }

    initEventListeners() {
        events.on('SCORE_UPDATE', (data) => {
            this.updateScore(data.score);
        });

        events.on('MULTIPLIER_UPDATE', (data) => {
            this.updateMultiplier(data.multiplier);
        });

        events.on('SPEED_UPDATE', (data) => {
            this.updateSpeed(data.speed);
        });

        events.on('LEVEL_UP', () => {
            this.triggerGlitch();
        });

        events.on('GAME_OVER', (data) => {
            this.showGameOver(data.score);
        });

        events.on('GAME_START', () => {
            this.hideAllOverlays();
        });
    }

    createOverlay(id, title, subtitle, buttonText, callback) {
        const overlay = document.createElement('div');
        overlay.id = id;
        overlay.style.cssText = `
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            display: flex; flex-direction: column;
            justify-content: center; align-items: center;
            background: rgba(0, 0, 0, 0.85);
            color: #00ffff; font-family: 'Courier New', Courier, monospace;
            z-index: 2000; text-align: center;
            text-shadow: 0 0 10px #00ffff;
        `;

        const h1 = document.createElement('h1');
        h1.textContent = title;
        h1.style.fontSize = '4rem';
        h1.style.margin = '0';
        overlay.appendChild(h1);

        if (subtitle) {
            const p = document.createElement('p');
            p.textContent = subtitle;
            p.style.fontSize = '1.2rem';
            overlay.appendChild(p);
        }

        const btn = document.createElement('button');
        btn.textContent = buttonText;
        btn.style.cssText = `
            margin-top: 30px; padding: 15px 40px;
            background: transparent; color: #00ffff;
            border: 2px solid #00ffff; font-family: inherit;
            font-size: 1.5rem; cursor: pointer;
            transition: all 0.3s ease;
        `;
        btn.onmouseover = () => {
            btn.style.background = '#00ffff';
            btn.style.color = '#000';
        };
        btn.onmouseout = () => {
            btn.style.background = 'transparent';
            btn.style.color = '#00ffff';
        };
        btn.onclick = callback;
        overlay.appendChild(btn);

        document.body.appendChild(overlay);
        return overlay;
    }

    hideAllOverlays() {
        const overlays = ['main-menu', 'pause-menu', 'game-over'];
        overlays.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    showMenu(callback) {
        if (!document.getElementById('main-menu')) {
            this.createOverlay(
                'main-menu', 
                'NEON SURGE', 
                'SYNC YOUR CONSCIOUSNESS TO THE GRID', 
                'INITIATE', 
                callback
            );
        }
        document.getElementById('main-menu').style.display = 'flex';
    }

    showPause(callback) {
        if (!document.getElementById('pause-menu')) {
            this.createOverlay(
                'pause-menu', 
                'LINK SUSPENDED', 
                'NEURAL INTERFACE ON STANDBY', 
                'RESUME', 
                callback
            );
        }
        document.getElementById('pause-menu').style.display = 'flex';
    }

    initCrosshair() {
        const existing = document.getElementById('crosshair');
        if (existing) {
            this.crosshair = existing;
            return;
        }
        this.crosshair = document.createElement('div');
        this.crosshair.id = 'crosshair';
        const inner = document.createElement('div');
        inner.className = 'crosshair-inner';
        this.crosshair.appendChild(inner);
        document.body.appendChild(this.crosshair);
    }

    updateCrosshair(x, y, isLocked) {
        if (!this.crosshair) return;
        // Assume x, y are pixel values
        this.crosshair.style.left = `${x}px`;
        this.crosshair.style.top = `${y}px`;
        
        if (isLocked) {
            this.crosshair.classList.add('locked');
        } else {
            this.crosshair.classList.remove('locked');
        }
    }

    triggerGlitch() {
        if (this.uiContainer) {
            this.uiContainer.classList.add('glitch-active');
            setTimeout(() => {
                this.uiContainer.classList.remove('glitch-active');
            }, 500);
        }
    }

    updateScore(score) {
        if (this.scoreElement) {
            this.scoreElement.textContent = `SCORE: ${score.toString().padStart(4, '0')}`;
        }
    }

    updateSpeed(speed) {
        if (this.speedElement) {
            this.speedElement.textContent = `SPEED: ${speed.toFixed(1)}x`;
        }
    }

    initMultiplier() {
        const existing = document.getElementById('multiplier');
        if (existing) {
            this.multiplierElement = existing;
            return;
        }
        this.multiplierElement = document.createElement('div');
        this.multiplierElement.id = 'multiplier';
        this.multiplierElement.textContent = 'COMBO: x1';
        document.body.appendChild(this.multiplierElement);
    }

    updateMultiplier(multiplier) {
        if (!this.multiplierElement) return;
        this.multiplierElement.textContent = `COMBO: x${multiplier}`;
        
        this.multiplierElement.classList.remove('multiplier-flash');
        void this.multiplierElement.offsetWidth;
        this.multiplierElement.classList.add('multiplier-flash');
    }

    saveHighScore(score) {
        let scores = this.getHighScores();
        scores.push({ score, date: new Date().toISOString() });
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, this.maxHighScores);
        localStorage.setItem(this.highScoreKey, JSON.stringify(scores));
    }

    getHighScores() {
        const scores = localStorage.getItem(this.highScoreKey);
        return scores ? JSON.parse(scores) : [];
    }

    initLeaderboard() {
        const existing = document.getElementById('leaderboard');
        if (existing) {
            this.leaderboardElement = existing;
            return;
        }
        this.leaderboardElement = document.createElement('div');
        this.leaderboardElement.id = 'leaderboard';
        if (this.gameOverElement) {
            this.gameOverElement.appendChild(this.leaderboardElement);
        }
    }

    updateLeaderboardUI() {
        const scores = this.getHighScores();
        let html = '<h3>TOP SCORES</h3>';
        scores.forEach((s, i) => {
            html += `<div class="leaderboard-entry">#${i + 1} - ${s.score.toString().padStart(4, '0')}</div>`;
        });
        this.leaderboardElement.innerHTML = html;
    }

    showGameOver(finalScore) {
        if (this.gameOverElement && this.finalScoreElement) {
            this.finalScoreElement.textContent = `SCORE: ${finalScore}`;
            this.saveHighScore(finalScore);
            this.updateLeaderboardUI();
            this.gameOverElement.style.display = 'block';
        }
    }
}
