let gl: WebGL2RenderingContext | null = null;
let extColorBufferFloat: any = null;
let canvas: OffscreenCanvas | null = null;

self.onmessage = (event: MessageEvent) => {
  const { type } = event.data;

  if (type === 'INIT_CANVAS') {
    canvas = event.data.canvas;
    
    try {
      if (!canvas) throw new Error('No canvas provided to worker');
      
      // Request WebGL2 explicitly for 32-bit float support
      gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        powerPreference: 'high-performance'
      }) as WebGL2RenderingContext;

      if (!gl) {
        throw new Error('WebGL 2.0 not supported');
      }

      // Check for float extensions needed for high-quality NLE rendering
      extColorBufferFloat = gl.getExtension('EXT_color_buffer_float');
      if (!extColorBufferFloat) {
        console.warn('EXT_color_buffer_float not supported, fallback to 8-bit or half-float');
        // For fallback, we might check OES_texture_half_float here
      }

      // Clear the canvas to pure black initially
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      self.postMessage({ type: 'INIT_SUCCESS' });
      console.log('WebGL 2.0 initialized in Render Worker');
      
    } catch (error) {
      console.error('Render Worker init failed', error);
      self.postMessage({ type: 'INIT_ERROR', error: String(error) });
    }
  } else if (type === 'TEST_CLEAR') {
    if (gl) {
      // Execute Quality Gate Step: Paint a specific test color (Premiere Pro Magenta/Purple) 
      const color = [0.6, 0.2, 0.8]; // RGB
      console.log(`[Render Worker] Test Clear Triggered: WebGL clearing to rg(${color[0]}, ${color[1]}, ${color[2]})`);
      
      gl.clearColor(color[0], color[1], color[2], 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }
};
