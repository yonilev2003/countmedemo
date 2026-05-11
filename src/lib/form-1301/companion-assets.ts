/**
 * Companion track — Eitan character poses.
 *
 * To replace the placeholders: save your PNGs to /public/eitan/companion/
 * with these exact filenames. Only 5 distinct poses are needed for all
 * 12 modules; reuse is intentional.
 *
 *   picture1.png  → מסביר — ידיים יחד (calm explainer)
 *   picture2.png  → אגודל למעלה — חיובי (encouragement / "we did it")
 *   picture3.png  → מהורהר — יד על הסנטר (let's think about this)
 *   picture4.png  → מצביע עם שתי ידיים — דגש (emphasizes critical info)
 *   picture5.png  → מצביע עם יד אחת — הכוונה (points at the field)
 *
 * Missing files automatically fall back to the placeholder SVG in the repo.
 */

const path = (n: string) => `/eitan/companion/${n}.png`;

// Semantic pose aliases — use these in modules.ts to pick a pose by intent.
export const POSE_EXPLAINER = path("picture1");
export const POSE_THUMBS_UP = path("picture2");
export const POSE_THOUGHTFUL = path("picture3");
export const POSE_POINTING_BOTH = path("picture4");
export const POSE_POINTING_ONE = path("picture5");

// Backwards-compatible numbered exports (1..5 map to the 5 poses; 6..12 reuse).
export const picture1 = POSE_EXPLAINER;
export const picture2 = POSE_THUMBS_UP;
export const picture3 = POSE_THOUGHTFUL;
export const picture4 = POSE_POINTING_BOTH;
export const picture5 = POSE_POINTING_ONE;
export const picture6 = POSE_THOUGHTFUL;
export const picture7 = POSE_POINTING_BOTH;
export const picture8 = POSE_EXPLAINER;
export const picture9 = POSE_THUMBS_UP;
export const picture10 = POSE_THUMBS_UP;
export const picture11 = POSE_THUMBS_UP;
export const picture12 = POSE_THUMBS_UP;

// Gov.il section screenshots — one per module step (still placeholder by default)
export const screenshot1 = "/govil-screenshots/screenshot1.png";
export const screenshot2 = "/govil-screenshots/screenshot2.png";
export const screenshot3 = "/govil-screenshots/screenshot3.png";
export const screenshot4 = "/govil-screenshots/screenshot4.png";
export const screenshot5 = "/govil-screenshots/screenshot5.png";
export const screenshot6 = "/govil-screenshots/screenshot6.png";
export const screenshot7 = "/govil-screenshots/screenshot7.png";
export const screenshot8 = "/govil-screenshots/screenshot8.png";
export const screenshot9 = "/govil-screenshots/screenshot9.png";
export const screenshot10 = "/govil-screenshots/screenshot10.png";
export const screenshot11 = "/govil-screenshots/screenshot11.png";
export const screenshot12 = "/govil-screenshots/screenshot12.png";

// Fallback placeholders — committed SVGs that render when the real file is missing
export const PLACEHOLDER_EITAN = "/eitan/placeholder-eitan.svg";
export const PLACEHOLDER_SCREENSHOT = "/eitan/placeholder-screenshot.svg";
