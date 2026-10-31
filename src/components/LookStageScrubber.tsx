'use client';
import { ImagePlus } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/cn';
const stages = ['Original', 'Try-on', 'With makeup'];
export function LookStageScrubber({ stage, setStage, presetPanel, portraitUrl, liveImages, demoShowStages }: { stage: number; setStage: (stage: number) => void; presetPanel: number; portraitUrl?: string | null; liveImages?: (string | null)[]; demoShowStages: boolean }) {
  const maxStage = liveImages ? (liveImages[2] ? 2 : liveImages[1] ? 1 : 0) : demoShowStages ? 2 : 0;
  const liveImage = liveImages?.[stage] || portraitUrl;
  const empty = !!liveImages && !liveImage;
  const background = liveImage
    ? { backgroundImage: `url('${liveImage}')`, backgroundSize: 'contain', backgroundPosition: 'center' }
    : { backgroundImage: `url('/demo-assets/${demoShowStages ? 'stages' : 'portraits'}.png')`, backgroundSize: '300% auto', backgroundPosition: `${(demoShowStages ? stage : presetPanel) * 50}% top` };
  return <div className="preview">
    <div className="preview-canvas">
      {empty ? <div className="preview-empty"><ImagePlus size={32} strokeWidth={1.5} /><h3>Your photo goes here</h3><p>Start with a well-lit, front-facing close-up.</p><a className="button button-secondary" href="#photo-input">Choose a photo</a></div> : <div className="stage-image" style={background} role="img" aria-label={`${stages[stage]} styling preview`} />}
      {!empty && <><span className="image-label">{liveImages ? stage === 0 ? 'Your photo' : 'YouCam result' : 'Sample image'}</span><span className="image-step">{stage + 1} / 3</span></>}
    </div>
    <div className="preview-controls" role="group" aria-label="Preview stages">{stages.map((title, index) => <Button key={title} variant="quiet" onClick={() => setStage(index)} className={cn('stage-button', stage === index && 'selected')} aria-pressed={stage === index} disabled={index > maxStage}><span>{index + 1}</span>{title}</Button>)}</div>
  </div>;
}
