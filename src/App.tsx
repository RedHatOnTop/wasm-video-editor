import React from 'react';

function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--color-nle-bg)] text-[var(--color-nle-text)] text-sm font-sans overflow-hidden">
      {/* Top Half */}
      <div className="flex-[6_6_0%] flex border-b border-[var(--color-nle-border)] min-h-0">
        {/* Top Left: Source Monitor & Effect Controls */}
        <div className="flex-1 border-r border-[var(--color-nle-border)] bg-[var(--color-nle-panel)] flex flex-col">
          <div className="px-3 py-1 border-b border-[var(--color-nle-border)] text-xs font-semibold bg-[#1a1a1a]">Source Monitor / Effect Controls</div>
          <div className="flex-1 p-2 flex items-center justify-center text-[var(--color-nle-text-muted)]">
            Source Preview
          </div>
        </div>

        {/* Top Right: Program Monitor */}
        <div className="flex-1 bg-[var(--color-nle-panel)] flex flex-col">
          <div className="px-3 py-1 border-b border-[var(--color-nle-border)] text-xs font-semibold bg-[#1a1a1a]">Program Monitor</div>
          <div className="flex-1 p-2 flex items-center justify-center text-[var(--color-nle-text-muted)]">
            Program Playback
          </div>
        </div>
      </div>

      {/* Bottom Half */}
      <div className="flex-[4_4_0%] flex min-h-0">
        {/* Bottom Left: Project Panel */}
        <div className="w-1/4 min-w-[250px] border-r border-[var(--color-nle-border)] bg-[var(--color-nle-panel)] flex flex-col">
          <div className="px-3 py-1 border-b border-[var(--color-nle-border)] text-xs font-semibold bg-[#1a1a1a]">Project</div>
          <div className="flex-1 p-3 text-[var(--color-nle-text-muted)]">
            Media Bin
          </div>
        </div>

        {/* Bottom Right: Timeline Panel */}
        <div className="flex-1 bg-[var(--color-nle-panel)] flex flex-col">
          <div className="px-3 py-1 border-b border-[var(--color-nle-border)] text-xs font-semibold bg-[#1a1a1a]">Timeline</div>
          <div className="flex-1 p-2 flex items-center justify-center text-[var(--color-nle-text-muted)]">
            Tracks & Clips
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
