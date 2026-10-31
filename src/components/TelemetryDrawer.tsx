'use client';
import { Activity, ChevronDown, ChevronUp, Database, ExternalLink } from 'lucide-react';
import type { Telemetry } from '@/lib/youcam';
import { Button } from './ui/Button';
export function TelemetryDrawer({ open, setOpen, events, source }: { open: boolean; setOpen: (open: boolean) => void; events: Telemetry[]; source: 'sample' | 'youcam' }) {
  return <section className="telemetry">
    <Button variant="quiet" className="telemetry-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="activity-log"><span><Activity size={16} /> Processing activity <small>{events.length ? `${events.length} tasks` : 'No tasks yet'}</small></span>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</Button>
    <div id="activity-log" hidden={!open} className="telemetry-content">
      {events.length ? events.map((event, index) => <div className="telemetry-event" key={`${event.taskId}-${index}`}><div><strong>{event.feature}</strong><span>{event.cache === 'hit' ? 'Cached result' : 'Live task'}</span></div><small>Task {event.taskId.slice(0, 16)}… · {(event.elapsedMs / 1000).toFixed(1)}s · {event.units == null ? 'units per account' : `${event.units} units`}</small></div>) : <p className="telemetry-empty"><Database size={20} />{source === 'sample' ? 'No API calls in the sample studio. Use your photos to start a live task.' : 'Your first YouCam task will appear here.'}</p>}
      <div className="telemetry-equation"><code>ΔE76 = √(ΔL*² + Δa*² + Δb*²)</code><code>Low contrast: |ΔL*| &lt; 12</code></div>
      <a href="https://yce.perfectcorp.com/ai-api/agent/mcp-skill" target="_blank" rel="noreferrer">YouCam reference <ExternalLink size={13} /></a>
    </div>
  </section>;
}
