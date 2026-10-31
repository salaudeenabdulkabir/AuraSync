export type Lab = { l: number; a: number; b: number };
export type HarmonyAudit = {
  score: number;
  deltaE76: number;
  lightnessDelta: number;
  washout: boolean;
  undertoneClash: boolean;
  rednessRisk: boolean | null;
  penalties: { washout: number; undertone: number; redness: number; chroma: number };
  skinLab: Lab;
  garmentLab: Lab;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function hexToLab(hex: string): Lab {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new Error('Expected a six-digit HEX color');
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;
  const f = (t: number) => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
  return { l: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) };
}

export function deltaE76(left: Lab, right: Lab): number {
  return Math.hypot(left.l - right.l, left.a - right.a, left.b - right.b);
}

export function labToHex(lab: Lab): string {
  const fy = (lab.l + 16) / 116;
  const fx = fy + lab.a / 500;
  const fz = fy - lab.b / 200;
  const inverse = (v: number) => v ** 3 > 216 / 24389 ? v ** 3 : (116 * v - 16) / (24389 / 27);
  const x = inverse(fx) * 0.95047;
  const y = inverse(fy);
  const z = inverse(fz) * 1.08883;
  const linear = [
    3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
    -0.9692660 * x + 1.8760108 * y + 0.0415560 * z,
    0.0556434 * x - 0.2040259 * y + 1.0572252 * z
  ];
  return `#${linear.map((v) => {
    const rgb = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055;
    return Math.round(clamp(rgb, 0, 1) * 255).toString(16).padStart(2, '0');
  }).join('').toUpperCase()}`;
}

/** An explainable styling heuristic, not a clinical or return-risk prediction. */
export function computeHarmonyAudit(skinHex: string, garmentHex: string, rednessScore?: number | null): HarmonyAudit {
  const skinLab = hexToLab(skinHex);
  const garmentLab = hexToLab(garmentHex);
  const lightnessDelta = Math.abs(skinLab.l - garmentLab.l);
  const distance = deltaE76(skinLab, garmentLab);
  const washout = lightnessDelta < 12;
  const skinWarmth = skinLab.b - skinLab.a * 0.35;
  const garmentWarmth = garmentLab.b - garmentLab.a * 0.35;
  const undertoneClash = Math.sign(skinWarmth) !== Math.sign(garmentWarmth) && Math.abs(skinWarmth - garmentWarmth) > 15;
  // YouCam ui_score is a health-oriented score: lower values indicate more concern.
  const rednessRisk = rednessScore == null ? null : garmentLab.a > 25 && rednessScore <= 50;
  const chroma = Math.hypot(garmentLab.a, garmentLab.b);
  const penalties = {
    washout: washout ? Math.round((12 - lightnessDelta) * 1.75) : 0,
    undertone: undertoneClash ? 17 : 0,
    redness: rednessRisk ? Math.round(clamp((55 - rednessScore!) * 0.35, 0, 17)) : 0,
    chroma: chroma > 65 && distance > 75 ? 7 : 0
  };
  const score = Math.round(clamp(92 - Object.values(penalties).reduce((sum, penalty) => sum + penalty, 0), 0, 100));
  return { score, deltaE76: distance, lightnessDelta, washout, undertoneClash, rednessRisk, penalties, skinLab, garmentLab };
}

export function labLabel(lab: Lab): string { return `${lab.l.toFixed(1)}, ${lab.a.toFixed(1)}, ${lab.b.toFixed(1)}`; }
