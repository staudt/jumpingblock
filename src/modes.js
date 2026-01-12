// =============================================================================
// Mode System
// =============================================================================

import { player, GRAVITY, JUMP_IMPULSE } from './player.js';

// =============================================================================
// Mode Constants - TUNING VALUES
// =============================================================================
// FlapFly mode
const FLAP_IMPULSE = 350;         // Upward velocity per flap (pixels/sec)

// WaveToggle mode
const WAVE_SPEED = 300;           // Constant vertical speed (pixels/sec)

// GravityFlip mode
const FLIP_JUMP_IMPULSE = 650;    // Jump impulse when flipped (pixels/sec)

// =============================================================================
// CubeRunner Mode - Standard jump behavior
// =============================================================================
export const CubeRunner = {
    name: 'CubeRunner',
    color: '#e94560', // Red

    enter(game) {
        // Nothing special on enter
    },

    exit(game) {
        // Nothing special on exit
    },

    onJumpPress(game) {
        // Handled by player.js bufferJump/tryExecuteJump
        return false; // Use default jump behavior
    },

    onJumpRelease(game) {
        // Nothing special
    },

    update(game, dt) {
        // Standard physics handled by player.js
    }
};

// =============================================================================
// FlapFly Mode - Flap impulse with gravity
// =============================================================================
export const FlapFly = {
    name: 'FlapFly',
    color: '#feca57', // Yellow

    enter(game) {
        // Can start in air
    },

    exit(game) {
        // Nothing special
    },

    onJumpPress(game) {
        // Give upward impulse regardless of ground state
        player.vy = -FLAP_IMPULSE;
        return true; // Override default jump
    },

    onJumpRelease(game) {
        // Nothing special
    },

    update(game, dt) {
        // Gravity still applies (handled by player.js)
        // Terrain collision still applies
    }
};

// =============================================================================
// WaveToggle Mode - Click toggles between flying up and down
// =============================================================================
export const WaveToggle = {
    name: 'WaveToggle',
    color: '#54a0ff', // Blue
    direction: 1, // 1 = down, -1 = up

    enter(game) {
        this.direction = -1; // Start going up
        player.vy = -WAVE_SPEED;
    },

    exit(game) {
        this.direction = 1;
    },

    onJumpPress(game) {
        // Toggle direction
        this.direction *= -1;
        player.vy = this.direction * WAVE_SPEED;
        return true; // Override default jump
    },

    onJumpRelease(game) {
        // Nothing special
    },

    update(game, dt) {
        // Maintain constant vertical speed (override gravity)
        player.vy = this.direction * WAVE_SPEED;
    }
};

// =============================================================================
// GravityFlip Mode - Click flips gravity direction
// =============================================================================
export const GravityFlip = {
    name: 'GravityFlip',
    color: '#a855f7', // Purple
    flipped: false, // false = normal gravity, true = inverted

    enter(game) {
        this.flipped = false;
        game.gravityFlipped = false;
    },

    exit(game) {
        this.flipped = false;
        game.gravityFlipped = false;
    },

    onJumpPress(game) {
        // Flip gravity direction
        this.flipped = !this.flipped;
        game.gravityFlipped = this.flipped;
        // Give impulse in new gravity direction
        player.vy = this.flipped ? FLIP_JUMP_IMPULSE : -FLIP_JUMP_IMPULSE;
        return true; // Override default jump
    },

    onJumpRelease(game) {
        // Nothing special
    },

    update(game, dt) {
        // Gravity direction is handled by player.js using game.gravityFlipped
    }
};

// =============================================================================
// Mode Registry
// =============================================================================
export const modes = {
    CubeRunner,
    FlapFly,
    WaveToggle,
    GravityFlip
};

export function getMode(name) {
    return modes[name] || CubeRunner;
}
