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

// ---------------------------------------------------------
// Phase 4: Timeline Data Architecture
// ---------------------------------------------------------
export interface Clip {
  id: string;
  mediaId: string;   // Reference to MediaItem.id
  trimIn: number;    // Start time in seconds within the source file
  trimOut: number;   // End time in seconds within the source file
  trackStart: number; // Start time in seconds on the timeline track
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio';
  clips: Clip[];
}

export interface Sequence {
  id: string;
  name: string;
  tracks: Track[];
  duration: number; // For rendering the timeline grid limits
}

export interface VideoProject {
  id: string;
  name: string;
  sequences: Sequence[];
}

export interface ProjectState {
  mediaPool: MediaItem[];
  project: VideoProject;
  activeSequenceId: string | null;
  addMedia: (item: MediaItem) => void;
  removeMedia: (id: string) => void;
  updateMediaStatus: (id: string, status: MediaItem['status'], opfsFileName?: string) => void;
  updateMediaMetadata: (id: string, metadata: MediaMetadata) => void;
  generateProxy: (id: string) => void;
  addClipToTrack: (sequenceId: string, trackId: string, clip: Clip) => void;    
  updateTrackClips: (sequenceId: string, trackId: string, clips: Clip[]) => void;
  debugLogTimelineState: () => void;
}

const defaultSequence: Sequence = {
  id: 'seq-1',
  name: 'Sequence 01',
  duration: 60,
  tracks: [
    { id: 'v2', name: 'V2', type: 'video', clips: [] },
    { id: 'v1', name: 'V1', type: 'video', clips: [] },
    { id: 'a1', name: 'A1', type: 'audio', clips: [] },
    { id: 'a2', name: 'A2', type: 'audio', clips: [] },
  ]
};

const defaultProject: VideoProject = {
  id: 'proj-1',
  name: 'Untitled Project',
  sequences: [defaultSequence]
};
export const useStore = create<ProjectState>((set, get) => ({
  mediaPool: [],
  project: defaultProject,
  activeSequenceId: 'seq-1',

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

  addClipToTrack: (sequenceId, trackId, clip) =>
    set((state) => {
      const parentSeqIndex = state.project.sequences.findIndex(s => s.id === sequenceId);
      if (parentSeqIndex === -1) return state;

      const trackIndex = state.project.sequences[parentSeqIndex].tracks.findIndex(t => t.id === trackId);
      if (trackIndex === -1) return state;

      // Deep clone / immutable update
      const newSequences = [...state.project.sequences];
      const newTracks = [...newSequences[parentSeqIndex].tracks];
      const newClips = [...newTracks[trackIndex].clips, clip];
      
      newTracks[trackIndex] = { ...newTracks[trackIndex], clips: newClips };
      newSequences[parentSeqIndex] = { ...newSequences[parentSeqIndex], tracks: newTracks };

      return {
        project: { ...state.project, sequences: newSequences }
      };
    }),

  updateTrackClips: (sequenceId, trackId, clips) =>
    set((state) => {
      const parentSeqIndex = state.project.sequences.findIndex(s => s.id === sequenceId);
      if (parentSeqIndex === -1) return state;

      const trackIndex = state.project.sequences[parentSeqIndex].tracks.findIndex(t => t.id === trackId);
      if (trackIndex === -1) return state;

      const newSequences = [...state.project.sequences];
      const newTracks = [...newSequences[parentSeqIndex].tracks];

      newTracks[trackIndex] = { ...newTracks[trackIndex], clips };
      newSequences[parentSeqIndex] = { ...newSequences[parentSeqIndex], tracks: newTracks };

      return {
        project: { ...state.project, sequences: newSequences }
      };
    }),
  debugLogTimelineState: () => {
    console.log('[Quality Gate 4.1] Zustand Timeline State:', get().project);   
  }
}));

