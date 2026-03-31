import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';

export default function TimelinePanel() {
  const { project, activeSequenceId, debugLogTimelineState, addClipToTrack } = useStore();

  const activeSequence = project.sequences.find(s => s.id === activeSequenceId);
  const [draggedOverTrackId, setDraggedOverTrackId] = useState<string | null>(null);

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
    // Call debug immediately after (it might log the previous state if not careful, 
    // but the get() inside the store function will be accurate)
    setTimeout(() => {
      debugLogTimelineState();
    }, 100);
  };

  return (
    <div className="flex-1 bg-[var(--color-nle-panel)] flex flex-col overflow-hidden relative">
      <div className="px-3 py-1 border-b border-[var(--color-nle-border)] text-xs font-semibold bg-[#1a1a1a] flex justify-between items-center z-10">
        <span>Timeline {activeSequence ? `- ${activeSequence.name}` : ''}</span>
        <button
          onClick={handleTestAddClip}
          className="px-2 py-0.5 bg-[var(--color-nle-accent)] hover:bg-[var(--color-nle-accent-hover)] text-white rounded text-[10px]"
        >
          [QG 4.1] Test & Log
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
                        className="absolute h-full rounded border border-black p-1 text-[10px] truncate"
                        style={{
                           // Sub-phase 4.2 placeholder math: 1 second = 20px   
                           left: `${clip.trackStart * PIXELS_PER_SECOND}px`,
                           width: `${(clip.trimOut - clip.trimIn) * PIXELS_PER_SECOND}px`,     
                           backgroundColor: track.type === 'video' ? '#3b82f6' : '#10b981' // blue for video, green for audio 
                        }}
                     >
                       Clip ({clip.trimOut - clip.trimIn}s)
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