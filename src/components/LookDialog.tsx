'use client';
import { Dialog } from '@base-ui/react/dialog';
import { ArrowRight, X } from 'lucide-react';
import { garments } from '@/lib/presets';
import { Button } from './ui/Button';
export function LookDialog({ open, onOpenChange, garment }: { open: boolean; onOpenChange: (open: boolean) => void; garment: typeof garments[number] }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Backdrop className="dialog-backdrop" />
      <Dialog.Popup className="look-dialog">
        <Dialog.Close className="button button-icon dialog-close" aria-label="Close look"><X size={20} /></Dialog.Close>
        <span className="eyebrow">Your selection</span>
        <Dialog.Title>Your look</Dialog.Title>
        <Dialog.Description>A garment and a suggested makeup palette, brought together.</Dialog.Description>
        <div className="bundle-row">
          <span className="bundle-thumb" style={{ backgroundImage: "url('/demo-assets/garments.png')", backgroundPosition: `${garment.panel * 100 / 3}% center` }} />
          <div><strong>{garment.name}</strong><small>{garment.kind}</small></div><strong>${garment.price}</strong>
        </div>
        <div className="bundle-row"><span>Makeup palette</span><span className="muted">Shade suggestion</span></div>
        <p className="supporting">This is a sample collection. Checkout is not available.</p>
        <Button variant="primary" onClick={() => onOpenChange(false)}>Back to studio <ArrowRight size={16} /></Button>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
