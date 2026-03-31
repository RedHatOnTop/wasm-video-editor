import MP4Box, { MP4ArrayBuffer, MP4File, MP4Info, MP4Sample } from 'mp4box';

export interface DecoderMessagePayload {
  type: 'START_DECODE';
  fileName: string;
  id: string; // The MediaItem ID
}

self.onmessage = async (event: MessageEvent<DecoderMessagePayload>) => {
  const { type, fileName, id } = event.data;

  if (type === 'START_DECODE') {
    try {
      console.log(`[Decoder Worker] Starting decode for ${fileName} (ID: ${id})`);
      
      const opfsRoot = await navigator.storage.getDirectory();
      const mediaDir = await opfsRoot.getDirectoryHandle('media');
      const fileHandle = await mediaDir.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      
      demuxAndDecode(file, id);

    } catch (error) {
      console.error('[Decoder Worker] Error reading OPFS file:', error);
      self.postMessage({ type: 'DECODE_ERROR', id, error: String(error) });
    }
  }
};

function demuxAndDecode(file: File, id: string) {
  const mp4boxfile: MP4File = MP4Box.createFile();
  let videoDecoder: VideoDecoder | null = null;
  let trackId: number | null = null;
  let decodedFramesCount = 0;

  mp4boxfile.onError = (e) => {
    console.error(`[mp4box error]`, e);
    self.postMessage({ type: 'DECODE_ERROR', id, error: e });
  };

  mp4boxfile.onReady = (info: MP4Info) => {
    console.log(`[mp4box ready] File info:`, info);
    
    // Find the first video track
    const videoTrack = info.videoTracks[0];
    if (!videoTrack) {
      const err = 'No video track found in file.';
      console.error(err);
      self.postMessage({ type: 'DECODE_ERROR', id, error: err });
      return;
    }
    
    trackId = videoTrack.id;

    // Initialize the VideoDecoder
    videoDecoder = new VideoDecoder({
      output: (frame: VideoFrame) => {
        decodedFramesCount++;
        // In a real proxy generation scenario, we'll pipe this to a VideoEncoder.
        // For sub-phase 3.1 Quality Gate, we'll log every 30th frame to prove it's continuous.
        if (decodedFramesCount % 30 === 0) {
          console.log(`[Decoder Worker] Decoded ${decodedFramesCount} frames. Current timestamp: ${frame.timestamp}`);
        }
        
        // Always properly close the frame when not passed to another renderer
        frame.close();
      },
      error: (e) => {
        console.error(`[VideoDecoder error]`, e);
        self.postMessage({ type: 'DECODE_ERROR', id, error: e.message });
      }
    });

    // In mp4box.js, the description box holds the avcC/hvcC info for the decoder
    const description = videoTrack.codec; // e.g., 'avc1.42E01E'
    let avcDecoderConfigRecord: Uint8Array | undefined = undefined;
    
    // Attempt to extract the avcC box (codec configuration) from the track
    // mp4box.js exposes the raw extradata inside the 'avcC' or 'hvcC' box
    const trak = mp4boxfile.getTrackById(trackId);
    if (trak && trak.mdia && trak.mdia.minf && trak.mdia.minf.stbl && trak.mdia.minf.stbl.stsd) {
        const parseBoxRow = trak.mdia.minf.stbl.stsd.entries[0];
        if (parseBoxRow.avcC) {
             // Create an ArrayBuffer representation of the avcC box payload if present.
             // But actually, we only absolutely need the codec string for WebCodecs!
             // Wait, WebCodecs sometimes needs description data. Let's start with just codec string.
             // If needed we will manually format the AVCDecoderConfigurationRecord.
        }
    }

    // Try basic configuration first
    // Note: WebCodecs VideoDecoder.configure often needs `description` (extradata) for AVC (H.264)
    // We will extract it safely
    const extractDescription = () => {
       const box = mp4boxfile.moov.traks.find((t:any) => t.tkhd.track_id === trackId);
       const avcC = box?.mdia?.minf?.stbl?.stsd?.entries[0]?.avcC;
       if (avcC) {
           const stream = new MP4Box.DataStream();
           stream.endianness = MP4Box.DataStream.BIG_ENDIAN;
           avcC.write(stream);
           return new Uint8Array(stream.buffer, 8); // Skip box length and box type (avcC)
       }
       return undefined;
    };

    let configureDescription = extractDescription();

    const config: VideoDecoderConfig = {
      codec: videoTrack.codec, // e.g., "avc1.640028"
      codedWidth: videoTrack.width,
      codedHeight: videoTrack.height,
      description: configureDescription, // Optional but often required for avc1
    };

    try {
      videoDecoder.configure(config);
      console.log(`[VideoDecoder] Configured successfully with`, config);
      
      // Tell mp4box to send us samples
      mp4boxfile.setExtractionOptions(trackId, null, { nbSamples: 1000 });
      mp4boxfile.start();

    } catch (err) {
      console.error('[VideoDecoder] Configure error:', err);
      self.postMessage({ type: 'DECODE_ERROR', id, error: String(err) });
    }
  };

  mp4boxfile.onSamples = (id: number, user: any, samples: MP4Sample[]) => {
    if (!videoDecoder || trackId !== id) return;

    for (const sample of samples) {
      const type = sample.is_sync ? 'key' : 'delta';
      const chunk = new EncodedVideoChunk({
        type,
        timestamp: (sample.cts * 1000000) / sample.timescale,
        duration: (sample.duration * 1000000) / sample.timescale,
        data: sample.data
      });
      
      videoDecoder.decode(chunk);
    }
  };

  // We need to continuously stream file into mp4box
  // For simplicity, we read using FileReader or Streams in chunks
  readFileStream(file, mp4boxfile);
}

async function readFileStream(file: File, mp4boxfile: MP4File) {
  const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB chunks
  let offset = 0;

  const reader = file.stream().getReader();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const buffer = value.buffer as MP4ArrayBuffer;
      buffer.fileStart = offset;
      
      mp4boxfile.appendBuffer(buffer);
      offset += value.length;
    }
    mp4boxfile.flush();
  } catch (err) {
     console.error('[Decoder Worker] Error streaming file:', err);
  }
}