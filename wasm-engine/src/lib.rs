use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn init_engine() {
    web_sys::console::log_1(&"WASM Video Engine Initialized".into());
}

#[wasm_bindgen]
pub fn calculate_complex_math(a: f64, b: f64) -> f64 {
    // A dummy complex calculation to test the bridge
    (a.powf(2.0) + b.powf(2.0)).sqrt()
}

