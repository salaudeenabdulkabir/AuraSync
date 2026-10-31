import { Check } from 'lucide-react';
import { garments } from '@/lib/presets';
import { Button } from './ui/Button';
import { cn } from '@/lib/cn';
export function GarmentCatalog({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return <section className="catalog-section" aria-labelledby="wardrobe-heading">
    <div className="section-heading"><h2 id="wardrobe-heading">Wardrobe</h2><span className="count">4</span></div>
    <p className="supporting">Choose a color to explore.</p>
    <div className="garment-grid">
      {garments.map((item) => <Button variant="quiet" className={cn('garment-card', selected === item.id && 'selected')} key={item.id} onClick={() => onSelect(item.id)} aria-pressed={selected === item.id}>
        <span className="garment-image" style={{ backgroundImage: "url('/demo-assets/garments.png')", backgroundPosition: `${item.panel * 100 / 3}% center` }}>{selected === item.id && <span className="garment-check"><Check size={13} /></span>}</span>
        <span className="garment-info"><strong>{item.name}</strong><span>{item.kind}</span><span className="garment-meta"><i style={{ background: item.hex }} />{item.temperature}<b>${item.price}</b></span></span>
      </Button>)}
    </div>
  </section>;
}
