import * as THREE from 'three';
import { Engine } from './js/core/Engine.js';
import { InputHandler } from './js/systems/InputHandler.js';
import { AudioManager } from './js/systems/AudioManager.js';
import { Player } from './js/entities/Player.js';
import { Obstacle } from './js/entities/Obstacle.js';
import { CollisionSystem } from './js/systems/CollisionSystem.js';
import { UIManager } from './js/systems/UIManager.js';
import { events } from './js/core/CentralEventBus.js';

// --- CONFIGURATION ---
const TUNNEL_RADIUS = 10;
const TUNNEL_SEGMENTS = 64;
const TUNNEL_LENGTH = 200;
const INITIAL_SPEED = 0.5;
const SPEED_INCREMENT = 0.0001;
const OBSTACLE_SPAWN_INTERVAL = 20;

/**
 * GameState enum for the state machine.
 */
const GameState = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
};

// --- INITIALIZATION ---
const engine = new Engine();
const inputHandler = new InputHandler();
const audioManager = new AudioManager();
const collisionSystem = new CollisionSystem();
const uiManager = new UIManager();
const player = new Player();

// --- SETUP SCENE ---
engine.scene.fog = new THREE.FogExp2(0x000000, 0.02);
engine.scene.add(player.mesh);

const neonLight = new THREE.PointLight(0x00ffff, 100, 100);
engine.camera.add(neonLight);
engine.scene.add(engine.camera);

// --- GAME STATE ---
let currentState = GameState.MENU;
let score = 0;
let level = 1;
let comboMultiplier = 1;
let speed = INITIAL_SPEED;
let obstacles = [];
let tunnelSegments = [];
let lastObstacleZ = 0;

// --- TUNNEL GENERATION ---
function createTunnelSegment(z) {
    const geometry = new THREE.CylinderGeometry(TUNNEL_RADIUS, TUNNEL_RADIUS, TUNNEL_LENGTH, TUNNEL_SEGMENTS, 1, true);
    const material = new THREE.MeshStandardMaterial({
        color: 0x111111,
        wireframe: true,
        side: THREE.BackSide,
        emissive: 0x330033,
        emissiveIntensity: 0.5
    });
    const segment = new THREE.Mesh(geometry, material);
    segment.rotation.x = Math.PI / 2;
    segment.position.z = z;
    engine.scene.add(segment);
    return segment;
}

for (let i = 0; i < 3; i++) {
    tunnelSegments.push(createTunnelSegment(-i * TUNNEL_LENGTH));
}

// --- INITIALIZE UI ---
uiManager.showMenu(() => setGameState(GameState.PLAYING));

// --- STATE MANAGEMENT ---
function setGameState(newState) {
    const oldState = currentState;
    currentState = newState;

    // Handle UI visibility
    if (newState === GameState.MENU) {
        uiManager.showMenu(() => setGameState(GameState.PLAYING));
    } else if (newState === GameState.PAUSED) {
        uiManager.showPause(() => setGameState(GameState.PLAYING));
    } else if (newState === GameState.PLAYING) {
        uiManager.hideAllOverlays();
        if (oldState === GameState.MENU) {
            events.emit('GAME_START');
        }
    }
}

/**
 * Serializes the current game state into a JSON-compatible object.
 */
function exportGameState() {
    const state = {
        meta: {
            timestamp: Date.now(),
            version: '1.0.0'
        },
        game: {
            score,
            level,
            speed,
            comboMultiplier,
            lastObstacleZ
        },
        player: {
            position: {
                x: player.logicPosition.x,
                y: player.logicPosition.y
            },
            velocity: {
                x: player.velocity.x,
                y: player.velocity.y
            }
        },
        obstacles: obstacles.map(obs => ({
            x: obs.mesh.position.x,
            y: obs.mesh.position.y,
            z: obs.mesh.position.z,
            type: obs.type || 'standard'
        }))
    };
    
    const json = JSON.stringify(state);
    localStorage.setItem('neon_surge_save', json);
    console.log('SYSTEM: Neural state synchronized to local buffer.');
    return json;
}

/**
 * Restores the game state from a JSON object.
 */
function importGameState(jsonString) {
    try {
        const state = JSON.parse(jsonString || localStorage.getItem('neon_surge_save'));
        if (!state) return false;

        // Restore core variables
        score = state.game.score;
        level = state.game.level;
        speed = state.game.speed;
        comboMultiplier = state.game.comboMultiplier;
        lastObstacleZ = state.game.lastObstacleZ;

        // Restore player
        player.logicPosition.set(state.player.position.x, state.player.position.y);
        player.mesh.position.set(state.player.position.x, state.player.position.y, 0);

        // Clear and restore obstacles
        obstacles.forEach(obs => engine.scene.remove(obs.mesh));
        obstacles = [];
        state.obstacles.forEach(data => {
            const obs = new Obstacle(data.z);
            obs.mesh.position.set(data.x, data.y, data.z);
            engine.scene.add(obs.mesh);
            obstacles.push(obs);
        });

        // Update UI
        events.emit('SCORE_UPDATE', { score });
        events.emit('SPEED_UPDATE', { speed });
        events.emit('MULTIPLIER_UPDATE', { multiplier: comboMultiplier });

        console.log('SYSTEM: Neural state restored from buffer.');
        return true;
    } catch (e) {
        console.error('SYSTEM ERROR: Neural state corruption detected.', e);
        return false;
    }
}

// --- ADVANCED SPAWNING (PATTERN-BASED) ---
function spawnPattern() {
    const patternType = Math.random();
    const z = -200; // Spawn deep in the tunnel
    
    // Weighted selection: 50% Random, 30% Wall, 20% Spiral
    if (patternType < 0.5) {
        createObstacle(z);
    } else if (patternType < 0.8) {
        // WALL PATTERN: A semi-circle of obstacles
        const count = 4;
        const baseAngle = Math.random() * Math.PI * 2;
        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (i * 0.5);
            createObstacle(z, angle, TUNNEL_RADIUS - 2);
        }
    } else {
        // SPIRAL PATTERN: A sequence of obstacles forming a vortex
        const count = 6;
        const startAngle = Math.random() * Math.PI * 2;
        for (let i = 0; i < count; i++) {
            const angle = startAngle + (i * (Math.PI / 3));
            createObstacle(z - (i * 12), angle, TUNNEL_RADIUS - 3);
        }
    }
}

function createObstacle(z, angle = null, radius = null) {
    const obstacle = new Obstacle(z);
    if (angle !== null && radius !== null) {
        // Override random position with pattern position
        obstacle.mesh.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            z
        );
        obstacle.basePosition.copy(obstacle.mesh.position);
    }
    engine.scene.add(obstacle.mesh);
    obstacles.push(obstacle);
}

// --- LEVEL MILESTONES ---
function checkLevelUp() {
    const threshold = level * 500;
    if (score >= threshold) {
        level++;
        
        // Cycle environment colors
        const palette = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff00ff, 0x00ffff];
        const newColor = palette[level % palette.length];
        
        // Environment shift
        engine.scene.fog.color.setHex(newColor);
        tunnelSegments.forEach(seg => {
            seg.material.emissive.setHex(newColor);
            seg.material.emissiveIntensity = 0.5 + (level * 0.1);
        });

        // Audio intensity shift (tempo increases with level)
        events.emit('SPEED_UPDATE', { speed: 1.0 + (level * 0.05) });
        
        // Visual feedback
        events.emit('LEVEL_UP');
        console.log(`SYSTEM UPGRADE: LEVEL ${level} REACHED`);
    }
}

// --- INPUT HANDLERS ---
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'p' || e.key === 'Escape') {
        if (currentState === GameState.PLAYING) {
            setGameState(GameState.PAUSED);
        } else if (currentState === GameState.PAUSED) {
            setGameState(GameState.PLAYING);
        }
    }
    
    if (e.code === 'Space' && currentState === GameState.PLAYING) {
        const direction = new THREE.Vector2(0, 0);
        if (inputHandler.isPressed('a') || inputHandler.isPressed('ArrowLeft')) direction.x -= 1;
        if (inputHandler.isPressed('d') || inputHandler.isPressed('ArrowRight')) direction.x += 1;
        if (inputHandler.isPressed('w') || inputHandler.isPressed('ArrowUp')) direction.y += 1;
        if (inputHandler.isPressed('s') || inputHandler.isPressed('ArrowDown')) direction.y -= 1;
        
        if (direction.length() > 0) {
            player.dash(direction);
        }
    }
});

// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);

    if (currentState === GameState.PLAYING) {
        // Update Player
        player.update(speed, inputHandler);

        // Update Game State
        speed += SPEED_INCREMENT;
        
        // Update Obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obstacle = obstacles[i];
            obstacle.update(speed);

            // Near Miss Detection
            if (!obstacle.hasBeenDodged && obstacle.mesh.position.z > player.mesh.position.z) {
                const dx = obstacle.mesh.position.x - player.mesh.position.x;
                const dy = obstacle.mesh.position.y - player.mesh.position.y;
                const distXY = Math.sqrt(dx * dx + dy * dy);
                
                if (distXY < 3.5) {
                    comboMultiplier++;
                    events.emit('MULTIPLIER_UPDATE', { multiplier: comboMultiplier });
                }
                obstacle.hasBeenDodged = true;
            }

            // Scoring and Cleanup
            if (obstacle.mesh.position.z > 10) {
                engine.scene.remove(obstacle.mesh);
                obstacles.splice(i, 1);
                score += 10;
                events.emit('SCORE_UPDATE', { score: score });
                checkLevelUp();
            }
        }

        // Tunnel movement
        tunnelSegments.forEach((segment) => {
            segment.position.z += speed;
            if (segment.position.z > TUNNEL_LENGTH) {
                segment.position.z -= 3 * TUNNEL_LENGTH;
            }
        });

        // Advanced Spawning
        lastObstacleZ += speed;
        if (lastObstacleZ > OBSTACLE_SPAWN_INTERVAL) {
            spawnPattern();
            lastObstacleZ = 0;
        }

        // Collision detection
        if (collisionSystem.checkCollision(player.mesh, obstacles.map(o => o.mesh))) {
            gameOver();
        }

        // UI Updates
        events.emit('SPEED_UPDATE', { speed: speed });
    }

    // Keep rendering even when paused/menu
    engine.render();
}

function gameOver() {
    currentState = GameState.GAME_OVER;
    comboMultiplier = 1;
    events.emit('MULTIPLIER_UPDATE', { multiplier: comboMultiplier });
    events.emit('PLAYER_HIT');
    events.emit('GAME_OVER', { score: score });
}

// Kick off initialization
events.emit('SCORE_UPDATE', { score: score });
events.emit('SPEED_UPDATE', { speed: speed });
animate();
