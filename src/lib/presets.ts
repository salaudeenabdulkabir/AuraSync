import { computeHarmonyAudit } from './harmony-math';

export const garments = [
  { id: 'magenta', name: 'The Magenta Edit', kind: 'Sculpted blouse', price: 168, hex: '#C51475', temperature: 'Cool', panel: 0 },
  { id: 'terracotta', name: 'Sienna Silk', kind: 'Silk shirt', price: 194, hex: '#B9633D', temperature: 'Warm', panel: 1 },
  { id: 'beige', name: 'Atelier Trench', kind: 'Tailored outerwear', price: 320, hex: '#D9C8AB', temperature: 'Neutral', panel: 2 },
  { id: 'emerald', name: 'Nocturne Emerald', kind: 'Satin blouse', price: 186, hex: '#075343', temperature: 'Cool', panel: 3 }
] as const;

export const presets = [
  { id: 'amara', name: 'Amara', descriptor: 'Warm deep', skinHex: '#9C6448', panel: 0 },
  { id: 'mei', name: 'Mei', descriptor: 'Cool light', skinHex: '#D7AC91', panel: 1 },
  { id: 'priya', name: 'Priya', descriptor: 'Neutral medium', skinHex: '#B98261', panel: 2 }
] as const;

export function demoAudit(presetId: string, garmentId: string) {
  const preset = presets.find((item) => item.id === presetId) || presets[0];
  const garment = garments.find((item) => item.id === garmentId) || garments[0];
  return computeHarmonyAudit(preset.skinHex, garment.hex);
}
