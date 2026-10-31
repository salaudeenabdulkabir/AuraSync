import { hexToLab, labLabel } from '@/lib/harmony-math';
export function BiometricSkinCard({ skinHex, source, redness, moisture, texture }: { skinHex: string | null; source: 'sample' | 'youcam' | 'pending'; redness?: number | null; moisture?: number | null; texture?: number | null }) {
  const lab = skinHex ? hexToLab(skinHex) : null;
  return <section className="skin-profile">
    <div className="section-heading"><h2>Complexion</h2><span className="badge">{source === 'youcam' ? 'Measured' : source === 'sample' ? 'Sample' : 'Pending'}</span></div>
    <div className="skin-row"><span className="skin-swatch" style={{ background: skinHex || 'var(--surface-container)' }} /><div><strong>{skinHex || 'No analysis yet'}</strong><p>{source === 'sample' ? 'Manually selected color' : source === 'pending' ? 'Analyze a close-up to begin' : 'Measured by YouCam'}</p></div></div>
    <details className="technical-details"><summary>Color & skin details</summary><div className="details-body"><p className="supporting">CIELAB · {lab ? labLabel(lab) : 'Awaiting analysis'}</p><div className="metric-grid">{([['Redness', redness], ['Moisture', moisture], ['Texture', texture]] as const).map(([label, value]) => <div key={label}><span>{label}</span><strong>{source === 'youcam' && value != null ? value : '—'}</strong></div>)}</div><p className="supporting">{source === 'youcam' ? 'Cosmetic measurements from YouCam.' : 'Skin metrics are available after a live analysis.'}</p></div></details>
  </section>;
}
