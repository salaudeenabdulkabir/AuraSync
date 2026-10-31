'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronRight, ImagePlus, Info, Layers2, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LookDialog } from '@/components/LookDialog';
import { cn } from '@/lib/cn';
import { BiometricSkinCard } from '@/components/BiometricSkinCard';
import { GarmentCatalog } from '@/components/GarmentCatalog';
import { HarmonyScoreGauge } from '@/components/HarmonyScoreGauge';
import { LookStageScrubber } from '@/components/LookStageScrubber';
import { TelemetryDrawer } from '@/components/TelemetryDrawer';
import { computeHarmonyAudit } from '@/lib/harmony-math';
import { planRepair } from '@/lib/agent';
import { garments, presets } from '@/lib/presets';
import type { Telemetry } from '@/lib/youcam';

type AnalysisResponse = { skinHex: string; redness: number | null; moisture: number | null; texture: number | null; telemetry: Telemetry[]; error?: string };
type TryOnResponse = { image: string; telemetry: Telemetry; error?: string };
type HarmonizeResponse = { image: string; telemetry?: Telemetry; skipped: boolean; plan: { projectedAudit: { score: number }; rationale: string[] }; error?: string };

async function parseResponse<T extends { error?: string }>(response: Response): Promise<T> {
  const body = await response.json() as T;
  if (!response.ok) throw new Error(body.error || 'Request failed.');
  return body;
}

export default function Home() {
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [presetId, setPresetId] = useState('amara');
  const [garmentId, setGarmentId] = useState('magenta');
  const [stage, setStage] = useState(1);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [outfitFile, setOutfitFile] = useState<File | null>(null);
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [garmentHex, setGarmentHex] = useState('#C51475');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [harmonizedImage, setHarmonizedImage] = useState<string | null>(null);
  const [projectedScore, setProjectedScore] = useState<number | null>(null);
  const [events, setEvents] = useState<Telemetry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bundleOpen, setBundleOpen] = useState(false);

  const preset = presets.find((item) => item.id === presetId) || presets[0];
  const garment = garments.find((item) => item.id === garmentId) || garments[0];
  const currentSkinHex = mode === 'demo' ? preset.skinHex : analysis?.skinHex || null;
  const audit = useMemo(() => currentSkinHex ? computeHarmonyAudit(currentSkinHex, mode === 'demo' ? garment.hex : garmentHex, mode === 'live' ? analysis?.redness : null) : null, [currentSkinHex, mode, garment.hex, garmentHex, analysis?.redness]);
  const showDemoStages = mode === 'demo' && presetId === 'amara' && garmentId === 'magenta';

  function selectMode(next: 'demo' | 'live') { setMode(next); setStage(next === 'demo' && presetId === 'amara' && garmentId === 'magenta' ? 1 : 0); setError(null); setProjectedScore(null); }
  function choosePortrait(file: File | undefined) {
    if (!file) return;
    if (portraitUrl) URL.revokeObjectURL(portraitUrl);
    setPortraitFile(file); setPortraitUrl(URL.createObjectURL(file)); setAnalysis(null); setTryOnImage(null); setHarmonizedImage(null); setProjectedScore(null); setStage(0);
  }
  async function analyze() {
    if (!portraitFile) { setError('Upload a front-facing portrait to start live analysis.'); return; }
    setBusy('Analyzing skin'); setError(null);
    try {
      const form = new FormData(); form.set('portrait', portraitFile);
      const result = await parseResponse<AnalysisResponse>(await fetch('/api/youcam/analyze', { method: 'POST', body: form }));
      setAnalysis(result); setEvents((current) => [...current, ...result.telemetry]); setTelemetryOpen(true);
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(null); }
  }
  async function tryOn() {
    if (!outfitFile || !garmentFile || !analysis) { setError('Analyze a close-up, then upload an outfit photo and garment image.'); return; }
    setBusy('Rendering apparel try-on'); setError(null);
    try {
      const form = new FormData();
      form.set('portrait', outfitFile); form.set('garment', garmentFile); form.set('skinHex', analysis.skinHex); form.set('garmentHex', garmentHex);
      if (analysis.redness != null) form.set('redness', String(analysis.redness));
      const result = await parseResponse<TryOnResponse>(await fetch('/api/youcam/try-on', { method: 'POST', body: form }));
      setTryOnImage(result.image); setHarmonizedImage(null); setProjectedScore(null); setStage(1); setEvents((current) => [...current, result.telemetry]); setTelemetryOpen(true);
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(null); }
  }
  async function harmonize() {
    if (!tryOnImage || !analysis) { setError('Run a live apparel try-on first.'); return; }
    setBusy('Harmonizing look'); setError(null);
    try {
      const result = await parseResponse<HarmonizeResponse>(await fetch('/api/youcam/harmonize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: tryOnImage, skinHex: analysis.skinHex, garmentHex, redness: analysis.redness }) }));
      setHarmonizedImage(result.skipped ? null : result.image);
      setProjectedScore(result.plan.projectedAudit.score);
      setStage(result.skipped ? 1 : 2);
      if (result.telemetry) setEvents((current) => [...current, result.telemetry!]);
      setTelemetryOpen(true);
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(null); }
  }

  const palette = audit ? planRepair(mode === 'demo' ? garment.hex : garmentHex, audit, mode === 'live' ? analysis?.redness : null) : null;

  return <main>
    <a href="#workspace" className="skip-link">Skip to studio</a>
    <header className="app-header">
      <a className="brand" href="#studio" aria-label="AuraSync studio"><span className="brand-symbol"><Layers2 size={22} strokeWidth={1.8} /></span>AuraSync</a>
      <nav aria-label="Main navigation"><a className="current" href="#studio">Studio</a><a href={mode === 'demo' ? '#wardrobe' : '#photo-input'}>{mode === 'demo' ? 'Wardrobe' : 'Your photos'}</a><a href="#science">Color report</a></nav>
      {mode === 'demo' ? <Button onClick={() => setBundleOpen(true)} className="header-look">Your look <ChevronRight size={16} /></Button> : <span className="badge header-look">Local workspace</span>}
    </header>

    <section className="workspace-intro" id="studio">
      <div><p className="eyebrow">Personal styling studio</p><h1>A look that feels like you.</h1><p>Explore the connection between your complexion, clothing and makeup.</p></div>
      <div className="mode-control"><div className="segmented-control" role="group" aria-label="Studio mode">
        <Button variant="quiet" className={cn(mode === 'demo' && 'selected')} aria-pressed={mode === 'demo'} disabled={!!busy} onClick={() => selectMode('demo')}>Sample studio</Button>
        <Button variant="quiet" className={cn(mode === 'live' && 'selected')} aria-pressed={mode === 'live'} disabled={!!busy} onClick={() => selectMode('live')}>Use my photos</Button>
      </div><span>{mode === 'demo' ? 'Explore without uploading a photo' : 'Powered by YouCam · API credits apply'}</span></div>
    </section>

    <div className="workspace-notice"><Info size={16} /><p>{mode === 'demo' ? 'Sample studio uses generated imagery and manually chosen colors. Images are illustrative, not YouCam results.' : 'Your uploaded photos are sent to YouCam for processing. A local API key is required.'}</p></div>

    <div className="workspace-grid" id="workspace">
      <aside className="selection-column" aria-label="Look settings">
        <section className="model-panel" id="photo-input">
          <div className="section-heading"><h2>{mode === 'demo' ? 'Choose a model' : 'Your photos'}</h2><span className="step-label">01</span></div>
          {mode === 'demo' ? <>
            <p className="supporting">Start with a sample complexion.</p>
            <div className="personas">{presets.map((person) => <Button variant="quiet" key={person.id} onClick={() => { setPresetId(person.id); setStage(0); setProjectedScore(null); }} className={cn('persona', presetId === person.id && 'selected')} aria-pressed={presetId === person.id}>
              <span className="persona-image" style={{ backgroundImage: "url('/demo-assets/portraits.png')", backgroundPosition: `${person.panel * 50}% center` }} />
              <span><strong>{person.name}</strong><small>{person.descriptor}</small></span>
              {presetId === person.id && <Check size={16} className="selection-check" />}
            </Button>)}</div>
          </> : <div className="upload-stack">
            <label className="upload-zone"><ImagePlus size={22} /><strong>{portraitFile ? portraitFile.name : 'Choose a close-up'}</strong><span>Face fills most of the frame.<br />JPEG or PNG, up to 10 MB.</span><input type="file" accept="image/jpeg,image/png" disabled={!!busy} onChange={(event) => choosePortrait(event.target.files?.[0])} /></label>
            <Button variant="primary" onClick={analyze} disabled={!!busy || !portraitFile}>{busy === 'Analyzing skin' ? 'Analyzing…' : 'Analyze complexion'}<ArrowRight size={16} /></Button>
          </div>}
        </section>
        {mode === 'demo' && <div id="wardrobe"><GarmentCatalog selected={garmentId} onSelect={(id) => { setGarmentId(id); setStage(0); setProjectedScore(null); }} /></div>}
        {mode === 'live' && <section className="live-inputs">
          <div className="section-heading"><h2>Try on a garment</h2><span className="step-label">02</span></div>
          <label className="upload-zone compact"><ImagePlus size={20} /><strong>{outfitFile ? outfitFile.name : 'Choose an outfit photo'}</strong><span>Half or full body, same person</span><input type="file" accept="image/jpeg,image/png" disabled={!!busy} onChange={(event) => { setOutfitFile(event.target.files?.[0] || null); setTryOnImage(null); setHarmonizedImage(null); setStage(0); setProjectedScore(null); }} /></label>
          <label className="upload-zone compact"><ImagePlus size={20} /><strong>{garmentFile ? garmentFile.name : 'Choose a garment photo'}</strong><span>A clear product image</span><input type="file" accept="image/jpeg,image/png" disabled={!!busy} onChange={(event) => { setGarmentFile(event.target.files?.[0] || null); setTryOnImage(null); setHarmonizedImage(null); setStage(0); setProjectedScore(null); }} /></label>
          <div className="hex-input"><label htmlFor="garment-hex">Garment color</label><input id="garment-hex" type="color" value={garmentHex} disabled={!!busy} onChange={(event) => { setGarmentHex(event.target.value); setHarmonizedImage(null); setProjectedScore(null); setStage(tryOnImage ? 1 : 0); }} /><code>{garmentHex}</code></div>
          <Button variant="primary" disabled={!!busy || !analysis || !garmentFile || !outfitFile} onClick={tryOn}>{busy === 'Rendering apparel try-on' ? 'Creating try-on…' : 'Create try-on'}<ArrowRight size={16} /></Button>
        </section>}
      </aside>

      <section className="preview-column" id="look-preview" aria-label="Look preview" aria-busy={!!busy}>
        <div className="preview-heading"><div><span className="eyebrow">Look preview</span><h2>{mode === 'demo' ? `${preset.name} · ${garment.kind}` : 'Your personal fitting room'}</h2></div><span className="badge">{mode === 'demo' ? 'Sample' : 'Live'}</span></div>
        <LookStageScrubber stage={stage} setStage={setStage} presetPanel={preset.panel} portraitUrl={mode === 'live' ? portraitUrl : null} liveImages={mode === 'live' ? [portraitUrl, tryOnImage, harmonizedImage] : undefined} demoShowStages={showDemoStages} />
        <p className="preview-note">{mode === 'demo' ? showDemoStages ? 'An illustrative study in three stages. Select a stage to compare.' : 'The three-stage study is available for Amara + The Magenta Edit.' : 'Your try-on and makeup results appear here after processing.'}</p>
        {error && <div className="inline-error" role="alert"><Info size={18} /><p>{error}</p><Button variant="icon" onClick={() => setError(null)} aria-label="Dismiss error"><X size={16} /></Button></div>}
        {busy && <p className="processing-status" role="status">{busy}. This can take a moment.</p>}
        <div className="look-summary"><div><span className="eyebrow">Selected garment</span><strong>{mode === 'demo' ? garment.name : garmentFile?.name || 'Choose your own garment'}</strong></div>{mode === 'demo' && <Button variant="quiet" onClick={() => setBundleOpen(true)}>View look <ArrowRight size={16} /></Button>}</div>
      </section>

      <aside className="inspector-column" id="science" aria-label="Color report">
        <div className="inspector-title"><SlidersHorizontal size={16} /><span>Your color report</span></div>
        <HarmonyScoreGauge audit={audit} projectedScore={projectedScore} source={mode === 'demo' ? 'sample' : 'youcam'} />
        <section className="palette-section">
          <div className="section-heading"><h2>Bring it together</h2></div>
          <p className="supporting">A lip and cheek palette drawn from the colors in this look.</p>
          {palette && <div className="palette-swatches">
            <div><span style={{ backgroundColor: palette.lipHex }} /><strong>Lip</strong><code>{palette.lipHex}</code></div>
            <div><span style={{ backgroundColor: palette.blushHex }} /><strong>Cheek</strong><code>{palette.blushHex}</code></div>
            <div><span style={{ backgroundColor: mode === 'demo' ? garment.hex : garmentHex }} /><strong>Garment</strong><code>{mode === 'demo' ? garment.hex : garmentHex}</code></div>
          </div>}
          <Button variant="primary" className="full-width" onClick={mode === 'demo' ? () => { if (palette) setProjectedScore(palette.projectedAudit.score); setStage(2); } : harmonize} disabled={!!busy || (mode === 'demo' && !showDemoStages) || (mode === 'live' && !tryOnImage)}>{busy === 'Harmonizing look' ? 'Applying makeup…' : 'Preview makeup'}<ArrowRight size={16} /></Button>
          <p className="supporting action-note">{mode === 'demo' ? showDemoStages ? 'Shows the illustrative makeup study.' : 'Select Amara + Magenta to see the study.' : tryOnImage ? 'Creates a makeup try-on with YouCam.' : 'Create a garment try-on first.'}</p>
        </section>
        <BiometricSkinCard skinHex={currentSkinHex} source={mode === 'demo' ? 'sample' : analysis ? 'youcam' : 'pending'} redness={analysis?.redness} moisture={analysis?.moisture} texture={analysis?.texture} />
      </aside>
    </div>
    <TelemetryDrawer open={telemetryOpen} setOpen={setTelemetryOpen} events={events} source={mode === 'demo' ? 'sample' : 'youcam'} />
    <LookDialog open={bundleOpen} onOpenChange={setBundleOpen} garment={garment} />
    <footer className="app-footer"><span>AuraSync <span> / Personal styling, considered.</span></span><a href="https://docs.perfectcorp.com/" target="_blank" rel="noreferrer">Powered by YouCam <ArrowRight size={14} /></a></footer>
  </main>;
}
