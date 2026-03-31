# WASM Web Video Editor Detailed Project Plan

## 1. Project Overview
* **Goal**: Develop a high-performance, professional Non-Linear Editing (NLE) video tool running entirely in the web browser.
* **Paradigm**: Adobe Premiere Pro-style interface and workflow. No standalone installation required.
* **Core Mechanisms**: Heavy lifting (decoding, rendering, encoding, and DSP) is offloaded to Web Workers and WebAssembly to prevent main thread (UI) blocking, ensuring mathematical precision and non-destructive metadata manipulation.

## 2. Concrete Technology Stack
* **Frontend UI & State**: 
  * React + Vite + TypeScript: Fast build and strict type safety.
  * Tailwind CSS: Rapid, modular styling for complex panels.
  * Zustand: Global state management for lightweight, high-frequency updates (e.g., playhead position, active tool state).
* **Core Media Engine (WASM + Workers)**:
  * Rust + wasm-bindgen: High performance and memory safety for core mathematical algorithms (e.g., time interpolation, audio DSP logic, color science matrices).
  * Web Workers: Dedicated workers for media orchestration to keep the UI strictly at 60 FPS.
* **Rendering & Media Pipeline**:
  * WebCodecs API: Hardware-accelerated video/audio decoding and encoding.
  * OffscreenCanvas + WebGL 2.0 / WebGPU: High-performance video frame rendering. Utilizes a 32-bit floating-point color pipeline preventing color truncation/banding during heavy Lumetri or LUT processing.
  * Web Audio API: Audio track mixing, volume automation, and parametric DSP control.
* **Storage & File Handling**:
  * OPFS (Origin Private File System): Persistent, high-speed local storage. Implements a Proxy workflow architecture, creating and linking low-resolution decode-friendly proxy files while maintaining absolute original media pointers.

## 3. Core Data Architecture & Editing Algorithms
The application state revolves around a structured, non-destructive project graph mapped via mathematical coordinates:
* **Project**: Root container, mimicking a localized production database.
  * **MediaPool**: Array of registered assets mapping OPFS references. Supports Proxy pairings for dynamic resolution switching without altering the base tree.
  * **Sequences**: Independent timelines driven by metadata arrays.
    * **Tracks**: Video Tracks (V1, V2...) and Audio Tracks (A1, A2...) incorporating hierarchical routing and Submix capabilities.
      * **Clips**: Instances of MediaPool items. Governed by precise metadata properties (id, mediaId, 	rackStart, duration, 	rimIn, 	rimOut).
* **Editing Algorithms**: 
  * **Ripple/Rolling Edits**: Mathematical offsets calculating delta time (dt) to shift adjacent clips dynamically without desyncing track continuity.
  * **Slip/Slide Edits**: Zero-sum coordinate adjustments shifting internal 	rimIn/	rimOut boundaries while holding the container's absolute timeline space constant.
  * **Keyframes**: Supports linear and Bezier curve interpolation for rendering smooth parameter transitions (e.g., scale, opacity).

## 4. UI/UX Layout & Interaction (Premiere Pro Standard)
* **Visual Aesthetic**: Professional deep dark theme (e.g., `#1e1e1e` backgrounds), high-contrast accent colors (e.g., Adobe's signature blue), highly compact typography, sharp square corners, and distinct panel borders mimicking professional NLE software styling.
* **Bottom Left (Project Panel)**: Asset bin, media import, metadata tags, and proxy generation logic toggles.
* **Top Left (Source Monitor & Effect Controls)**: Single clip previewing. 3-point editing integration (In, Out, Target). Graphic Bezier curve keyframe editors.
* **Top Right (Program Monitor)**: Real-time playback of the active sequence integrating Time Interpolation (Frame Sampling/Blending heuristics).
* **Bottom Right (Timeline Panel & Toolbar)**: Time-axis multi-track editing. 
  * **Shortcuts**: Spacebar, J/K/L navigation, C (Razor tool), V (Selection Tool).
  * **Interactions**: Magnetic snapping, mouse-wheel for timeline zoom mapping.

## 5. Granular Phased Development Milestones

### Phase 1: Core Infrastructure Scaffolding & WASM Setup
* **Goal**: Establish the repository, UI framework, and WASM-to-Worker communication bridge.
* **Tasks**: Init Vite React project, configure Rust WASM package, setup a Web Worker, and establish an asynchronous message-passing system.
* **Quality Gate Test**: Send a complex math calculation from the React UI to the Rust WASM Worker, receive the correct result, and display it in the UI without blocking the main thread.

### Phase 2: Media Ingestion, OPFS & Proxy Workflow
* **Goal**: Safely import large video files into browser storage, extract basic metadata, and generate proxy cache structures.
* **Tasks**: Implement Drag & Drop UI, write streaming logic to transfer files to OPFS via FileSystemSyncAccessHandle, and implement a basic proxy-generation trigger routing to WebCodecs.
* **Quality Gate Test**: Drag and drop a >500MB MP4 file; verify it saves to OPFS successfully within seconds. Generate a proxy file, and seamlessly toggle the metadata pointer between the high-res and proxy paths.

### Phase 3: Decoupled Playback Engine & 32-bit Render Pipeline
* **Goal**: Create the foundation for the Program Monitor playback and core rendering logic.
* **Tasks**: Implement a Web Worker that reads video streams from OPFS, demuxes/decodes frames via WebCodecs API, and renders them to an OffscreenCanvas using a 32-bit floating-point WebGL shader environment.
* **Quality Gate Test**: Load a video, press Play, and verify the OffscreenCanvas outputs frames continuously at the target framerate (e.g., 30fps) using the proxy file source.

### Phase 4: State-Driven Timeline & Mathematical Edit Logic
* **Goal**: Build the interactive Timeline UI and integrate advanced Ripple/Rolling edit mathematical logic.
* **Tasks**: Build Timeline React components, implement 3-point editing metadata routing, and construct the delta time adjustment algorithms for ripple editing.
* **Quality Gate Test**: Place three clips sequentially on V1. Perform a Ripple Edit on the middle clip by shortening it by 2 seconds. Verify that the third clip moves exactly 2 seconds backward, leaving no timeline gap and maintaining perfect frame sequence.

### Phase 5: Spatial Effects, Audio DSP, & Export Pipeline
* **Goal**: Implement basic color/spatial node logic and render the sequence into a standalone media file via hardware encoding.
* **Tasks**: Introduce a Lumetri-style contrast shader modifier on clips, route audio through a basic DSP gain node, traverse the timeline sequentially decoding necessary frames, and pass to WebCodecs VideoEncoder (VBR mapping).
* **Quality Gate Test**: Render a sequence with 2 different clips featuring modified contrast parameters. Export as VBR MP4, download, and verify it plays successfully reflecting the color adjustments.
