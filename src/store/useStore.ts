import { create } from 'zustand';

// Initialize OPFS Worker
const opfsWorker = typeof window !== 'undefined' 
  ? new Worker(new URL('../opfsWorker.ts', import.meta.url), { type: 'module' }) 
  : null;

// Listen for OPFS Worker responses
if (opfsWorker) {
  opfsWorker.onmessage = (event) => {
    const { type, id, fileName, error } = event.data;
    if (type === 'WRITE_SUCCESS') {
      useStore.getState().updateMediaStatus(id, 'ready', fileName);
    } else if (type === 'WRITE_ERROR') {
      console.error('OPFS error for', id, error);
      useStore.getState().updateMediaStatus(id, 'error');
    }
  };
}

export interface MediaItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'ready' | 'error';
  file?: File; // Store the original file temporarily before OPFS transfer
  opfsFileName?: string;
}

interface ProjectState {
  mediaPool: MediaItem[];
  addMedia: (item: MediaItem) => void;
  removeMedia: (id: string) => void;
  updateMediaStatus: (id: string, status: MediaItem['status'], opfsFileName?: string) => void;
}

export const useStore = create<ProjectState>((set) => ({
  mediaPool: [],
  addMedia: (item) =>
    set((state) => {
      // Prevent duplicates by name and size for now
      const isDuplicate = state.mediaPool.some(
        (m) => m.name === item.name && m.size === item.size
      );
      if (isDuplicate) return state;

      // Send to OPFS Worker if file is attached
      if (item.file && opfsWorker) {
        opfsWorker.postMessage({
          type: 'WRITE_FILE',
          id: item.id,
          file: item.file
        });
        item.status = 'uploading';
      }

      return { mediaPool: [...state.mediaPool, item] };
    }),
  removeMedia: (id) =>
    set((state) => ({
      mediaPool: state.mediaPool.filter((m) => m.id !== id),
    })),
  updateMediaStatus: (id, status, opfsFileName) =>
    set((state) => ({
      mediaPool: state.mediaPool.map((m) =>
        m.id === id ? { ...m, status, opfsFileName } : m
      ),
    })),
}));
