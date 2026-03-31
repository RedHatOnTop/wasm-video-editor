import init, { calculate_complex_math, init_engine } from './wasm/wasm-engine';

// Initialize the pure WebAssembly instance
let isWasmLoaded = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    try {
      await init();
      init_engine();
      isWasmLoaded = true;
      self.postMessage({ type: 'INIT_SUCCESS' });
    } catch (err) {
      console.error('WASM Init error', err);
      self.postMessage({ type: 'INIT_ERROR', error: err });
    }
  }

  if (type === 'CALCULATE' && isWasmLoaded) {
    const { a, b } = payload;
    const result = calculate_complex_math(a, b);
    self.postMessage({ type: 'CALCULATE_RESULT', payload: { result } });
  }
};
