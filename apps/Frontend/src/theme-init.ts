// Type-safe theme initializer that writes CSS variables expected by your Tailwind/index.css.
import theme from "../theme.json";

type ThemeShape = {
  primary?: string;
  background?: string;
  foreground?: string;
  radius?: number | string;
  appearance?: string;
  variant?: string;
  [key: string]: any;
};

const t = theme as ThemeShape | undefined;

/**
 * Convert inputs into the token form "H S% L%" that your CSS expects.
 * Accepts:
 *  - token form "210 79% 46%"
 *  - "hsl(210, 79%, 46%)"
 *  - hex: "#aabbcc" or "abc"
 */
function hslStringToToken(input?: string | null): string | null {
  if (!input) return null;
  const str = input.trim();

  // Already tokenized like "210 79% 46%"
  if (/^\d+\s+\d+%?\s+\d+%?$/.test(str)) return str;

  // hsl(...) form -> extract contents then validate parts
  const hslMatch = str.match(/hsl\(\s*([^)]+)\s*\)/i);
  if (hslMatch && typeof hslMatch[1] === "string") {
    const raw = hslMatch[1];
    const parts = raw.split(",").map((p) => p.trim());
    if (parts.length >= 3) {
      const rawH = parts[0] ?? "";
      const rawS = parts[1] ?? "";
      const rawL = parts[2] ?? "";
      const h = rawH.replace(/deg$/i, "").trim() || "0";
      const s = rawS.endsWith("%") ? rawS : rawS ? `${rawS}%` : "0%";
      const l = rawL.endsWith("%") ? rawL : rawL ? `${rawL}%` : "0%";
      return `${h} ${s} ${l}`;
    }
  }

  // hex -> convert to hsl token
  const hexMatch = str.match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
  const hex = hexMatch?.[1];
  if (hex && typeof hex === "string") {
    const normalizedHex =
      hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;

    // parse safely
    const r = parseInt(normalizedHex.substring(0, 2), 16) / 255;
    const g = parseInt(normalizedHex.substring(2, 4), 16) / 255;
    const b = parseInt(normalizedHex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h = Math.round(h * 60);
    } else {
      h = 0;
      s = 0;
    }

    const sPct = `${Math.round(s * 100)}%`;
    const lPct = `${Math.round(l * 100)}%`;
    return `${h} ${sPct} ${lPct}`;
  }

  return null;
}

function applyThemeObject(themeObj?: ThemeShape) {
  if (!themeObj) return;
  const root = document.documentElement;

  // primary (maps to --primary used by tailwind.config)
  if (themeObj.primary) {
    const token = hslStringToToken(String(themeObj.primary));
    if (token) root.style.setProperty("--primary", token);
  }

  // optional background/foreground/card if present
  if (themeObj.background) {
    const token = hslStringToToken(String(themeObj.background));
    if (token) root.style.setProperty("--background", token);
  }
  if (themeObj.foreground) {
    const token = hslStringToToken(String(themeObj.foreground));
    if (token) root.style.setProperty("--foreground", token);
  }

  // radius (index.css expects --radius)
  if (typeof themeObj.radius !== "undefined") {
    const radiusVal =
      typeof themeObj.radius === "number"
        ? `${themeObj.radius}rem`
        : String(themeObj.radius);
    root.style.setProperty("--radius", radiusVal);
  }

  // data attributes
  if (themeObj.appearance) root.setAttribute("data-appearance", String(themeObj.appearance));
  if (themeObj.variant) root.setAttribute("data-variant", String(themeObj.variant));
}

// apply as early as possible
try {
  applyThemeObject(t);
} catch (err) {
  // don't break runtime if theme parsing fails
  // eslint-disable-next-line no-console
  console.warn("theme-init failed to apply theme:", err);
}

export default theme;
