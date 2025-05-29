// External library imports
export const THREE_CDN = 'https://unpkg.com/three@0.164.0/build/three.module.js';
export const ORBIT_CONTROLS_CDN = 'https://unpkg.com/three@0.164.0/examples/jsm/controls/OrbitControls.js';
export const GLTF_LOADER_CDN = 'https://unpkg.com/three@0.164.0/examples/jsm/loaders/GLTFLoader.js';
export const GSAP_CDN = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

// PDF.js configuration (if needed for ContentViewer)
export const PDFJS_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
export const PDFJS_WORKER_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// Application constants
export const CONFIG = {
  // File size limits (in bytes)
  MAX_MODEL_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_CONTENT_SIZE: 50 * 1024 * 1024, // 50MB
  
  // Supported file types
  SUPPORTED_3D_TYPES: ['.glb', '.gltf'],
  SUPPORTED_CONTENT_TYPES: ['.pdf', '.png', '.jpg', '.jpeg'],
  
  // UI constants
  DRAWER_ANIMATION_DURATION: 300, // ms
  RESIZE_DEBOUNCE_DELAY: 100, // ms
  CLICK_THRESHOLD: 200, // ms for distinguishing clicks from drags
  
  // 3D viewer defaults
  CAMERA_FOV: 75,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 1000,
  CAMERA_POSITION: [5, 5, 5],
  
  // Animation defaults
  ANIMATION_DURATION: 1000, // ms
  EXPLOSION_FACTOR_MAX: 3,
  SLICE_PLANE_STEP: 0.1
}; 