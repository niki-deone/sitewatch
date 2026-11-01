// src/lib/theme.ts
// Theme preference shared by the inline <head> script and the toggle.
// "system" means: no data-theme attribute, the CSS media query follows the OS.
export type ThemeChoice = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "sitewatch-theme";

/**
 * Runs in <head> before the first paint, so a saved choice never flashes the wrong theme.
 * Kept tiny and dependency-free on purpose; any error leaves the system theme in place.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
