// =============================================================================
// Input State
// =============================================================================

export const input = {
    jumpPressed: false,  // Edge trigger: true only on the frame input starts
    jumpHeld: false,     // True while key/mouse is held
    jumpReleased: false, // Edge trigger: true only on the frame input ends
    debugToggled: false  // Edge trigger for debug mode toggle
};

// Internal tracking
let jumpDown = false;
let jumpDownPrev = false;
let jumpPressedThisFrame = false; // Latched until consumed
let debugToggledThisFrame = false;

// Touch tracking for mobile
let touchActive = false;
const TOUCH_BUTTON_SIZE = 80;    // Size of touch button in pixels
let touchButtonRect = { x: 0, y: 0, w: TOUCH_BUTTON_SIZE, h: TOUCH_BUTTON_SIZE };

export function getTouchButtonRect() {
    return touchButtonRect;
}

// =============================================================================
// Input Handlers
// =============================================================================

function onKeyDown(e) {
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!jumpDown) {
            jumpPressedThisFrame = true; // Latch the press
        }
        jumpDown = true;
    }
    if (e.code === 'KeyD') {
        debugToggledThisFrame = true;
    }
}

function onKeyUp(e) {
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        jumpDown = false;
    }
}

function onMouseDown(e) {
    if (e.button === 0) { // Left click
        if (!jumpDown) {
            jumpPressedThisFrame = true; // Latch the press
        }
        jumpDown = true;
    }
}

function onMouseUp(e) {
    if (e.button === 0) {
        jumpDown = false;
    }
}

function onTouchStart(e) {
    // Jump on any touch anywhere on screen
    e.preventDefault();
    if (!jumpDown) {
        jumpPressedThisFrame = true; // Latch the press
    }
    jumpDown = true;
}

function onTouchEnd(e) {
    // Any touch ending means jump releases
    if (e.touches.length === 0) {
        jumpDown = false;
    }
}

// =============================================================================
// Initialization
// =============================================================================

export function initInput() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchstart', onTouchStart, false);
    window.addEventListener('touchend', onTouchEnd, false);

    // Position touch button in bottom-right corner
    updateTouchButtonPosition();
    window.addEventListener('resize', updateTouchButtonPosition);
}

function updateTouchButtonPosition() {
    const padding = 16; // pixels from edge
    touchButtonRect.x = window.innerWidth - TOUCH_BUTTON_SIZE - padding;
    touchButtonRect.y = window.innerHeight - TOUCH_BUTTON_SIZE - padding;
    touchButtonRect.w = TOUCH_BUTTON_SIZE;
    touchButtonRect.h = TOUCH_BUTTON_SIZE;
}

// =============================================================================
// Update (call once per frame, before game update)
// =============================================================================

export function updateInput() {
    // Use latched press (survives multiple physics ticks per frame)
    input.jumpPressed = jumpPressedThisFrame;
    input.jumpReleased = !jumpDown && jumpDownPrev;
    input.jumpHeld = jumpDown;
    input.debugToggled = debugToggledThisFrame;

    jumpDownPrev = jumpDown;
    jumpPressedThisFrame = false;
    debugToggledThisFrame = false;
}
