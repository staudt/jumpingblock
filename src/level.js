// =============================================================================
// Level Data Format
// =============================================================================

/**
 * Level structure:
 * {
 *   terrain: [{ x, y }, ...],      // Polyline points in world coordinates (floor)
 *   ceiling: [{ x, y }, ...],      // Polyline points for ceiling (optional)
 *   obstacles: [{ x, y, w, h }, ...], // Rectangles
 *   modeTriggers: [{ atDistance, modeName }, ...] // Mode switches
 * }
 */

// Test level for development
export const testLevel = {
    terrain: [
        // CubeRunner section (0 - 2000)
        { x: 0, y: 400 },
        { x: 600, y: 400 },
        { x: 800, y: 350 },
        { x: 1000, y: 350 },
        { x: 1200, y: 400 },
        { x: 2000, y: 400 },

        // FlapFly section (2000 - 4500)
        { x: 2200, y: 350 },
        { x: 2500, y: 300 },
        { x: 2800, y: 350 },
        { x: 3200, y: 300 },
        { x: 3600, y: 350 },
        { x: 4000, y: 300 },
        { x: 4500, y: 350 },

        // CubeRunner section 2 (4500 - 6500)
        { x: 4700, y: 400 },
        { x: 5200, y: 400 },
        { x: 5400, y: 350 },
        { x: 5700, y: 350 },
        { x: 5900, y: 400 },
        { x: 6500, y: 400 },

        // WaveToggle section (6500 - 9000)
        { x: 6700, y: 350 },
        { x: 7000, y: 300 },
        { x: 7400, y: 350 },
        { x: 7800, y: 300 },
        { x: 8200, y: 350 },
        { x: 8600, y: 300 },
        { x: 9000, y: 350 },

        // GravityFlip section (9000 - 11500)
        { x: 9200, y: 400 },
        { x: 9500, y: 400 },
        { x: 9700, y: 350 },
        { x: 10000, y: 350 },
        { x: 10300, y: 400 },
        { x: 10600, y: 400 },
        { x: 10900, y: 350 },
        { x: 11200, y: 350 },
        { x: 11500, y: 400 },

        // Final CubeRunner (11500+)
        { x: 11700, y: 400 },
        { x: 12000, y: 400 },
        { x: 12200, y: 350 },
        { x: 12500, y: 350 },
        { x: 14000, y: 350 }
    ],

    // Ceiling for GravityFlip section (only defined where needed)
    ceiling: [
        { x: 0, y: 0 },           // Start high (no ceiling effectively)
        { x: 9000, y: 0 },        // Still no ceiling
        { x: 9200, y: 200 },      // Ceiling starts for GravityFlip
        { x: 9500, y: 200 },
        { x: 9700, y: 150 },
        { x: 10000, y: 150 },
        { x: 10300, y: 200 },
        { x: 10600, y: 200 },
        { x: 10900, y: 150 },
        { x: 11200, y: 150 },
        { x: 11500, y: 200 },
        { x: 11700, y: 0 },       // Ceiling ends
        { x: 14000, y: 0 }
    ],

    obstacles: [
        // CubeRunner section 1
        { x: 500, y: 370, w: 30, h: 30 },
        { x: 900, y: 320, w: 30, h: 30 },
        { x: 1400, y: 370, w: 30, h: 30 },
        { x: 1700, y: 370, w: 30, h: 30 },

        // FlapFly section
        { x: 2400, y: 270, w: 30, h: 30 },
        { x: 2900, y: 320, w: 30, h: 30 },
        { x: 3400, y: 270, w: 30, h: 30 },
        { x: 3900, y: 270, w: 30, h: 30 },

        // CubeRunner section 2
        { x: 4900, y: 370, w: 30, h: 30 },
        { x: 5500, y: 320, w: 30, h: 30 },
        { x: 6100, y: 370, w: 30, h: 30 },

        // WaveToggle section
        { x: 7200, y: 320, w: 30, h: 30 },
        { x: 7600, y: 270, w: 30, h: 30 },
        { x: 8000, y: 320, w: 30, h: 30 },
        { x: 8400, y: 270, w: 30, h: 30 },

        // GravityFlip section obstacles (on floor and ceiling)
        { x: 9600, y: 370, w: 30, h: 30 },   // Floor spike
        { x: 9600, y: 200, w: 30, h: 30 },   // Ceiling spike (upside down)
        { x: 10100, y: 320, w: 30, h: 30 },  // Floor spike
        { x: 10100, y: 150, w: 30, h: 30 },  // Ceiling spike
        { x: 10700, y: 370, w: 30, h: 30 },  // Floor spike
        { x: 10700, y: 200, w: 30, h: 30 },  // Ceiling spike
        { x: 11100, y: 320, w: 30, h: 30 },  // Floor spike
        { x: 11100, y: 150, w: 30, h: 30 },  // Ceiling spike

        // Final section
        { x: 11900, y: 370, w: 30, h: 30 },
        { x: 12300, y: 320, w: 30, h: 30 },
        { x: 12700, y: 320, w: 30, h: 30 }
    ],

    modeTriggers: [
        { atDistance: 2000, modeName: 'FlapFly' },
        { atDistance: 4500, modeName: 'CubeRunner' },
        { atDistance: 6500, modeName: 'WaveToggle' },
        { atDistance: 9000, modeName: 'GravityFlip' },
        { atDistance: 11500, modeName: 'CubeRunner' }
    ]
};

// =============================================================================
// Terrain Helpers
// =============================================================================

/**
 * Get ground Y at a given world X by interpolating terrain polyline.
 * Returns the Y value of the ground at that X position.
 */
export function getGroundYAtX(terrain, x) {
    // Before first point
    if (x <= terrain[0].x) {
        return terrain[0].y;
    }

    // After last point
    if (x >= terrain[terrain.length - 1].x) {
        return terrain[terrain.length - 1].y;
    }

    // Find segment containing x
    for (let i = 0; i < terrain.length - 1; i++) {
        const p1 = terrain[i];
        const p2 = terrain[i + 1];

        if (x >= p1.x && x <= p2.x) {
            // Linear interpolation
            const t = (x - p1.x) / (p2.x - p1.x);
            return p1.y + t * (p2.y - p1.y);
        }
    }

    return terrain[terrain.length - 1].y;
}
