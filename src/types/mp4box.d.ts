declare module 'mp4box' {
  export interface MP4ArrayBuffer extends ArrayBuffer {
    fileStart: number;
  }

  export interface MP4VideoTrack {
    id: number;
    codec: string;
    bitrate: number;
    size?: number;
    width?: number;
    height?: number;
    duration?: number;
    timescale?: number;
    nb_samples?: number;
  }

  export interface MP4Info {
    duration: number;
    timescale: number;
    isFragmented: boolean;
    isProgressive: boolean;
    hasIOD: boolean;
    brands: string[];
    created: Date;
    modified: Date;
    tracks: MP4VideoTrack[];
    videoTracks: MP4VideoTrack[];
    audioTracks: MP4VideoTrack[];
  }

  export interface MP4Sample {
    offset: number;
    size: number;
    number: number;
    cts: number;
    dts: number;
    duration: number;
    timescale: number;
    is_sync: boolean;
    description: any;
    data: Uint8Array;
  }

  export interface MP4File {
    onReady: (info: MP4Info) => void;
    onError: (e: string) => void;
    onSamples: (id: number, user: any, samples: MP4Sample[]) => void;
    appendBuffer: (data: MP4ArrayBuffer) => number;
    setExtractionOptions: (id: number, user: any, options?: any) => void;
    start: () => void;
    stop: () => void;
    flush: () => void;
  }

  export function createFile(): MP4File;

  const defaultExport: {
    createFile: typeof createFile;
  };
  export default defaultExport;
}
