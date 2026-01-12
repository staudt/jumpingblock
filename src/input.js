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

// =============================================================================
// Initialization
// =============================================================================

export function initInput() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
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
