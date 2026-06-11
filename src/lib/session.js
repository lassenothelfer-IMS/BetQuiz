// Tiny helper to remember the player's chosen name across the home -> room
// navigation (and a page refresh). Scoped to the tab via sessionStorage.
const KEY = 'betquiz:name';

export function rememberName(name) {
  try {
    sessionStorage.setItem(KEY, name);
  } catch {
    /* sessionStorage unavailable (SSR / private mode) — ignore */
  }
}

export function recallName() {
  try {
    return sessionStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}
