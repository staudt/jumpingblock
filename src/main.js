import { initInput, updateInput, input, getTouchButtonRect } from './input.js';
import { player, resetPlayer, bufferJump, tryExecuteJump, updatePlayer } from './player.js';
import { testLevel, getGroundYAtX } from './level.js';
import { getMode, CubeRunner } from './modes.js';

// =============================================================================
// Game Constants - TUNING VALUES
// =============================================================================
// Timing
const FIXED_DT = 1 / 60;          // Physics timestep (60 Hz)
const MAX_FRAME_TIME = 0.25;      // Max frame time to prevent spiral of death

// Camera
const CAMERA_SMOOTH = 0.1;        // Camera easing factor (0-1, lower = smoother)
const PLAYER_SCREEN_X = 150;      // Player's fixed screen X position (pixels)

// =============================================================================
// Game State
// =============================================================================
let canvas, ctx;
let lastTime = 0;
let accumulator = 0;

// Scroll speed - TUNING VALUE
const SCROLL_SPEED = 510;         // World scroll speed (pixels/sec)

// Screen shake - TUNING VALUES
const SHAKE_INTENSITY = 15;       // Max shake offset (pixels)
const SHAKE_DURATION = 0.4;       // Shake duration (seconds)

// Particles - TUNING VALUES
const DEATH_PARTICLE_COUNT = 12;  // Number of particles on death
const PARTICLE_SPEED = 400;       // Initial particle speed (pixels/sec)
const PARTICLE_GRAVITY = 800;     // Particle gravity (pixels/sec^2)
const PARTICLE_LIFETIME = 1.0;    // Particle lifetime (seconds)
const PARTICLE_SIZE = 8;          // Particle size (pixels)

// Trail - TUNING VALUES
const TRAIL_LENGTH = 8;           // Number of trail segments
const TRAIL_SPACING = 3;          // Frames between trail updates

// Squash-stretch - TUNING VALUES
const SQUASH_AMOUNT = 0.3;        // Max squash/stretch factor
const SQUASH_RECOVER_SPEED = 10;  // How fast to return to normal

const game = {
    state: 'playing', // 'playing' | 'dead'
    distance: 0,
    score: 0,
    scrollSpeed: SCROLL_SPEED,
    cameraY: 0,
    terrainOffsetY: 0, // Offset to position terrain relative to screen
    level: testLevel,
    currentMode: CubeRunner,
    nextTriggerIndex: 0, // Index of next mode trigger to check
    debug: false, // Debug visualization mode
    shakeTimer: 0, // Screen shake timer
    shakeOffsetX: 0,
    shakeOffsetY: 0,
    particles: [], // Death particles
    trail: [], // Player trail positions
    trailCounter: 0, // Frame counter for trail spacing
    squashStretch: 1, // Current squash-stretch factor (1 = normal)
    wasOnGround: true, // Track ground state for landing detection
    gravityFlipped: false // For GravityFlip mode
};

// =============================================================================
// Initialization
// =============================================================================
function init() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');

    resize();
    window.addEventListener('resize', resize);

    initInput();
    resetGame();

    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Offset terrain so Y=400 in level data appears at 70% of screen height
    game.terrainOffsetY = canvas.height * 0.7 - 400;
}

function resetGame() {
    game.state = 'playing';
    game.distance = 0;
    game.score = 0;
    game.cameraY = 0;
    game.nextTriggerIndex = 0;
    game.shakeTimer = 0;
    game.shakeOffsetX = 0;
    game.shakeOffsetY = 0;
    game.particles = [];
    game.trail = [];
    game.trailCounter = 0;
    game.squashStretch = 1;
    game.wasOnGround = true;
    game.gravityFlipped = false;
    switchMode(CubeRunner);
    const startGroundY = getGroundY(PLAYER_SCREEN_X);
    resetPlayer(startGroundY);
}

function switchMode(newMode) {
    if (game.currentMode && game.currentMode.exit) {
        game.currentMode.exit(game);
    }
    game.currentMode = newMode;
    if (game.currentMode.enter) {
        game.currentMode.enter(game);
    }
}

function checkModeTriggers() {
    const triggers = game.level.modeTriggers;
    // Use player's actual world X position for trigger check
    const playerWorldX = game.distance + PLAYER_SCREEN_X;
    while (game.nextTriggerIndex < triggers.length &&
           playerWorldX >= triggers[game.nextTriggerIndex].atDistance) {
        const trigger = triggers[game.nextTriggerIndex];
        const newMode = getMode(trigger.modeName);
        switchMode(newMode);
        game.nextTriggerIndex++;
    }
}

// Get ground Y at world X using terrain polyline
function getGroundY(worldX) {
    return getGroundYAtX(game.level.terrain, worldX) + game.terrainOffsetY;
}

// Get ceiling Y at world X using ceiling polyline (if exists)
function getCeilingY(worldX) {
    if (!game.level.ceiling) {
        return -Infinity; // No ceiling means infinitely high
    }
    return getGroundYAtX(game.level.ceiling, worldX) + game.terrainOffsetY;
}

// AABB collision check
function aabbCollision(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.width > b.x &&
           a.y < b.y + b.h &&
           a.y + a.height > b.y;
}

// Check player collision with all obstacles
function checkObstacleCollisions() {
    for (const obs of game.level.obstacles) {
        // Offset obstacle Y by terrain offset
        const obsWithOffset = {
            x: obs.x,
            y: obs.y + game.terrainOffsetY,
            w: obs.w,
            h: obs.h
        };
        if (aabbCollision(player, obsWithOffset)) {
            return true;
        }
    }
    return false;
}

function die() {
    game.state = 'dead';
    triggerScreenShake();
    spawnDeathParticles();
    updateHUD();
}

function triggerScreenShake() {
    game.shakeTimer = SHAKE_DURATION;
}

function updateScreenShake(dt) {
    if (game.shakeTimer > 0) {
        game.shakeTimer -= dt;
        const intensity = SHAKE_INTENSITY * (game.shakeTimer / SHAKE_DURATION);
        game.shakeOffsetX = (Math.random() - 0.5) * 2 * intensity;
        game.shakeOffsetY = (Math.random() - 0.5) * 2 * intensity;
    } else {
        game.shakeOffsetX = 0;
        game.shakeOffsetY = 0;
    }
}

function spawnDeathParticles() {
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    const color = game.currentMode.color || '#e94560';

    for (let i = 0; i < DEATH_PARTICLE_COUNT; i++) {
        const angle = (Math.PI * 2 * i) / DEATH_PARTICLE_COUNT + Math.random() * 0.5;
        const speed = PARTICLE_SPEED * (0.5 + Math.random() * 0.5);
        game.particles.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 200, // Bias upward
            life: PARTICLE_LIFETIME,
            color: color
        });
    }
}

function updateParticles(dt) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.vy += PARTICLE_GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;

        if (p.life <= 0) {
            game.particles.splice(i, 1);
        }
    }
}

function renderParticles(scrollX) {
    for (const p of game.particles) {
        const screenX = p.x - scrollX + game.shakeOffsetX;
        const screenY = p.y - game.cameraY + game.shakeOffsetY;
        const alpha = Math.max(0, p.life / PARTICLE_LIFETIME);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(screenX - PARTICLE_SIZE / 2, screenY - PARTICLE_SIZE / 2, PARTICLE_SIZE, PARTICLE_SIZE);
    }
    ctx.globalAlpha = 1;
}

function updateTrail() {
    game.trailCounter++;
    if (game.trailCounter >= TRAIL_SPACING) {
        game.trailCounter = 0;
        game.trail.unshift({ x: player.x, y: player.y });
        if (game.trail.length > TRAIL_LENGTH) {
            game.trail.pop();
        }
    }
}

function renderTrail(scrollX) {
    const color = game.currentMode.color || '#e94560';
    for (let i = 0; i < game.trail.length; i++) {
        const t = game.trail[i];
        const screenX = t.x - scrollX + game.shakeOffsetX;
        const screenY = t.y - game.cameraY + game.shakeOffsetY;
        const alpha = 0.4 * (1 - i / game.trail.length);
        const size = player.width * (1 - i / game.trail.length * 0.3);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(screenX + (player.width - size) / 2, screenY + (player.height - size) / 2, size, size);
    }
    ctx.globalAlpha = 1;
}

function updateSquashStretch(dt) {
    // Detect jump (just left ground going up)
    if (game.wasOnGround && !player.onGround && player.vy < 0) {
        game.squashStretch = 1 + SQUASH_AMOUNT; // Stretch vertically on jump
    }
    // Detect landing (just hit ground)
    if (!game.wasOnGround && player.onGround) {
        game.squashStretch = 1 - SQUASH_AMOUNT; // Squash on landing
    }

    // Recover toward 1
    game.squashStretch += (1 - game.squashStretch) * SQUASH_RECOVER_SPEED * dt;

    game.wasOnGround = player.onGround;
}

// =============================================================================
// Game Loop (Fixed Timestep)
// =============================================================================
function loop(currentTime) {
    requestAnimationFrame(loop);

    let frameTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Clamp frame time to prevent spiral of death
    if (frameTime > MAX_FRAME_TIME) {
        frameTime = MAX_FRAME_TIME;
    }

    // Update input once per frame (before physics)
    updateInput();

    // Toggle debug mode
    if (input.debugToggled) {
        game.debug = !game.debug;
    }

    // Handle restart when dead
    if (game.state === 'dead' && input.jumpPressed) {
        resetGame();
        return;
    }

    // Handle jump input based on current mode
    if (input.jumpPressed) {
        const handled = game.currentMode.onJumpPress && game.currentMode.onJumpPress(game);
        if (!handled) {
            bufferJump(); // Default CubeRunner behavior
        }
    }

    accumulator += frameTime;

    // Fixed timestep updates
    while (accumulator >= FIXED_DT) {
        update(FIXED_DT);
        accumulator -= FIXED_DT;
    }

    render();
}

// =============================================================================
// Update
// =============================================================================
function update(dt) {
    // Always update effects (even when dead)
    updateScreenShake(dt);
    updateParticles(dt);

    if (game.state !== 'playing') return;

    // Try to execute buffered jump
    tryExecuteJump(dt);

    // Update player physics
    updatePlayer(dt, input.jumpHeld, getGroundY, getCeilingY, game.gravityFlipped);

    // Update player world X based on distance
    player.x = game.distance + PLAYER_SCREEN_X;

    // Update trail
    updateTrail();

    // Update squash-stretch
    updateSquashStretch(dt);

    // Check obstacle collisions
    if (checkObstacleCollisions()) {
        die();
        return;
    }

    // Update camera Y with smoothing
    const targetCameraY = player.y + player.height / 2 - canvas.height / 2;
    game.cameraY += (targetCameraY - game.cameraY) * CAMERA_SMOOTH;

    game.distance += game.scrollSpeed * dt;
    game.score = Math.floor(game.distance / 10);

    // Check mode triggers
    checkModeTriggers();

    // Run mode-specific update
    if (game.currentMode.update) {
        game.currentMode.update(game, dt);
    }

    updateHUD();
}

function updateHUD() {
    document.getElementById('score').textContent = `Score: ${game.score}`;
    if (game.state === 'dead') {
        document.getElementById('mode').textContent = 'DEAD - Click to restart';
    } else {
        document.getElementById('mode').textContent = `Mode: ${game.currentMode.name}`;
    }
}

// =============================================================================
// Render
// =============================================================================
function render() {
    // Apply screen shake offset
    ctx.save();
    ctx.translate(game.shakeOffsetX, game.shakeOffsetY);

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(-game.shakeOffsetX, -game.shakeOffsetY, canvas.width, canvas.height);

    // Calculate scroll offset
    const scrollX = game.distance;

    // Draw terrain
    renderTerrain(scrollX);

    // Draw ceiling
    renderCeiling(scrollX);

    // Draw mode trigger portals
    renderModePortals(scrollX);

    // Draw obstacles
    renderObstacles(scrollX);

    // Draw trail (behind player)
    renderTrail(scrollX);

    // Draw particles
    renderParticles(scrollX);

    // Draw player with mode-specific color (only if alive)
    if (game.state === 'playing') {
        const playerScreenX = player.x - scrollX;
        const playerScreenY = player.y - game.cameraY;

        // Apply squash-stretch (stretch Y = squash X to preserve volume)
        const scaleY = game.squashStretch;
        const scaleX = 1 / scaleY; // Inverse to preserve area
        const drawW = player.width * scaleX;
        const drawH = player.height * scaleY;
        const offsetX = (player.width - drawW) / 2;
        const offsetY = player.height - drawH; // Anchor to bottom

        ctx.fillStyle = game.currentMode.color || '#e94560';
        ctx.fillRect(playerScreenX + offsetX, playerScreenY + offsetY, drawW, drawH);
    }

    // Debug visualization
    if (game.debug) {
        renderDebug(scrollX);
    }

    ctx.restore();
}

function renderTerrain(scrollX) {
    const terrain = game.level.terrain;

    // Draw filled terrain (ground)
    ctx.fillStyle = '#16213e';
    ctx.beginPath();

    // Start from bottom-left of screen
    const firstScreenX = terrain[0].x - scrollX;
    const firstScreenY = terrain[0].y + game.terrainOffsetY - game.cameraY;
    ctx.moveTo(firstScreenX, canvas.height);
    ctx.lineTo(firstScreenX, firstScreenY);

    // Draw terrain line
    for (let i = 1; i < terrain.length; i++) {
        const screenX = terrain[i].x - scrollX;
        const screenY = terrain[i].y + game.terrainOffsetY - game.cameraY;
        ctx.lineTo(screenX, screenY);
    }

    // Close path to bottom-right
    const lastScreenX = terrain[terrain.length - 1].x - scrollX;
    ctx.lineTo(lastScreenX, canvas.height);
    ctx.closePath();
    ctx.fill();

    // Draw terrain outline
    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(firstScreenX, firstScreenY);
    for (let i = 1; i < terrain.length; i++) {
        const screenX = terrain[i].x - scrollX;
        const screenY = terrain[i].y + game.terrainOffsetY - game.cameraY;
        ctx.lineTo(screenX, screenY);
    }
    ctx.stroke();
}

function renderCeiling(scrollX) {
    const ceiling = game.level.ceiling;
    if (!ceiling) return;

    // Draw filled ceiling (top area)
    ctx.fillStyle = '#16213e';
    ctx.beginPath();

    // Start from top-left of screen
    const firstScreenX = ceiling[0].x - scrollX;
    const firstScreenY = ceiling[0].y + game.terrainOffsetY - game.cameraY;
    ctx.moveTo(firstScreenX, 0);
    ctx.lineTo(firstScreenX, firstScreenY);

    // Draw ceiling line
    for (let i = 1; i < ceiling.length; i++) {
        const screenX = ceiling[i].x - scrollX;
        const screenY = ceiling[i].y + game.terrainOffsetY - game.cameraY;
        ctx.lineTo(screenX, screenY);
    }

    // Close path to top-right
    const lastScreenX = ceiling[ceiling.length - 1].x - scrollX;
    ctx.lineTo(lastScreenX, 0);
    ctx.closePath();
    ctx.fill();

    // Draw ceiling outline
    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(firstScreenX, firstScreenY);
    for (let i = 1; i < ceiling.length; i++) {
        const screenX = ceiling[i].x - scrollX;
        const screenY = ceiling[i].y + game.terrainOffsetY - game.cameraY;
        ctx.lineTo(screenX, screenY);
    }
    ctx.stroke();
}

function renderObstacles(scrollX) {
    ctx.fillStyle = '#ff6b6b';
    for (const obs of game.level.obstacles) {
        const screenX = obs.x - scrollX;
        const screenY = obs.y + game.terrainOffsetY - game.cameraY;

        // Determine if this is a ceiling spike (Y < 250 means it's on ceiling)
        const isCeilingSpike = obs.y < 250;

        ctx.beginPath();
        if (isCeilingSpike) {
            // Draw spike pointing down (for ceiling)
            ctx.moveTo(screenX + obs.w / 2, screenY + obs.h); // Bottom center (tip)
            ctx.lineTo(screenX + obs.w, screenY);             // Top right
            ctx.lineTo(screenX, screenY);                     // Top left
        } else {
            // Draw spike pointing up (for floor)
            ctx.moveTo(screenX + obs.w / 2, screenY);         // Top center (tip)
            ctx.lineTo(screenX + obs.w, screenY + obs.h);     // Bottom right
            ctx.lineTo(screenX, screenY + obs.h);             // Bottom left
        }
        ctx.closePath();
        ctx.fill();
    }
}

function renderModePortals(scrollX) {
    const triggers = game.level.modeTriggers;

    for (const trigger of triggers) {
        const screenX = trigger.atDistance - scrollX;

        // Only render if on screen
        if (screenX < -50 || screenX > canvas.width + 50) continue;

        const mode = getMode(trigger.modeName);
        const portalColor = mode.color || '#ffffff';

        // Draw vertical portal line
        ctx.strokeStyle = portalColor;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvas.height);
        ctx.stroke();

        // Draw portal glow effect
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = portalColor;
        ctx.fillRect(screenX - 15, 0, 30, canvas.height);

        // Draw mode name label
        ctx.globalAlpha = 1;
        ctx.fillStyle = portalColor;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(trigger.modeName, screenX, 30);
    }

    ctx.globalAlpha = 1; // Reset alpha
}

function renderDebug(scrollX) {
    const playerScreenX = player.x - scrollX;
    const playerScreenY = player.y - game.cameraY;

    // Player bounding box
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(playerScreenX, playerScreenY, player.width, player.height);

    // Foot probes
    const footLeftX = player.x + player.width * 0.2;
    const footRightX = player.x + player.width * 0.8;
    const groundYLeft = getGroundY(footLeftX);
    const groundYRight = getGroundY(footRightX);

    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(footLeftX - scrollX, groundYLeft - game.cameraY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(footRightX - scrollX, groundYRight - game.cameraY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Foot probe lines from player bottom to ground
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(footLeftX - scrollX, playerScreenY + player.height);
    ctx.lineTo(footLeftX - scrollX, groundYLeft - game.cameraY);
    ctx.moveTo(footRightX - scrollX, playerScreenY + player.height);
    ctx.lineTo(footRightX - scrollX, groundYRight - game.cameraY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Debug info text
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    const debugY = 60;
    ctx.fillText(`Distance: ${Math.floor(game.distance)}`, 10, debugY);
    ctx.fillText(`Player X: ${Math.floor(player.x)}`, 10, debugY + 15);
    ctx.fillText(`Player Y: ${Math.floor(player.y)}`, 10, debugY + 30);
    ctx.fillText(`Velocity Y: ${Math.floor(player.vy)}`, 10, debugY + 45);
    ctx.fillText(`On Ground: ${player.onGround}`, 10, debugY + 60);
    ctx.fillText(`Coyote: ${player.coyoteTimer.toFixed(2)}`, 10, debugY + 75);
    ctx.fillText(`Buffer: ${player.jumpBufferTimer.toFixed(2)}`, 10, debugY + 90);
    ctx.fillText(`[D] Toggle Debug`, 10, debugY + 115);
}

// =============================================================================
// Start
// =============================================================================
init();
