# WASM Web Video Editor Roadmap

Based on the `docs/PLAN.md` specification and the constraints from `AGENTS.md` (no time-based units), this project roadmap is structured exclusively by logical Sub-phases. Each Sub-phase requires a strict Quality Gate validation before progression.

## Phase 1: Core Infrastructure Scaffolding & WASM Setup
**Goal**: Establish the fundamental project repository, frontend architecture, and WASM-to-Worker communication bridge.

* **Sub-phase 1.1: Frontend Framework Initialization**
  * **Tasks**: Scaffold React + Vite + TypeScript application. Integrate Tailwind CSS and configure a dark-themed, professional NLE color palette (mimicking Premiere Pro). Set up Zustand store and strict linting rules.
  * **Quality Gate**: React dev server boots successfully without errors, displaying an empty, perfectly partitioned dark-themed NLE IDE layout grid using Tailwind.
* **Sub-phase 1.2: WASM Project Setup**
  * **Tasks**: Initialize Rust library. Configure `Cargo.toml` with `wasm-bindgen`. Setup build scripts to compile WASM into the Vite public/assets pipeline.
  * **Quality Gate**: Rust code successfully compiles to `.wasm` and `.js` bindings via CLI build command.
* **Sub-phase 1.3: Web Worker Bridge Implementation**
  * **Tasks**: Create a dedicated Web Worker script. Instantiate the WASM module within the Worker. Establish asynchronous message passing between React UI and the Worker.
  * **Quality Gate**: React UI sends a complex mathematical calculation request to the Worker, which executes it via Rust/WASM, returning the correct result to the UI state without blocking the main JS thread.

## Phase 2: Media Ingestion, OPFS & Proxy Workflow
**Goal**: Safely import large video files into browser storage, extract basic metadata, and prepare proxy structure.

* **Sub-phase 2.1: Drag & Drop UI & Core React State (Completed)**
  * **Tasks**: Implement file drop zone in the Project Bin component. Map dropped `File` objects to the Zustand MediaPool state.
  * **Quality Gate**: Dropping a file updates the Zustand state and reflects the filename visually in the Project Bin UI.
* **Sub-phase 2.2: OPFS Storage Pipeline (Completed)**
  * **Tasks**: Create OPFS directory structure. Implement `FileSystemSyncAccessHandle` inside a Web Worker to stream file buffers into persistent browser storage.
  * **Quality Gate**: Dropping a video file >100MB successfully streams it to OPFS within seconds without freezing the UI.
* **Sub-phase 2.3: Metadata Extraction & Proxy Generation Routing (Completed)**
  * **Tasks**: Parse basic video metadata (duration, width, height) utilizing lightweight techniques. Establish the skeleton function that will route this media into the WebCodecs decoder for proxy generation.
  * **Quality Gate**: UI correctly displays the resolution and duration of the imported OPFS file, and the proxy toggle button triggers a status change event without failing.

## Phase 3: Decoupled Playback Engine & 32-bit Render Pipeline
**Goal**: Create the foundation for the Program Monitor playback and core rendering logic using 32-bit floating-point WebGL.

* **Sub-phase 3.1: WebCodecs Demuxing & Decoding (Completed)**
  * **Tasks**: Read streams from OPFS. Implement an MP4/WebM demuxer (e.g., MP4Box.js or Rust-based). Pass encoded chunks to `WebCodecs VideoDecoder`.
  * **Quality Gate**: VideoDecoder successfully emits raw `VideoFrame` objects continuously from the OPFS media file.
* **Sub-phase 3.2: 32-bit WebGL & OffscreenCanvas Setup (Completed)**
  * **Tasks**: Transfer an `OffscreenCanvas` from the Program Monitor React component to the Render Worker. Initialize a WebGL 2.0 context explicitly requiring half-float or float texture extensions.
  * **Quality Gate**: WebGL shader successfully clears the OffscreenCanvas to a specific test color triggered by a UI button.
* **Sub-phase 3.3: Frame Rendering & Playback Loop (Completed)**
  * **Tasks**: Bind decoded `VideoFrame` objects to WebGL textures and draw them to the canvas synchronized with a `requestAnimationFrame` loop.
  * **Quality Gate**: Load an OPFS video, press Play in the UI, and verify the Program Monitor outputs frames continuously and smoothly at the target framerate (e.g., 30fps) without audio drift.

## Phase 4: State-Driven Timeline & Mathematical Edit Logic
**Goal**: Build the interactive Timeline UI and integrate advanced non-destructive mathematical editing logic.

* **Sub-phase 4.1: Timeline Data Architecture (Completed)**
  * **Tasks**: Implement the JSON graph state in Zustand (`Project` -> `Sequences` -> `Tracks` -> `Clips`). Add parameters for `trimIn`, `trimOut`, and `trackStart`.
  * **Quality Gate**: Console logging the Zustand state reveals a perfectly nested data structure capable of supporting multiple tracks and clips.
* **Sub-phase 4.2: Timeline UI Rendering & Interaction (Completed)**
  * **Tasks**: Render Timeline tracks visually based on Zustand state. Implement Drag-and-Drop to place clips from Project Bin onto Tracks. Implement basic snap-to-grid/snap-to-clip mechanics.
  * **Quality Gate**: User dragging an asset into the timeline creates a visual block at the exact timestamp where the mouse was released, correctly updating the Zustand tree.
* **Sub-phase 4.3: Ripple & Rolling Edit Algorithms**
  * **Tasks**: Implement strict mathematical $\Delta t$ offsets for Ripple and Rolling edits. Implement the Razor (Cut) tool.
  * **Quality Gate**: Placing three clips sequentially, shortening the middle clip via a Ripple Edit automatically shifts the third clip backwards by the exact trimmed duration, maintaining frame continuity.

## Phase 5: Spatial Effects, Audio DSP, & Export Pipeline
**Goal**: Implement basic color/spatial node logic and render the sequence into a standalone media file via hardware encoding.

* **Sub-phase 5.1: Shader Modifiers & DSP Routing**
  * **Tasks**: Implement Lumetri-style contrast/brightness WebGL shader uniforms. Route audio using `Web Audio API` Gain nodes and connect to UI sliders.
  * **Quality Gate**: User dragging a contrast slider instantly updates the paused Program Monitor frame. Audio fader correctly adjusts volume during playback.
* **Sub-phase 5.2: Sequential Export Encoder**
  * **Tasks**: Configure `WebCodecs VideoEncoder` with VBR settings. Implement logic to traverse the Timeline Zustand tree, sequentially decode frames, render through WebGL, and feed into the Encoder.
  * **Quality Gate**: Render a sequence with 1 cut and modified contrast parameters. The engine processes it successfully.
* **Sub-phase 5.3: WebM/MP4 Muxing & File Download**
  * **Tasks**: Mux the output chunks from the VideoEncoder and AudioEncoder into a playable container format and trigger a browser download via Blob URL.
  * **Quality Gate**: The downloaded output file plays cleanly in a desktop OS media player (e.g., VLC, QuickTime), faithfully representing the timeline edits, contrast adjustments, and audio levels.

## Phase 6: Advanced UI Overhaul & UX Polish (Backlog/Future)
**Goal**: Overhaul the application shell to incorporate a scalable Windows-style Ribbon Menu explicitly designed for managing complex NLE features.

* **Sub-phase 6.1: Ribbon Architecture & Component Development**
  * **Tasks**: Replace simple header panels with a fully tabbed Windows Office-style Ribbon interface. Organize tools (Edit, Color, Audio, Export) into logical ribbons.
  * **Quality Gate**: Users can smoothly switch between Ribbon tabs, and UI elements properly scale without breaking the 4-panel grid monitor layout.
* **Sub-phase 6.2: Contextual Tool Activation**
  * **Tasks**: Bind Zustand state to the Ribbon Menu, conditionally enabling/disabling formatting tabs based on the active Timeline selection (e.g., showing 'Video Effects' only when a video clip is active).
  * **Quality Gate**: Selecting an audio clip dynamically displays the Audio Tools ribbon, perfectly syncing with global editor state.
