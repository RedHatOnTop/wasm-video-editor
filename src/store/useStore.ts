import { create } from 'zustand';

// Initialize OPFS Worker
const opfsWorker = typeof window !== 'undefined'
  ? new Worker(new URL('../opfsWorker.ts', import.meta.url), { type: 'module' })
  : null;

// Initialize Decoder Worker (for Phase 3 demuxing & proxy)
export const decoderWorker = typeof window !== 'undefined'
  ? new Worker(new URL('../decoderWorker.ts', import.meta.url), { type: 'module' })
  : null;

// Create a direct communication channel between Decoder Worker and Render Worker
export const renderMessageChannel = typeof window !== 'undefined' ? new MessageChannel() : null;

if (decoderWorker && renderMessageChannel) {
  decoderWorker.postMessage({ type: 'INIT_RENDER_PORT', port: renderMessageChannel.port1 }, [renderMessageChannel.port1]);
}

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

export interface MediaMetadata {
  duration: number;
  width: number;
  height: number;
}

export interface MediaItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'ready' | 'error';
  file?: File; // Store the original file temporarily before OPFS transfer
  opfsFileName?: string;
  metadata?: MediaMetadata;
  proxyStatus?: 'none' | 'generating' | 'ready';
}

interface ProjectState {
  mediaPool: MediaItem[];
  addMedia: (item: MediaItem) => void;
  removeMedia: (id: string) => void;
  updateMediaStatus: (id: string, status: MediaItem['status'], opfsFileName?: string) => void;
  updateMediaMetadata: (id: string, metadata: MediaMetadata) => void;
  generateProxy: (id: string) => void;
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
  updateMediaMetadata: (id, metadata) =>
    set((state) => ({
      mediaPool: state.mediaPool.map((m) =>
        m.id === id ? { ...m, metadata, proxyStatus: 'none' } : m
      ),
    })),
  generateProxy: (id) =>
    set((state) => {
      const media = state.mediaPool.find((m) => m.id === id);
      if (!media || !media.opfsFileName) {
        console.error('Cannot generate proxy: Media missing OPFS file name.');
        return state;
      }

      console.log(`[Proxy generation started] Routing media ${id} to WebCodecs Decoder...`);
      
      if (decoderWorker) {
        decoderWorker.postMessage({
          type: 'START_DECODE',
          id: id,
          fileName: media.opfsFileName
        });
      }

      return {
        mediaPool: state.mediaPool.map((m) =>
          m.id === id ? { ...m, proxyStatus: 'generating' } : m
        ),
      };
    }),
}));
