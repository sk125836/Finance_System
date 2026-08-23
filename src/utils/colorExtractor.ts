export interface ColorShades {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface BrandPalette {
  primary: string;        // Main 500 hex
  primaryRgb: string;     // "r, g, b"
  hover: string;          // 600 hex
  light: string;          // 50/100 hex
  dark: string;           // 800/900 hex
  accent: string;         // Secondary vibrant accent
  gradientFrom: string;   // 600 hex
  gradientTo: string;     // Shifted hue hex
  shades: ColorShades;
}

// Convert RGB to HEX
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert HEX to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) {
    return { r: 234, g: 88, b: 12 }; // Default orange
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Convert RGB to HSL
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
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
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Convert HSL to HEX
export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

// Generate complete 50-950 shade scale from any primary HEX
export function generatePaletteFromPrimary(primaryHex: string): BrandPalette {
  const { r, g, b } = hexToRgb(primaryHex);
  const { h, s } = rgbToHsl(r, g, b);

  // Keep a healthy saturation
  const baseSat = Math.max(45, Math.min(95, s));

  // Generate smooth lightness ramp for 50..950
  const shades: ColorShades = {
    50: hslToHex(h, Math.min(baseSat, 65), 96),
    100: hslToHex(h, Math.min(baseSat, 75), 91),
    200: hslToHex(h, Math.min(baseSat, 85), 82),
    300: hslToHex(h, baseSat, 70),
    400: hslToHex(h, baseSat, 58),
    500: primaryHex, // Anchor point
    600: hslToHex(h, Math.min(100, baseSat + 5), 42),
    700: hslToHex(h, Math.min(100, baseSat + 8), 34),
    800: hslToHex(h, Math.min(100, baseSat + 10), 26),
    900: hslToHex(h, Math.min(100, baseSat + 12), 18),
    950: hslToHex(h, Math.min(100, baseSat + 15), 10),
  };

  // Complementary accent (shifted hue for gradients e.g. orange -> amber, blue -> indigo/cyan)
  const accentHue = (h + 25) % 360;
  const gradientTo = hslToHex(accentHue, Math.min(95, baseSat + 5), 52);
  const accent = hslToHex((h + 30) % 360, Math.min(95, baseSat + 10), 48);

  return {
    primary: primaryHex,
    primaryRgb: `${r}, ${g}, ${b}`,
    hover: shades[600],
    light: shades[50],
    dark: shades[900],
    accent,
    gradientFrom: shades[600],
    gradientTo,
    shades,
  };
}

/**
 * Automatically extracts dominant brand colors from an image URL / base64 string using Canvas
 */
export function extractDominantColor(imageUrl: string): Promise<{
  primary: string;
  palette: string[];
  brandPalette: BrandPalette;
}> {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      const defaultPrimary = '#ea580c'; // Default vibrant brand orange
      return resolve({
        primary: defaultPrimary,
        palette: [defaultPrimary, '#f97316', '#fbbf24', '#c2410c'],
        brandPalette: generatePaletteFromPrimary(defaultPrimary),
      });
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          const defaultPrimary = '#ea580c';
          return resolve({
            primary: defaultPrimary,
            palette: [defaultPrimary],
            brandPalette: generatePaletteFromPrimary(defaultPrimary),
          });
        }

        // Downscale for fast pixel sampling
        const sampleSize = 80;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imgData.data;

        // Color frequency bucket map (quantized)
        const colorBuckets: { [key: string]: { r: number; g: number; b: number; count: number; score: number } } = {};

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Skip transparent or near-transparent pixels
          if (a < 120) continue;

          // Skip near-white (backgrounds) and near-black (pure shadows)
          const isNearWhite = r > 242 && g > 242 && b > 242;
          const isNearBlack = r < 18 && g < 18 && b < 18;
          if (isNearWhite || isNearBlack) continue;

          // Quantize color to 16-step grid
          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;
          const key = `${qr},${qg},${qb}`;

          const { s, l } = rgbToHsl(r, g, b);

          // Calculate brand vibrancy score: prioritize colorful, saturated logo marks over bland grays
          const saturationFactor = s / 100; // 0..1
          const lightnessFactor = 1 - Math.abs(l - 50) / 50; // peaks at 50% lightness
          const vibrancyMultiplier = 1 + saturationFactor * 3.5 + lightnessFactor * 1.5;

          if (!colorBuckets[key]) {
            colorBuckets[key] = { r: qr, g: qg, b: qb, count: 1, score: vibrancyMultiplier };
          } else {
            colorBuckets[key].count += 1;
            colorBuckets[key].score += vibrancyMultiplier;
          }
        }

        const sortedColors = Object.values(colorBuckets).sort((a, b) => b.score - a.score);

        if (sortedColors.length === 0) {
          // If all pixels were transparent or white/black, fallback to default
          const defaultPrimary = '#ea580c';
          return resolve({
            primary: defaultPrimary,
            palette: [defaultPrimary],
            brandPalette: generatePaletteFromPrimary(defaultPrimary),
          });
        }

        const topColors = sortedColors.slice(0, 6).map((c) => rgbToHex(c.r, c.g, c.b));
        const bestPrimary = topColors[0];
        const brandPalette = generatePaletteFromPrimary(bestPrimary);

        resolve({
          primary: bestPrimary,
          palette: topColors,
          brandPalette,
        });
      } catch (err) {
        console.warn('Canvas color extraction error, falling back:', err);
        const defaultPrimary = '#ea580c';
        resolve({
          primary: defaultPrimary,
          palette: [defaultPrimary],
          brandPalette: generatePaletteFromPrimary(defaultPrimary),
        });
      }
    };

    img.onerror = () => {
      const defaultPrimary = '#ea580c';
      resolve({
        primary: defaultPrimary,
        palette: [defaultPrimary],
        brandPalette: generatePaletteFromPrimary(defaultPrimary),
      });
    };

    img.src = imageUrl;
  });
}

/**
 * Apply brand theme dynamically across all HTML DOM elements, Tailwind CSS variables, and PDF templates
 */
export function applyDynamicTheme(primaryHexOrPalette: string | BrandPalette): BrandPalette {
  const palette =
    typeof primaryHexOrPalette === 'string'
      ? generatePaletteFromPrimary(primaryHexOrPalette)
      : primaryHexOrPalette;

  const root = document.documentElement;

  // Set CSS Variables on :root
  root.style.setProperty('--brand-primary', palette.primary);
  root.style.setProperty('--brand-primary-rgb', palette.primaryRgb);
  root.style.setProperty('--brand-hover', palette.hover);
  root.style.setProperty('--brand-light', palette.light);
  root.style.setProperty('--brand-dark', palette.dark);
  root.style.setProperty('--brand-accent', palette.accent);
  root.style.setProperty('--brand-gradient-from', palette.gradientFrom);
  root.style.setProperty('--brand-gradient-to', palette.gradientTo);

  // Set Tailwind v4 color variables for orange & amber palette overrides
  Object.entries(palette.shades).forEach(([step, hex]) => {
    root.style.setProperty(`--color-orange-${step}`, hex);
  });
  root.style.setProperty('--color-amber-500', palette.gradientTo);
  root.style.setProperty('--color-amber-400', palette.shades[400]);
  root.style.setProperty('--color-amber-600', palette.shades[600]);

  // Inject or update a dedicated global style block for bulletproof overrides across nested components and PDF sandbox
  let styleEl = document.getElementById('dynamic-brand-theme-styles') as HTMLStyleElement;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-brand-theme-styles';
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    :root {
      --brand-primary: ${palette.primary};
      --brand-primary-rgb: ${palette.primaryRgb};
      --brand-hover: ${palette.hover};
      --brand-light: ${palette.light};
      --brand-dark: ${palette.dark};
      --brand-accent: ${palette.accent};
      --brand-gradient-from: ${palette.gradientFrom};
      --brand-gradient-to: ${palette.gradientTo};

      --color-orange-50: ${palette.shades[50]};
      --color-orange-100: ${palette.shades[100]};
      --color-orange-200: ${palette.shades[200]};
      --color-orange-300: ${palette.shades[300]};
      --color-orange-400: ${palette.shades[400]};
      --color-orange-500: ${palette.shades[500]};
      --color-orange-600: ${palette.shades[600]};
      --color-orange-700: ${palette.shades[700]};
      --color-orange-800: ${palette.shades[800]};
      --color-orange-900: ${palette.shades[900]};
      --color-orange-950: ${palette.shades[950]};
      --color-amber-500: ${palette.gradientTo};
      --color-amber-400: ${palette.shades[400]};
      --color-amber-600: ${palette.shades[600]};
    }

    /* Dynamic Brand Utility Classes */
    .brand-glow {
      box-shadow: 0 0 20px -2px rgba(${palette.primaryRgb}, 0.35);
    }
    .brand-gradient {
      background: linear-gradient(135deg, ${palette.gradientFrom} 0%, ${palette.gradientTo} 100%) !important;
    }
    .brand-border-glow {
      border-color: rgba(${palette.primaryRgb}, 0.4) !important;
    }
  `;

  return palette;
}

// Popular Preset Brand Colors
export const BRAND_COLOR_PRESETS = [
  { name: 'Zoolyum Orange', hex: '#ea580c' },
  { name: 'Electric Blue', hex: '#2563eb' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Royal Purple', hex: '#7c3aed' },
  { name: 'Crimson Red', hex: '#dc2626' },
  { name: 'Cyan / Teal', hex: '#0891b2' },
  { name: 'Amber Gold', hex: '#d97706' },
  { name: 'Rose Pink', hex: '#e11d48' },
  { name: 'Indigo Night', hex: '#4f46e5' },
];
