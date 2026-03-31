import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { calculateRippleEdit, calculateRollingEdit } from '../utils/editMath';
import { MousePointer2, MoveHorizontal, Scissors, ArrowRightLeft } from 'lucide-react';

export default function TimelinePanel() {
  const { project, activeSequenceId, debugLogTimelineState, addClipToTrack, updateTrackClips } = useStore();

  const activeSequence = project.sequences.find(s => s.id === activeSequenceId);
  const [draggedOverTrackId, setDraggedOverTrackId] = useState<string | null>(null);

  type EditMode = 'selection' | 'ripple' | 'rolling' | 'razor';
  const [activeTool, setActiveTool] = useState<EditMode>('selection');

  const [trimState, setTrimState] = useState<{
    trackId: string;
    clipId: string;
    side: 'in' | 'out';
    startX: number;
    initialClips: any[];
  } | null>(null);

  const PIXELS_PER_SECOND = 20;

  const handleDragOver = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    setDraggedOverTrackId(trackId);
  };

  const handleDragLeave = () => {
    setDraggedOverTrackId(null);
  };

  const handleDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    setDraggedOverTrackId(null);
    if (!activeSequenceId) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'MEDIA_ITEM') {
        const dropBodyRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const dropX = e.clientX - dropBodyRect.left;
        const trackStartOffset = Math.max(0, dropX / PIXELS_PER_SECOND);

        addClipToTrack(activeSequenceId, trackId, {
          id: crypto.randomUUID(),
          mediaId: data.id,
          trimIn: 0,
          trimOut: 5, // Default 5 seconds for now
          trackStart: trackStartOffset
        });
      }
    } catch (err) {
      console.error("Failed to parse drop data", err);
    }
  };

  const handleTestAddClip = () => {
    if (!activeSequenceId) return;
    addClipToTrack(activeSequenceId, 'v1', {
      id: crypto.randomUUID(),
      mediaId: 'dummy-media-id',
      trimIn: 0,
      trimOut: 5,
      trackStart: 0
    });
    addClipToTrack(activeSequenceId, 'v1', {
      id: crypto.randomUUID(),
      mediaId: 'dummy-media-id',
      trimIn: 0,
      trimOut: 5,
      trackStart: 5
    });
    addClipToTrack(activeSequenceId, 'v1', {
      id: crypto.randomUUID(),
      mediaId: 'dummy-media-id',
      trimIn: 0,
      trimOut: 5,
      trackStart: 10
    });
    
    // Call debug immediately after (it might log the previous state if not careful,
    // but the get() inside the store function will be accurate)
    setTimeout(() => {
      debugLogTimelineState();
    }, 100);
  };

  const handlePointerDown = (e: React.PointerEvent, trackId: string, clipId: string, side: 'in' | 'out') => {
    if (activeTool !== 'ripple' && activeTool !== 'rolling') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const track = activeSequence?.tracks.find(t => t.id === trackId);
    if (!track) return;

    setTrimState({
      trackId,
      clipId,
      side,
      startX: e.clientX,
      initialClips: JSON.parse(JSON.stringify(track.clips)) // deep clone for math
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!trimState || !activeSequenceId) return;

    const deltaX = e.clientX - trimState.startX;
    const deltaSeconds = deltaX / PIXELS_PER_SECOND;

    if (activeTool === 'ripple') {
      const newClips = calculateRippleEdit(
        trimState.initialClips,
        trimState.clipId,
        deltaSeconds,
        trimState.side
      );
      updateTrackClips(activeSequenceId, trimState.trackId, newClips);
    } else if (activeTool === 'rolling') {
      // Find the adjacent clip.
      const clips = trimState.initialClips;
      const targetIndex = clips.findIndex(c => c.id === trimState.clipId);
      if (targetIndex === -1) return;

      if (trimState.side === 'out' && targetIndex < clips.length - 1) {
        const rightClipId = clips[targetIndex + 1].id;
        const newClips = calculateRollingEdit(
          trimState.initialClips,
          trimState.clipId,
          rightClipId,
          deltaSeconds
        );
        updateTrackClips(activeSequenceId, trimState.trackId, newClips);
      } else if (trimState.side === 'in' && targetIndex > 0) {
         const leftClipId = clips[targetIndex - 1].id;
         // Moving an 'in' point to the right means deltaSeconds > 0 for this interaction,
         // but from the viewpoint of the rolling edit, adjusting the PREVIOUS clip's OUT point,
         // the previous clip gets longer (delta > 0).
         const newClips = calculateRollingEdit(
           trimState.initialClips,
           leftClipId,
           trimState.clipId,
           deltaSeconds
         );
         updateTrackClips(activeSequenceId, trimState.trackId, newClips);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (trimState) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setTrimState(null);
    }
  };

  return (
    <div className="flex-1 bg-[var(--color-nle-panel)] flex flex-col overflow-hidden relative">
      <div className="px-3 py-1 border-b border-[var(--color-nle-border)] text-xs font-semibold bg-[#1a1a1a] flex justify-between items-center z-10 w-full">
        <div className="flex items-center gap-4">
          <span>Timeline {activeSequence ? `- ${activeSequence.name}` : ''}</span>
          <div className="flex border border-[#333] rounded overflow-hidden">
            <button 
              className={`px-2 py-0.5 flex items-center justify-center ${activeTool === 'selection' ? 'bg-[#3b82f6] text-white' : 'hover:bg-[#333] text-gray-400'}`}
              onClick={() => setActiveTool('selection')}
              title="Selection Tool"
            >
              <MousePointer2 size={14} />
            </button>
            <button 
              className={`px-2 py-0.5 flex items-center justify-center ${activeTool === 'ripple' ? 'bg-[#eab308] text-white' : 'hover:bg-[#333] text-gray-400'}`}
              onClick={() => setActiveTool('ripple')}
              title="Ripple Edit (Yellow)"
            >
              <ArrowRightLeft size={14} />
            </button>
            <button 
              className={`px-2 py-0.5 flex items-center justify-center ${activeTool === 'rolling' ? 'bg-[#ef4444] text-white' : 'hover:bg-[#333] text-gray-400'}`}
              onClick={() => setActiveTool('rolling')}
              title="Rolling Edit (Red)"
            >
              <MoveHorizontal size={14} />
            </button>
            <button 
              className={`px-2 py-0.5 flex items-center justify-center ${activeTool === 'razor' ? 'bg-[#a855f7] text-white' : 'hover:bg-[#333] text-gray-400'}`}
              onClick={() => setActiveTool('razor')}
              title="Razor Tool"
            >
              <Scissors size={14} />
            </button>
          </div>
        </div>
        <button
          onClick={handleTestAddClip}
          className="px-2 py-0.5 bg-[var(--color-nle-accent)] hover:bg-[var(--color-nle-accent-hover)] text-white rounded text-[10px]"
        >
          [QG 4.3] Test Layout
        </button>
      </div>
      
      <div className="flex-1 p-2 flex flex-col gap-1 overflow-y-auto overflow-x-auto relative">
        {activeSequence ? (
          <div className="flex flex-col gap-[2px] min-w-max">
            {/* Timeline Header / Time Ruler Placeholder */}
            <div className="h-6 border-b border-[#333] mb-2 flex items-end px-2 text-[10px] text-gray-500">
               <span className="w-[100px]">Tracks</span>
               <span className="flex-1">00:00:00:00</span>
            </div>

            {/* Render Tracks */}
            {activeSequence.tracks.map(track => (
              <div key={track.id} className="flex h-12 bg-[#2a2a2a] border border-[#1a1a1a]">
                {/* Track Header */}
                <div className="w-[100px] border-r border-[#1a1a1a] flex items-center px-2 text-xs text-gray-400 bg-[#222]">
                  {track.name}
                </div>
                {/* Track Body */}
                <div 
                  className={`flex-1 relative transition-colors ${draggedOverTrackId === track.id ? 'bg-[#333]' : 'bg-[#1e1e1e]'}`}
                  onDragOver={(e) => handleDragOver(e, track.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, track.id)}
                >
                   {track.clips.map(clip => (
                     <div
                        key={clip.id}
                        className="absolute h-full rounded border border-black p-1 text-[10px] truncate group select-none"
                        style={{
                           left: `${clip.trackStart * PIXELS_PER_SECOND}px`,    
                           width: `${(clip.trimOut - clip.trimIn) * PIXELS_PER_SECOND}px`,
                           backgroundColor: track.type === 'video' ? '#3b82f6' : '#10b981' // blue for video, green for audio
                        }}
                     >
                       <div className="absolute inset-y-0 left-0 w-2 cursor-ew-resize hover:bg-white/30" 
                            onPointerDown={e => handlePointerDown(e, track.id, clip.id, 'in')}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                       />
                       <div className="pl-2 pr-2 whitespace-nowrap overflow-hidden z-10 pointer-events-none">
                         Clip ({Math.round(clip.trimOut - clip.trimIn)}s)
                       </div>
                       <div className="absolute inset-y-0 right-0 w-2 cursor-ew-resize hover:bg-white/30"
                            onPointerDown={e => handlePointerDown(e, track.id, clip.id, 'out')}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                       />
                     </div>
                   ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--color-nle-text-muted)] text-xs border-2 border-dashed border-[#333] rounded">
            No Active Sequence
          </div>
        )}
      </div>
    </div>
  );
}