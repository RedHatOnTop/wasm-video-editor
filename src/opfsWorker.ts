export interface OPFSMessagePayload {
  type: 'WRITE_FILE';
  file: File;
  id: string; // Unique ID to track the progress
}

self.onmessage = async (event: MessageEvent<OPFSMessagePayload>) => {
  const { type, file, id } = event.data;

  if (type === 'WRITE_FILE') {
    try {
      // 1. Get origin private file system
      const opfsRoot = await navigator.storage.getDirectory();
      
      // 2. Create directory structure (optional but good for organization)
      const mediaDir = await opfsRoot.getDirectoryHandle('media', { create: true });
      
      // 3. Create file handle
      const fileName = `${id}_${file.name}`;
      const fileHandle = await mediaDir.getFileHandle(fileName, { create: true });
      
      // 5. Read the file as a stream so we don't block memory for huge videos
      const accessHandle = await (fileHandle as unknown as { createSyncAccessHandle: () => Promise<{ write: (data: ArrayBufferView, options: { at: number }) => number, flush: () => void, close: () => void }> }).createSyncAccessHandle();
      const reader = file.stream().getReader();
      
      let offset = 0;
      let bytesWritten = 0;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // value is Uint8Array
          bytesWritten += accessHandle.write(value, { at: offset });
          offset += value.length;
        }
        
        // 7. Flush and close handle
        accessHandle.flush();
      } finally {
        accessHandle.close();
      }

      self.postMessage({
        type: 'WRITE_SUCCESS',
        id,
        fileName,
        bytesWritten
      });
    } catch (error) {
      console.error('OPFS Worker Error:', error);
      self.postMessage({
        type: 'WRITE_ERROR',
        id,
        error: (error as Error).message
      });
    }
  }
};
