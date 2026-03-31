import { create } from 'zustand';

export interface MediaItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'ready' | 'error';
  file?: File; // Store the original file temporarily before OPFS transfer
}

interface ProjectState {
  mediaPool: MediaItem[];
  addMedia: (item: MediaItem) => void;
  removeMedia: (id: string) => void;
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
      return { mediaPool: [...state.mediaPool, item] };
    }),
  removeMedia: (id) =>
    set((state) => ({
      mediaPool: state.mediaPool.filter((m) => m.id !== id),
    })),
}));
