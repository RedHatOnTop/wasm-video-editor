let gl: WebGL2RenderingContext | null = null;
let extColorBufferFloat: any = null;
let canvas: OffscreenCanvas | null = null;
let program: WebGLProgram | null = null;
let texture: WebGLTexture | null = null;
let decoderPort: MessagePort | null = null;

// Vertex Shader: A simple full-screen quad
const vsSource = `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;
out vec2 v_texCoord;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    // Y-invert for WebGL texture coordinate mapping standard
    v_texCoord = vec2(a_texCoord.x, 1.0 - a_texCoord.y);
}`;

// Fragment Shader: Sample the 10-bit/12-bit/8-bit VideoFrame texture
const fsSource = `#version 300 es
precision highp float;
uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 outColor;
void main() {
    vec4 color = texture(u_image, v_texCoord);
    outColor = color;
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initWebGL(gl: WebGL2RenderingContext) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  program = gl.createProgram();
  if (!program || !vs || !fs) return;
  
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program linking error:', gl.getProgramInfoLog(program));
    return;
  }
  
  // Create Quad
  const positions = new Float32Array([
    -1.0, -1.0,  0.0, 0.0,
     1.0, -1.0,  1.0, 0.0,
    -1.0,  1.0,  0.0, 1.0,
    -1.0,  1.0,  0.0, 1.0,
     1.0, -1.0,  1.0, 0.0,
     1.0,  1.0,  1.0, 1.0,
  ]);
  
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  
  // Position attribute
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
  
  // TexCoord attribute
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
  
  // Create Texture
  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Linear filtering for video
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

function drawFrame(frame: VideoFrame) {
  if (!gl || !program || !texture) {
    frame.close();
    return;
  }
  
  gl.useProgram(program);
  
  // Upload VideoFrame directly to WebGL Texture (Zero-copy in some browsers!)
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
  
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  
  frame.close();
}

self.onmessage = (event: MessageEvent) => {
  const { type, port } = event.data;

  if (type === 'INIT_CANVAS') {
    canvas = event.data.canvas;

    try {
      if (!canvas) throw new Error('No canvas provided to worker');

      gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        powerPreference: 'high-performance'
      }) as WebGL2RenderingContext;

      if (!gl) {
        throw new Error('WebGL 2.0 not supported');
      }

      extColorBufferFloat = gl.getExtension('EXT_color_buffer_float');
      
      initWebGL(gl);

      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      self.postMessage({ type: 'INIT_SUCCESS' });
      console.log('[Render Worker] WebGL 2.0 initialized');

    } catch (error) {
      console.error('Render Worker init failed', error);
      self.postMessage({ type: 'INIT_ERROR', error: String(error) });
    }
  } else if (type === 'INIT_DECODER_PORT' && port) {
    decoderPort = port;
    console.log('[Render Worker] Received Decoder Port');
    
    decoderPort.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'VIDEO_FRAME') {
        const frame = e.data.frame as VideoFrame;
        // In a true playback loop, this would sync with requestAnimationFrame.
        // For Sub-phase 3.3 Quality gate (continuous rendering), we use rAF to batch drawing:
        requestAnimationFrame(() => drawFrame(frame));
      }
    };
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
