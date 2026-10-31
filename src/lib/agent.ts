import { computeHarmonyAudit, labToHex, type HarmonyAudit } from './harmony-math';

export type RepairPlan = { lipHex: string; blushHex: string; rationale: string[]; effects: Record<string, unknown>[]; projectedAudit: HarmonyAudit };

export function planRepair(garmentHex: string, audit: HarmonyAudit, rednessScore?: number | null): RepairPlan {
  const { skinLab: skin, garmentLab: garment } = audit;
  const lipHex = labToHex({
    l: Math.max(20, skin.l * 0.52 + garment.l * 0.48 - (audit.washout ? 13 : 8)),
    a: skin.a * 0.58 + garment.a * 0.42,
    b: skin.b * 0.64 + garment.b * 0.36
  });
  const blushHex = labToHex({
    l: Math.min(82, skin.l + 7),
    a: (skin.a * 0.7 + garment.a * 0.3) * (audit.rednessRisk ? 0.6 : 0.85),
    b: skin.b * 0.72 + garment.b * 0.28
  });
  const rationale = [
    audit.washout ? `L* contrast is ${audit.lightnessDelta.toFixed(1)}; add a defined lip to restore facial contrast.` : 'Skin-to-garment lightness contrast is adequate.',
    audit.undertoneClash ? 'A warm bridge shade reduces the opposing color temperature.' : 'Garment and skin color temperatures are aligned.',
    audit.rednessRisk ? 'Keep cheek saturation low to avoid emphasizing measured redness.' : 'No measured redness amplification flag.'
  ];
  const effects = [
    { category: 'skin_smooth', skinSmoothStrength: 0, skinSmoothColorIntensity: 0 },
    { category: 'lip_color', shape: { name: 'original' }, style: { type: 'full' }, palettes: [{ color: lipHex, texture: 'matte', colorIntensity: 70 }] },
    { category: 'blush', pattern: { name: '1color1' }, palettes: [{ color: blushHex, texture: 'matte', colorIntensity: audit.rednessRisk ? 20 : 35 }] }
  ];
  // The repaired color score measures the selected bridge shade against the garment.
  // It is a projected palette score, not a measured effect on the person's skin or returns.
  const projectedAudit = computeHarmonyAudit(lipHex, garmentHex, rednessScore);
  return { lipHex, blushHex, rationale, effects, projectedAudit };
}
