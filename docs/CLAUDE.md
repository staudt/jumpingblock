# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Canvas Geometry Dash style endless runner with slopes and modes

## Goal
Build a minimal Geometry Dash inspired endless runner in plain JavaScript and HTML canvas.
Run locally with `python -m http.server`.
Use primitive shapes only.

Core requirements:
- Player is a square.
- Input: mouse click plus Space, W, ArrowUp.
- Terrain is a polyline that includes limited slopes.
- Slopes exist mainly to break up flat ground and should not make timing annoying.
- Variable jump height by holding input.
- Constant scroll speed for now.
- Handcrafted level first.
- Camera follows player vertically.
- Add a mode system so the level can switch behavior mid run.

## Non goals
- No audio
- No external libraries
- No level editor at first
- No mobile support required initially

## High level design
### Game loop
- Use requestAnimationFrame.
- Use fixed timestep update for stable physics and collision.

### Coordinate system
- World coordinates for terrain and obstacles.
- Screen renders world objects shifted by a scroll offset so the world moves left.
- Player x stays mostly constant in screen space.

### Game state
- gameState: "playing" | "dead"
- distance: total distance traveled
- score: derived from distance
- scrollSpeed: constant
- cameraY: smooth follow of player y

### Player state
- x, y
- vx, vy
- width, height
- onGround boolean
- jumpBufferTimer, coyoteTimer optional
- jumpHoldTimer for variable jump height

### Input state
- jumpPressed: edge trigger
- jumpHeld: true while key or mouse is held
- jumpReleased: edge trigger (optional)

## Modes system
Implement a small mode state machine so the level can switch behavior.
Each mode object can define:
- enter(game)
- exit(game)
- update(game, dt)
- onJumpPress(game)
- onJumpRelease(game)

Core physics and collision remain in the main loop, but modes can modify:
- how input affects vy
- whether terrain collision is enabled
- whether ground contact is required

Initial modes:
1. CubeRunner
   - Jump on input.
   - Terrain collision enabled.
2. FlapFly
   - Clicking or key gives upward impulse while gravity pulls down.
   - Terrain acts as floor (same as CubeRunner).
3. WaveToggle
   - Click toggles between flying up and flying down.
   - Constant vertical speed in current direction.
   - Terrain acts as floor.

Future modes to keep in mind:
- GravityFlip: input flips gravity direction

## Level format
Handcrafted level is defined as a timeline by distance.
Level contains:
- terrain polyline points in world coordinates
- obstacles list
- modeTriggers: array of { atDistance, modeName }

Terrain rules:
- Slope angles limited.
- After any slope segment, enforce a minimum flat segment length.
- Prefer gentle height changes.

Obstacles:
- Start with rectangles.
- Later add triangles if desired.

## Terrain collision with slopes
Terrain is a polyline. For a given x, compute ground y by linear interpolation on the segment.

Collision method:
- Treat player as AABB.
- Sample ground under player using two foot probes:
  - footLeftX = player.x + 0.2 * width
  - footRightX = player.x + 0.8 * width
- groundY = min of the two resulting y values if y increases downward.
- If playerBottom > groundY:
  - snap player y so bottom equals groundY
  - vy = 0
  - onGround = true
- else onGround = false

## Variable jump height
Implement variable jump height by holding input.
- On jump press, set vy = -jumpImpulse.
- While jumpHeld and jumpHoldTimer < maxHoldTime and vy < 0:
  - apply extra upward acceleration during hold.

## Camera follow
- Keep a base horizon line.
- cameraY eases toward player.y with smoothing.

## Milestones
### Milestone 1: Skeleton
- index.html with canvas and HUD
- src/main.js with fixed timestep loop, resize, render clear

### Milestone 2: Input
- keyboard and mouse
- jumpPressed and jumpHeld

### Milestone 3: Player physics
- gravity, jump impulse
- variable jump height with hold
- ground collision with a flat baseline
- death and restart

### Milestone 4: Scrolling world
- world scroll offset from distance and scrollSpeed
- score display

### Milestone 5: Sloped terrain polyline
- implement getGroundYAtX
- implement foot probe collision
- draw terrain segments

### Milestone 6: Obstacles and death
- define obstacles in level data
- AABB collision
- death state and restart

### Milestone 7: Modes and triggers
- implement modes map and switching
- implement modeTriggers by distance
- implement FlapFly behavior

### Milestone 8: Tuning and debug
- enforce slope limits and minimum flat zone in level authoring
- debug draw: terrain polyline, foot probes, bounding boxes
- constants at top for quick tuning

## Acceptance criteria
- Runs locally via python http server
- Square player jumps on click or keys
- Holding jump changes jump height
- Terrain includes gentle slopes and player follows them smoothly
- Obstacles can kill player
- Level can switch modes mid run using triggers
- Restart is reliable

## Design decisions
- Variable jump height: extra upward acceleration during hold
- FlapFly terrain: acts as floor
- Canvas: responsive fullscreen
- Level authoring: define data format first, then build levels

## Open questions
1. Should mode switches be distance triggers only or visible portal objects later?
