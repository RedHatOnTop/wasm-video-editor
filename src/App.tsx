import { useEffect, useState, useRef } from 'react';
import ProjectPanel from './components/ProjectPanel';
import ProgramMonitor from './components/ProgramMonitor';
import TimelinePanel from './components/TimelinePanel';

function App() {
  const [wasmStatus, setWasmStatus] = useState<'pending' | 'ready' | 'error'>('pending');
  const [calcResult, setCalcResult] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('./wasmWorker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'INIT_SUCCESS') {
        setWasmStatus('ready');
      } else if (type === 'INIT_ERROR') {
        setWasmStatus('error');
      } else if (type === 'CALCULATE_RESULT') {
        setCalcResult(payload.result);
      }
    };

    // Trigger WASM init
    workerRef.current.postMessage({ type: 'INIT' });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleCalculate = () => {
    workerRef.current?.postMessage({
      type: 'CALCULATE',
      payload: { a: 3.0, b: 4.0 }, // Expected sqrt(9 + 16) = 5
    });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--color-nle-bg)] text-[var(--color-nle-text)] text-sm font-sans overflow-hidden">
      {/* Top Half */}
      <div className="flex-[6_6_0%] flex border-b border-[var(--color-nle-border)] min-h-0">
        {/* Top Left: Source Monitor & Effect Controls */}
        <div className="flex-1 border-r border-[var(--color-nle-border)] bg-[var(--color-nle-panel)] flex flex-col">
          <div className="px-3 py-1 border-b border-[var(--color-nle-border)] text-xs font-semibold bg-[#1a1a1a]">Source Monitor / Effect Controls</div>
          <div className="flex-1 p-4 flex flex-col items-center justify-center gap-4">
            <div className="text-[var(--color-nle-text-muted)]">
              WASM Status: <span className={wasmStatus === 'ready' ? 'text-green-500' : 'text-yellow-500'}>{wasmStatus}</span>
            </div>
            <button 
              onClick={handleCalculate}
              disabled={wasmStatus !== 'ready'}
              className="px-4 py-2 bg-[var(--color-nle-accent)] hover:bg-[var(--color-nle-accent-hover)] text-white rounded disabled:opacity-50">
              Run Complex Math (3, 4) in Worker
            </button>
            {calcResult !== null && (
              <div className="text-lg font-bold text-white">Result: {calcResult}</div>
            )}
          </div>
        </div>

        {/* Top Right: Program Monitor */}
        <ProgramMonitor />
      </div>

      {/* Bottom Half */}
      <div className="flex-[4_4_0%] flex min-h-0">
        {/* Bottom Left: Project Panel */}
        <ProjectPanel />

        {/* Bottom Right: Timeline Panel */}
        <TimelinePanel />
      </div>
    </div>
  );
}

export default App;
