import React, { useEffect, useRef, useState } from 'react';

export default function ProgramMonitor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [renderStatus, setRenderStatus] = useState<'pending' | 'ready' | 'error'>('pending');

  useEffect(() => {
    if (!canvasRef.current) return;

    // Transfer control of the canvas to a Web Worker
    const offscreen = canvasRef.current.transferControlToOffscreen();
    
    workerRef.current = new Worker(new URL('../renderWorker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current.onmessage = (e) => {
      const { type } = e.data;
      if (type === 'INIT_SUCCESS') {
        setRenderStatus('ready');
      } else if (type === 'INIT_ERROR') {
        setRenderStatus('error');
      }
    };

    workerRef.current.postMessage({ type: 'INIT_CANVAS', canvas: offscreen }, [offscreen]);

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleTestClear = () => {
    workerRef.current?.postMessage({ type: 'TEST_CLEAR' });
  };

  return (
    <div className="flex-1 bg-[var(--color-nle-panel)] flex flex-col relative group">
      <div className="px-3 py-1 border-b border-[var(--color-nle-border)] text-xs font-semibold bg-[#1a1a1a] flex justify-between">
        <span>Program Monitor</span>
        <span className={renderStatus === 'ready' ? 'text-green-500' : 'text-yellow-500'}>
          WebGL: {renderStatus}
        </span>
      </div>
      
      {/* Container to maintain aspect ratio and proper centering */}
      <div className="flex-1 flex items-center justify-center bg-black overflow-hidden relative">
        <canvas 
          ref={canvasRef} 
          width={1920} 
          height={1080} 
          className="w-full h-full object-contain max-w-full max-h-full"
        />

        {/* Temporary overlay button for Sub-phase 3.2 Quality Gate */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
             onClick={handleTestClear}
             disabled={renderStatus !== 'ready'}
             className="px-3 py-1 text-xs bg-[var(--color-nle-accent)] hover:bg-[var(--color-nle-accent-hover)] rounded text-white z-10"
           >
             Trigger Test Render
           </button>
        </div>
      </div>
    </div>
  );
}
