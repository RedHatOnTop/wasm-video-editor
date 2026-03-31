import React, { useCallback, useState } from 'react';
import { useStore } from '../store/useStore';

export default function ProjectPanel() {
  const { mediaPool, addMedia } = useStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);

      files.forEach((file) => {
        if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
          const id = crypto.randomUUID();
          addMedia({
            id,
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'pending',
            file,
          });
        } else {
          console.warn('Skipping non-media file:', file.name);
        }
      });
    },
    [addMedia]
  );

  return (
    <div className="w-1/4 min-w-[250px] border-r border-[var(--color-nle-border)] bg-[var(--color-nle-panel)] flex flex-col">
      <div className="px-3 py-1 border-b border-[var(--color-nle-border)] text-xs font-semibold bg-[#1a1a1a]">
        Project Bin
      </div>
      <div
        className={"flex-1 p-3 overflow-y-auto transition-colors duration-200 "}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {mediaPool.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-xs text-[var(--color-nle-text-muted)] border-2 border-dashed border-[var(--color-nle-border)] rounded-md pointer-events-none">
            Drag & Drop Media Here
          </div>
        ) : (
          <ul className="space-y-1">
            {mediaPool.map((item) => (
              <li
                key={item.id}
                className="text-xs p-2 bg-[#2d2d30] border border-[var(--color-nle-border)] rounded flex justify-between items-center cursor-pointer hover:bg-[#3d3d40]"
              >
                <span className="truncate flex-1 font-medium" title={item.name}>
                  {item.name}
                </span>
                <span className="text-[10px] text-gray-400 ml-2 whitespace-nowrap">
                  {(item.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

