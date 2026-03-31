import type { MediaMetadata } from '../store/useStore';

export const extractMetadata = (file: File): Promise<MediaMetadata> => {
  return new Promise((resolve, reject) => {
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    if (!isVideo && !isAudio) {
      return reject(new Error('Unsupported media type'));
    }

    const url = URL.createObjectURL(file);
    const mediaElement = isVideo ? document.createElement('video') : document.createElement('audio');

    mediaElement.onloadedmetadata = () => {
      resolve({
        duration: mediaElement.duration,
        width: isVideo ? (mediaElement as HTMLVideoElement).videoWidth : 0,
        height: isVideo ? (mediaElement as HTMLVideoElement).videoHeight : 0,
      });
      URL.revokeObjectURL(url);
    };

    mediaElement.onerror = () => {
      reject(new Error('Failed to load media metadata'));
      URL.revokeObjectURL(url);
    };

    mediaElement.src = url;
  });
};
