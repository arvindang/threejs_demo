import * as THREE from 'https://unpkg.com/three@0.164.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.164.0/examples/jsm/controls/OrbitControls.js';
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";
import { RenderingSystem } from './systems/RenderingSystem.js';
import { ModelLoader } from './loaders/ModelLoader.js';
import { InteractionSystem } from './systems/InteractionSystem.js';
import { EffectsSystem } from './systems/EffectsSystem.js';
import { AnimationSystem } from './systems/AnimationSystem.js';
import { CameraSystem } from './systems/CameraSystem.js';
import { UIManager } from './ui/UIManager.js';
import { MathUtils } from './utils/MathUtils.js';
import { StateManager } from './utils/StateManager.js';

// Export THREE to global window object to avoid multiple imports
window.THREE = THREE;

export class Viewer3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    
    // Initialize rendering system
    this.renderingSystem = new RenderingSystem(this.container);
    
    // Get references to Three.js objects from rendering system
    this.scene = this.renderingSystem.getScene();
    this.camera = this.renderingSystem.getCamera();
    this.renderer = this.renderingSystem.getRenderer();
    this.controls = this.renderingSystem.getControls();
    this.clipPlane = this.renderingSystem.getClipPlane();
    
    // Initialize camera system
    this.cameraSystem = new CameraSystem(this.camera, this.controls, this.container);
    this.setupCameraSystemCallbacks();
    
    // Initialize model loader
    this.modelLoader = new ModelLoader(this.scene, this.camera, this.controls);
    this.modelLoader.setCameraSystem(this.cameraSystem);
    this.setupModelLoaderCallbacks();
    
    // Initialize interaction system
    this.interactionSystem = new InteractionSystem(this.camera, this.renderer, this.controls);
    this.interactionSystem.setCameraSystem(this.cameraSystem);
    this.setupInteractionSystemCallbacks();
    
    // Initialize effects system
    this.effectsSystem = new EffectsSystem(this.renderingSystem);
    
    // Initialize animation system
    this.animationSystem = new AnimationSystem(this.renderingSystem);
    this.setupAnimationSystemCallbacks();
    
    // Initialize state manager
    this.stateManager = new StateManager();
    this.setupStateManagerCallbacks();
    
    // Initialize UI manager
    this.uiManager = new UIManager();
    this.setupUIManagerCallbacks();
    
    // Default to Y-axis slicing (existing behavior)
    this.sliceDirection = 'y';
    
    this.setupGUI();
    
    // Model state (managed by StateManager and systems)
    this.model = null;
    this.parts = [];
    this.currentlyFocusedPart = null;
    this.previousCameraState = { position: null, target: null };
    
    // Legacy animation properties for backward compatibility - these now delegate to AnimationSystem
    this.clock = new THREE.Clock(); // Keep for any external use
    
    // X-ray system - delegated to EffectsSystem but keeping backward compatibility
    this.originalMaterialOpacity = new Map();
    this.isXrayMode = false;
  }

  setupCameraSystemCallbacks() {
    this.cameraSystem.setCallback((cameraEvent) => {
      // Update state manager with camera changes
      this.stateManager.updateCameraState(
        cameraEvent.position,
        cameraEvent.target,
        cameraEvent.part
      );
      
      // Handle specific camera events
      switch (cameraEvent.type) {
        case 'focus_on_part':
          this.currentlyFocusedPart = cameraEvent.part;
          break;
        case 'back_to_full_view':
          this.currentlyFocusedPart = null;
          break;
      }
    });
  }

  setupModelLoaderCallbacks() {
    this.modelLoader.setCallbacks({
      onModelLoaded: (gltf, model, parts) => {
        // Update local references
        this.model = model;
        this.parts = parts;
        
        // Update all systems with new model/parts
        this.interactionSystem.updateModelReferences(model, parts);
        this.effectsSystem.updateModelReferences(model, parts, this.modelLoader);
        this.animationSystem.updateModelReferences(model);
        this.cameraSystem.updateModelReferences(model, parts);
        
        // Update state manager
        this.stateManager.updateModelState(model, parts);
        
        // Setup animations if available
        if (gltf.animations && gltf.animations.length > 0) {
          this.animationSystem.setupAnimations(gltf.animations);
        }
        
        this.calculateExplosionDirections();
        this.updateSlice();
      },
      onModelCleared: () => {
        // Clear local state
        this.model = null;
        this.parts = [];
        this.currentlyFocusedPart = null;
        this.previousCameraState = { position: null, target: null };
        
        // Update all systems
        this.interactionSystem.updateModelReferences(null, []);
        this.effectsSystem.clearModel();
        this.animationSystem.clearModel();
        this.cameraSystem.updateModelReferences(null, []);
        
        // Update state manager
        this.stateManager.updateModelState(null, []);
        
        // Clear x-ray mode - legacy compatibility
        this.originalMaterialOpacity.clear();
        this.isXrayMode = false;
        
        // Hide back button
        const backButton = document.getElementById('backButtonOverlay');
        if (backButton) {
          backButton.classList.remove('visible');
        }
      },
      onProgress: (progress) => {
        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
      },
      onError: (error) => {
        console.error('Error loading model:', error);
      }
    });
  }

  setupInteractionSystemCallbacks() {
    this.interactionSystem.setCallbacks({
      onPartSelected: (selectedMesh) => {
        console.log('Part selected:', selectedMesh.name);
      },
      onPartFocused: (focusedMesh) => {
        // Update local reference and state manager
        this.currentlyFocusedPart = focusedMesh;
        this.stateManager.updateModelState(this.model, this.parts, focusedMesh);
      },
      onBackToFullView: () => {
        // Fit model to pane when going back to full view
        this.fitModelToPane();
        this.currentlyFocusedPart = null;
        this.stateManager.updateModelState(this.model, this.parts, null);
      }
    });
  }

  setupAnimationSystemCallbacks() {
    this.animationSystem.setCallbacks({
      onAnimationUIUpdate: () => {
        // Animation UI has been updated
      },
      onAnimationButtonsUpdate: () => {
        // Animation buttons have been updated
      }
    });
  }

  setupStateManagerCallbacks() {
    this.stateManager.setCallbacks({
      onModelStateChange: (newState, oldState) => {
        console.log('Model state changed:', newState);
      },
      onUIStateChange: (newState, oldState) => {
        console.log('UI state changed:', newState);
      },
      onCameraStateChange: (newState, oldState) => {
        console.log('Camera state changed:', newState);
      },
      onToolStateChange: (newTool, oldTool) => {
        console.log('Tool changed from', oldTool, 'to', newTool);
      }
    });
  }

  setupUIManagerCallbacks() {
    this.uiManager.setCallbacks({
      // Effects callbacks
      onExplodeChange: (value) => {
        this.params.explode = value;
        this.effectsSystem.setExplodeAmount(value);
        this.stateManager.updateUIState({ explode: value });
      },
      onSliceChange: (value) => {
        this.params.slice = value;
        this.effectsSystem.setSliceAmount(value);
        this.stateManager.updateUIState({ slice: value });
      },
      onSliceDirectionChange: (direction) => {
        this.params.sliceDirection = direction;
        this.sliceDirection = direction;
        this.effectsSystem.setSliceDirection(direction);
        this.stateManager.updateUIState({ sliceDirection: direction });
      },
      onXrayChange: (value) => {
        this.params.xray = value;
        this.effectsSystem.setXrayMode(value);
        this.isXrayMode = value < 1.0; // Update legacy compatibility
        this.stateManager.updateUIState({ xray: value });
      },
      
      // Animation callbacks - delegate to AnimationSystem
      onAnimationSelect: (animationName) => {
        this.animationSystem.selectAnimation(animationName);
      },
      onAnimationPlay: () => {
        this.animationSystem.playAnimation();
      },
      onAnimationPause: () => {
        this.animationSystem.pauseAnimation();
      },
      onAnimationStop: () => {
        this.animationSystem.stopAnimation();
      },
      onAnimationSpeedChange: (speed) => {
        this.animationSystem.setAnimationSpeed(speed);
      },
      onUpdateAnimationUI: () => {
        this.animationSystem.updateAnimationUI();
      },
      
      // Navigation callbacks
      onBackButton: () => {
        this.goBackToFullView();
      },
      onReset: () => {
        this.resetInternal();
      },
      
      // Tool callbacks
      onToolActivated: (toolType) => {
        this.stateManager.updateToolState(toolType);
        console.log('Tool activated:', toolType);
      }
    });
  }

  setupGUI() {
    // Controls parameters
    this.params = {
      explode: 0,
      slice: 1,
      sliceDirection: 'y',
      xray: 1, // 1 = fully opaque, 0 = fully transparent
      reset: () => this.reset()
    };

    // UI Manager handles all the controls now
    // No need for individual control setup
  }

  // Model loading methods
  loadModel(url, name) {
    this.modelLoader.loadModel(url, name);
  }

  loadGLTFModel(url, name, customManager = null) {
    this.modelLoader.loadGLTFModel(url, name, customManager);
  }

  loadFBXModel(url, name) {
    this.modelLoader.loadFBXModel(url, name);
  }

  loadOBJModel(url, name) {
    this.modelLoader.loadOBJModel(url, name);
  }

  loadPLYModel(url, name) {
    this.modelLoader.loadPLYModel(url, name);
  }

  loadSTLModel(url, name) {
    this.modelLoader.loadSTLModel(url, name);
  }

  fitModelToPane() {
    // Delegate to camera system
    this.cameraSystem.fitModelToPane(this.model);
  }

  clearModel() {
    this.modelLoader.clearModel();
  }

  showEmptyState() {
    this.modelLoader.showEmptyState();
  }

  hideEmptyState() {
    this.modelLoader.hideEmptyState();
  }

  // Effects delegation methods
  updateSliceDirection() {
    this.effectsSystem.setSliceDirection(this.sliceDirection);
  }

  updateSlice() {
    this.effectsSystem.setSliceAmount(this.params.slice);
  }

  calculateExplosionDirections() {
    this.effectsSystem.calculateExplosionDirections();
  }

  explode(factor) {
    this.effectsSystem.setExplodeAmount(factor);
  }

  setXrayMode(transparency) {
    this.params.xray = transparency;
    this.effectsSystem.setXrayMode(transparency);
    this.isXrayMode = transparency < 1.0;
    this.stateManager.updateUIState({ xray: transparency });
  }

  // Interaction methods - now delegate to camera system
  focusOnPart(selectedMesh) {
    this.interactionSystem.focusOnPart(selectedMesh);
  }

  goBackToFullView(animate = true) {
    this.interactionSystem.goBackToFullView(animate);
  }

  // Reset methods
  resetInternal() {
    // Internal reset logic without UI updates (UI Manager handles those)
    this.params.explode = 0;
    this.params.slice = 1;
    this.params.xray = 1;
    
    // Use effects system for reset
    this.effectsSystem.resetEffects();
    
    // Use state manager for reset
    this.stateManager.resetToDefaults();
    
    // Reset camera to fit model
    if (this.interactionSystem.isPartFocused()) {
      this.goBackToFullView();
    } else {
      this.fitModelToPane();
    }
    
    console.log('Reset to default state');
  }

  reset() {
    // Public reset method that includes UI updates
    this.resetInternal();
    this.uiManager.resetControls();
  }

  // Animation delegation methods - maintain backward compatibility
  setupAnimations(animations) {
    this.animationSystem.setupAnimations(animations);
  }

  selectAnimation(animationName) {
    this.animationSystem.selectAnimation(animationName);
  }

  playAnimation() {
    this.animationSystem.playAnimation();
  }

  pauseAnimation() {
    this.animationSystem.pauseAnimation();
  }

  stopAnimation() {
    this.animationSystem.stopAnimation();
  }

  setAnimationSpeed(speed) {
    this.animationSystem.setAnimationSpeed(speed);
  }

  updateAnimationUI() {
    this.animationSystem.updateAnimationUI();
  }

  updateAnimationButtons() {
    this.animationSystem.updateAnimationButtons();
  }

  // Legacy compatibility getters for animation properties
  get mixer() {
    return this.animationSystem.mixer;
  }

  get animations() {
    return this.animationSystem.animations;
  }

  get currentAction() {
    return this.animationSystem.currentAction;
  }

  // Test cube methods (keeping for backward compatibility)
  addTestCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    this.testCube = new THREE.Mesh(geometry, material);
    this.testCube.name = 'TestCube';
    this.scene.add(this.testCube);
    this.parts.push(this.testCube);
    console.log('Added test cube for verification');
  }

  removeTestCube() {
    if (this.testCube) {
      this.scene.remove(this.testCube);
      this.testCube.geometry.dispose();
      this.testCube.material.dispose();
      this.testCube = null;
      console.log('Removed test cube');
    }
  }

  // Recording system support methods
  setExplodeAmount(amount) {
    this.params.explode = amount;
    this.effectsSystem.setExplodeAmount(amount);
    this.uiManager.updateControlValues({ explode: amount });
  }

  setSliceAmount(amount) {
    this.params.slice = amount;
    this.effectsSystem.setSliceAmount(amount);
    this.uiManager.updateControlValues({ slice: amount });
  }

  setXRayAmount(amount) {
    this.setXrayMode(amount);
    this.uiManager.updateControlValues({ xray: amount });
  }

  focusOnPartByName(objectName) {
    return this.interactionSystem.focusOnPartByName(objectName);
  }

  // Getter methods for current state (useful for recording)
  get explodeAmount() {
    return this.effectsSystem.currentExplodeAmount;
  }

  get sliceAmount() {
    return this.effectsSystem.currentSliceAmount;
  }

  get xrayAmount() {
    return this.effectsSystem.currentXrayAmount;
  }

  // Legacy compatibility methods - these maintain the old interface but delegate to UI Manager
  get currentTool() {
    return this.uiManager.getCurrentTool();
  }

  activateTool(toolType) {
    this.uiManager.activateTool(toolType);
  }

  handlePercentageShortcut(digit, shiftKey) {
    // This is now handled by the UI Manager
    console.warn('handlePercentageShortcut is deprecated - handled automatically by UIManager');
  }

  showKeyboardShortcutsHelp() {
    this.uiManager.getKeyboardManager().showKeyboardShortcutsHelp();
  }

  /**
   * Handle container resize events
   */
  onResize() {
    // Delegate to rendering system for camera and renderer updates
    if (this.renderingSystem) {
      this.renderingSystem.onResize();
    }
    
    // Refit model to the new pane size if we have a model loaded
    if (this.model && !this.currentlyFocusedPart) {
      // Clear any existing resize timeout
      if (this.resizeFitTimeout) {
        clearTimeout(this.resizeFitTimeout);
      }
      
      // Delay to ensure CSS transitions and DOM updates are complete
      this.resizeFitTimeout = setTimeout(() => {
        console.log('Refitting model after resize...');
        this.fitModelToPane();
      }, 100);
    }
    
    console.log('Viewer3D resize handled');
  }

  /**
   * Manually center and fit the model (useful for debugging)
   */
  centerModel() {
    if (this.model) {
      console.log('Manually centering model...');
      this.fitModelToPane();
    } else {
      console.log('No model loaded to center');
    }
  }
} 