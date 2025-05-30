import { AssetManager } from './core/AssetManager.js';
import { Viewer3D } from './core/Viewer3D.js';
import { ContentViewer } from './core/ContentViewer.js';
import { RecordingManager } from './core/RecordingManager.js';
import { DragDropHandler } from './utils/DragDropHandler.js';
import { CONFIG } from './config.js';

/* ---------- Initialize Application ---------- */
const assetManager = new AssetManager();
const viewer3D = new Viewer3D('viewer3D');
const contentViewer = new ContentViewer();
const dragDropHandler = new DragDropHandler();
const recordingManager = new RecordingManager();

// Connect the recording manager to the viewers after initialization
recordingManager.connect(viewer3D, contentViewer);

// Make instances globally accessible for debugging and drawer resize functionality
window.assetManager = assetManager;
window.viewer3D = viewer3D;
window.contentViewer = contentViewer;
window.recordingManager = recordingManager;

// Add debugging helpers
window.centerModel = () => viewer3D.centerModel();
window.resetCamera = () => viewer3D.fitModelToPane();

// Remove direct model loading - let users upload their own models
// This was bypassing the AssetManager system and not showing in the drawer
console.log('Interactive 3D Learning Platform initialized - ready for file uploads');

// Back button functionality
document.getElementById('btnBack').addEventListener('click', () => {
  viewer3D.goBackToFullView();
});

// Initially hide back button
document.getElementById('backButtonOverlay').classList.remove('visible');

// Monitor drawer state changes for automatic model refitting
function setupDrawerResizeObserver() {
  // Monitor the 3D viewer container for size changes
  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target.id === 'viewer3D') {
          // Debounce resize calls to avoid excessive refitting
          clearTimeout(viewer3D.resizeTimeout);
          viewer3D.resizeTimeout = setTimeout(() => {
            viewer3D.onResize();
          }, 100);
        }
      }
    });
    
    resizeObserver.observe(document.getElementById('viewer3D'));
  } else {
    // Fallback for browsers without ResizeObserver
    // Monitor drawer toggle clicks manually
    document.addEventListener('click', (e) => {
      if (e.target.closest('.drawer-toggle')) {
        setTimeout(() => {
          viewer3D.onResize();
          // Also trigger content viewer resize for PDF re-fitting
          if (contentViewer) {
            contentViewer.onResize();
          }
        }, 300); // Wait for CSS transition to complete
      }
    });
  }
}

// Initialize drawer resize monitoring
setupDrawerResizeObserver();

console.log('Interactive 3D Learning Platform initialized');
console.log('Modules loaded:', {
  assetManager: !!assetManager,
  viewer3D: !!viewer3D,
  contentViewer: !!contentViewer,
  dragDropHandler: !!dragDropHandler,
  recordingManager: !!recordingManager
}); 