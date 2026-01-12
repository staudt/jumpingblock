// =============================================================================
// Player Constants - TUNING VALUES
// =============================================================================
// Player dimensions
export const PLAYER_WIDTH = 40;       // Player width in pixels
export const PLAYER_HEIGHT = 40;      // Player height in pixels

// Physics
export const GRAVITY = 1800;          // Gravity acceleration (pixels/sec^2)
export const JUMP_IMPULSE = 650;      // Initial jump velocity (pixels/sec)

// Jump feel (unused - variable jump disabled)
export const JUMP_HOLD_ACCEL = 600;   // Extra accel while holding jump
export const MAX_JUMP_HOLD_TIME = 0.2; // Max hold time for variable jump

// Input forgiveness
const JUMP_BUFFER_TIME = 0.1;         // Buffer jump input before landing (sec)
const COYOTE_TIME = 0.08;             // Allow jump after leaving ground (sec)

// =============================================================================
// Player State
// =============================================================================
export const player = {
    x: 100,          // World x position (left edge of player)
    y: 0,            // World y position (top edge of player)
    vx: 0,           // Horizontal velocity (unused for now, player moves with scroll)
    vy: 0,           // Vertical velocity
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    onGround: false,
    jumpHoldTimer: 0,  // Tracks how long jump has been held
    jumpBufferTimer: 0, // Time since jump was pressed (for buffering)
    coyoteTimer: 0      // Time since leaving ground (for coyote time)
};

// =============================================================================
// Player Physics
// =============================================================================

/**
 * Reset player to initial state
 */
export function resetPlayer(groundY) {
    player.x = 100;
    player.y = groundY - player.height;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.jumpHoldTimer = 0;
    player.jumpBufferTimer = 0;
    player.coyoteTimer = 0;
}

/**
 * Buffer a jump input (call once per frame when jump is pressed)
 */
export function bufferJump() {
    player.jumpBufferTimer = JUMP_BUFFER_TIME;
}

/**
 * Try to execute jump if conditions are met (call each physics tick)
 */
export function tryExecuteJump(dt) {
    // Check if we can jump (on ground or within coyote time)
    const canJump = player.onGround || player.coyoteTimer > 0;

    // Execute jump if buffered and can jump
    if (player.jumpBufferTimer > 0 && canJump) {
        player.vy = -JUMP_IMPULSE;
        player.onGround = false;
        player.jumpHoldTimer = 0;
        player.jumpBufferTimer = 0;
        player.coyoteTimer = 0; // Consume coyote time
    }

    // Decrement buffer timer
    if (player.jumpBufferTimer > 0) {
        player.jumpBufferTimer -= dt;
    }
}

/**
 * Update player physics
 * @param {number} dt - Delta time
 * @param {boolean} jumpHeld - Whether jump is held
 * @param {function} getGroundY - Function to get ground Y at X
 * @param {function} getCeilingY - Function to get ceiling Y at X
 * @param {boolean} gravityFlipped - Whether gravity is flipped (for GravityFlip mode)
 */
export function updatePlayer(dt, jumpHeld, getGroundY, getCeilingY, gravityFlipped = false) {
    // Apply gravity (flipped if in GravityFlip mode with flipped state)
    const gravityDir = gravityFlipped ? -1 : 1;
    player.vy += GRAVITY * gravityDir * dt;

    // Update position
    player.y += player.vy * dt;

    // Two-point probe positions
    const probeLeftX = player.x + player.width * 0.2;
    const probeRightX = player.x + player.width * 0.8;

    const wasOnGround = player.onGround;

    if (gravityFlipped) {
        // CEILING collision (when gravity is flipped, ceiling acts as floor)
        const ceilingYLeft = getCeilingY(probeLeftX);
        const ceilingYRight = getCeilingY(probeRightX);
        // Use the lower ceiling point (higher Y value)
        const ceilingY = Math.max(ceilingYLeft, ceilingYRight);
        const playerTop = player.y;

        if (playerTop <= ceilingY) {
            player.y = ceilingY;
            player.vy = 0;
            player.onGround = true;
            player.jumpHoldTimer = 0;
            player.coyoteTimer = COYOTE_TIME;
        } else {
            player.onGround = false;
            if (wasOnGround) {
                player.coyoteTimer = COYOTE_TIME;
            } else if (player.coyoteTimer > 0) {
                player.coyoteTimer -= dt;
            }
        }

        // Also check floor collision (don't fall through floor when flipped)
        const groundYLeft = getGroundY(probeLeftX);
        const groundYRight = getGroundY(probeRightX);
        const groundY = Math.min(groundYLeft, groundYRight);
        const playerBottom = player.y + player.height;
        if (playerBottom >= groundY) {
            player.y = groundY - player.height;
            if (player.vy > 0) player.vy = 0;
        }
    } else {
        // GROUND collision (normal gravity)
        const groundYLeft = getGroundY(probeLeftX);
        const groundYRight = getGroundY(probeRightX);
        // Use the higher ground point (lower Y value since Y increases downward)
        const groundY = Math.min(groundYLeft, groundYRight);
        const playerBottom = player.y + player.height;

        if (playerBottom >= groundY) {
            player.y = groundY - player.height;
            player.vy = 0;
            player.onGround = true;
            player.jumpHoldTimer = 0;
            player.coyoteTimer = COYOTE_TIME;
        } else {
            player.onGround = false;
            if (wasOnGround) {
                player.coyoteTimer = COYOTE_TIME;
            } else if (player.coyoteTimer > 0) {
                player.coyoteTimer -= dt;
            }
        }

        // Also check ceiling collision (don't go through ceiling when normal)
        const ceilingYLeft = getCeilingY(probeLeftX);
        const ceilingYRight = getCeilingY(probeRightX);
        const ceilingY = Math.max(ceilingYLeft, ceilingYRight);
        const playerTop = player.y;
        if (playerTop <= ceilingY) {
            player.y = ceilingY;
            if (player.vy < 0) player.vy = 0;
        }
    }
}

/**
 * Get player center X in world coordinates
 */
export function getPlayerCenterX() {
    return player.x + player.width / 2;
}

/**
 * Get player bottom Y in world coordinates
 */
export function getPlayerBottom() {
    return player.y + player.height;
}
