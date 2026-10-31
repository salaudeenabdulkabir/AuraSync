import { Check, Minus } from 'lucide-react';
import type { HarmonyAudit } from '@/lib/harmony-math';
export function HarmonyScoreGauge({ audit, projectedScore, source }: { audit: HarmonyAudit | null; projectedScore: number | null; source: 'sample' | 'youcam' }) {
  return <section className="harmony-panel" aria-labelledby="harmony-heading">
    <div className="section-heading"><h2 id="harmony-heading">Color harmony</h2><span className="badge">{source === 'sample' ? 'Sample' : 'YouCam'}</span></div>
    {audit ? <>
      <div className="score-value"><strong>{audit.score}</strong><span>/ 100</span></div>
      <meter className="score-meter" min={0} max={100} value={audit.score} aria-label="Color harmony score" />
      <h3>{audit.score < 80 ? 'A little color tension' : 'A balanced pairing'}</h3>
      <p className="supporting">{audit.score < 80 ? 'A complementary makeup shade can connect this garment with your complexion.' : 'The lightness and warmth of these colors sit comfortably together.'}</p>
      {projectedScore !== null && <div className="projected" role="status"><span>Makeup shade / garment fit</span><strong>{projectedScore}<small>/100</small></strong></div>}
      <div className="audit-rows">
        <div><span>Lightness contrast</span><strong>{audit.washout ? <Minus size={14} /> : <Check size={14} />}{audit.washout ? 'Low' : 'Distinct'}</strong></div>
        <div><span>Color temperature</span><strong>{audit.undertoneClash ? <Minus size={14} /> : <Check size={14} />}{audit.undertoneClash ? 'Opposing' : 'Aligned'}</strong></div>
      </div>
      <details className="technical-details"><summary>How this is calculated</summary><div className="details-body"><p className="supporting">A color comparison, not a beauty rating. The score starts at 92 and subtracts predefined styling penalties.</p><dl><div><dt>ΔE76 distance</dt><dd>{audit.deltaE76.toFixed(1)}</dd></div><div><dt>Lightness |ΔL*|</dt><dd>{audit.lightnessDelta.toFixed(1)}</dd></div><div><dt>Redness amplification</dt><dd>{audit.rednessRisk === null ? 'Not measured' : audit.rednessRisk ? 'Flagged' : 'Clear'}</dd></div></dl></div></details>
    </> : <div className="audit-empty"><span>—</span><h3>Ready when you are</h3><p className="supporting">Analyze your close-up to compare your complexion with a garment color.</p><a href="#photo-input" className="text-link">Start with a photo</a></div>}
  </section>;
}
