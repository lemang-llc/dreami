/**
 * dreAmI wordmark — matches the app's typographic convention:
 *   "dre" + "m" → Outfit, amber
 *   "A"         → Cinzel, lavender
 *   "I"         → Cinzel, teal
 */
export function Wordmark({ size }) {
  const style = size ? { fontSize: size } : {};
  return (
    <span className="wordmark" style={style}>
      <span className="wm-lower">dre</span>
      <span className="wm-cap-lavender">A</span>
      <span className="wm-lower">m</span>
      <span className="wm-cap-teal">I</span>
    </span>
  );
}

/**
 * LeMaNg LLC brand mark — follows the same convention:
 *   Capitals (L, M, N, L) → Cinzel, alternating teal / lavender
 *   Lowercase (e, a, g, abs) → Outfit, amber
 */
export function LeMaNgLabs({ size }) {
  const style = size ? { fontSize: size } : {};
  return (
    <span className="lemang-labs" style={style}>
      <span className="wm-cap-teal">L</span>
      <span className="wm-lower">e</span>
      <span className="wm-cap-lavender">M</span>
      <span className="wm-lower">a</span>
      <span className="wm-cap-teal">N</span>
      <span className="wm-lower">g </span>
      <span className="wm-cap-lavender">L</span>
      <span className="wm-lower">abs</span>
    </span>
  );
}
