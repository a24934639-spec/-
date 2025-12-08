
// Physics & Dimensions
export const TABLE_WIDTH = 800;
export const TABLE_HEIGHT = 400;
export const BALL_RADIUS = 10;
export const POCKET_RADIUS = 22;
export const CUSHION_WIDTH = 30;

// Colors
export const FELT_COLOR = '#14532d'; // emerald-900/green
export const CUSHION_COLOR = '#334155'; // slate-700
export const RAIL_COLOR = '#472c1b'; // wood-ish

export const BALL_COLORS = {
  0: '#ffffff', // Cue
  1: '#eab308', // Yellow
  2: '#3b82f6', // Blue
  3: '#ef4444', // Red
  4: '#a855f7', // Purple
  5: '#f97316', // Orange
  6: '#22c55e', // Green
  7: '#7f1d1d', // Maroon
  8: '#000000', // Black
};

// Physics Tuning
export const FRICTION_AIR = 0.01; // Slightly higher air resistance for better control
export const FRICTION = 0.01; // Lower rolling friction for longer rolls
export const RESTITUTION = 0.75; // Bounciness
export const FORCE_MULTIPLIER = 2.5; // Significantly increased (was 0.25) for realistic strong shots
export const MAX_POWER = 100; // Normalized to 0-100 scale for UI
