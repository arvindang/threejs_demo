/* ---------- Enhanced Recording System ---------- */
export class RecordingManager {
  constructor(viewer3D = null, contentViewer = null) {
    // Core recording components
    this.viewer3D = viewer3D;
    this.contentViewer = contentViewer;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordedStates = [];
    this.recordingStartTime = null;
    this.recordingState = 'idle'; // 'idle', 'recording', 'stopped', 'playing', 'paused'
    this.currentAudio = null;
    
    // High-frequency state tracking
    this.stateTrackingInterval = null;
    this.STATE_TRACK_FREQUENCY = 60; // 60 FPS for smooth playback
    this.CAMERA_TRACK_FREQUENCY = 30; // 30 FPS for camera (less frequent)
    
    // Playback components
    this.playbackAudio = null;
    this.playbackStartTime = null;
    this.playbackPauseTime = 0;
    this.playbackFrameId = null;
    this.currentStateIndex = 0;
    
    // Recording session data
    this.currentRecording = {
      audio: null,
      states: [],
      duration: 0,
      timestamp: null,
      initialState: null
    };
    
    // State tracking
    this.lastCameraState = null;
    this.lastInteractionState = null;
    this.frameCounter = 0;
    
    this.setupEventListeners();
  }

  // Connect to 3D viewer and content viewer after initialization
  connect(viewer3D, contentViewer) {
    this.viewer3D = viewer3D;
    this.contentViewer = contentViewer;
    this.setupInteractionListeners();
  }

  setupEventListeners() {
    // Recording control buttons
    const btnRecord = document.getElementById('btnRecord');
    const btnStop = document.getElementById('btnStop');
    const btnPlay = document.getElementById('btnPlay');
    const btnPause = document.getElementById('btnPause');

    if (btnRecord) btnRecord.addEventListener('click', () => this.startRecording());
    if (btnStop) btnStop.addEventListener('click', () => this.stopRecording());
    if (btnPlay) btnPlay.addEventListener('click', () => this.playRecording());
    if (btnPause) btnPause.addEventListener('click', () => this.pausePlayback());
  }

  setupInteractionListeners() {
    // Only setup if we have connected viewers
    if (!this.viewer3D || !this.contentViewer) return;

    // 3D Viewer interactions - capture discrete events but also track continuous states
    this.setupViewer3DListeners();
    
    // Content Viewer interactions
    this.setupContentViewerListeners();
  }

  setupViewer3DListeners() {
    if (!this.viewer3D) return;

    // Use a safer method override approach
    const viewer = this.viewer3D;
    
    // Store original methods safely
    const originalMethods = {};
    
    // Expanded list to include animation and reset methods
    const methodsToOverride = [
      'focusOnPart', 'goBackToFullView', 'setExplodeAmount', 'setSliceAmount', 'setXRayAmount', 
      'loadModel', 'reset', 'selectAnimation', 'playAnimation', 'pauseAnimation', 'stopAnimation', 'setAnimationSpeed'
    ];
    
    methodsToOverride.forEach(methodName => {
      if (typeof viewer[methodName] === 'function') {
        try {
          // Check if the property is writable
          const descriptor = Object.getOwnPropertyDescriptor(viewer, methodName) || 
                           Object.getOwnPropertyDescriptor(Object.getPrototypeOf(viewer), methodName);
          
          if (!descriptor || descriptor.writable !== false) {
            originalMethods[methodName] = viewer[methodName].bind(viewer);
            
            // Override the method
            switch (methodName) {
              case 'focusOnPart':
                viewer[methodName] = (mesh) => {
                  const result = originalMethods[methodName](mesh);
                  this.recordDiscreteEvent('3d_focus', { 
                    objectName: mesh?.name || 'unknown',
                    objectId: mesh?.uuid || null 
                  });
                  return result;
                };
                break;
                
              case 'goBackToFullView':
                viewer[methodName] = (...args) => {
                  const result = originalMethods[methodName](...args);
                  this.recordDiscreteEvent('3d_back_to_full');
                  return result;
                };
                break;
                
              case 'reset':
                viewer[methodName] = (...args) => {
                  const result = originalMethods[methodName](...args);
                  this.recordDiscreteEvent('3d_reset');
                  return result;
                };
                break;
                
              case 'setExplodeAmount':
                viewer[methodName] = (amount) => {
                  const result = originalMethods[methodName](amount);
                  this.recordDiscreteEvent('3d_explode_set', { amount });
                  return result;
                };
                break;
                
              case 'setSliceAmount':
                viewer[methodName] = (amount) => {
                  const result = originalMethods[methodName](amount);
                  this.recordDiscreteEvent('3d_slice_set', { amount });
                  return result;
                };
                break;
                
              case 'setXRayAmount':
                viewer[methodName] = (amount) => {
                  const result = originalMethods[methodName](amount);
                  this.recordDiscreteEvent('3d_xray_set', { amount });
                  return result;
                };
                break;
                
              case 'loadModel':
                viewer[methodName] = (...args) => {
                  const result = originalMethods[methodName](...args);
                  this.recordDiscreteEvent('3d_model_load', { 
                    modelUrl: args[0],
                    modelName: args[1] 
                  });
                  return result;
                };
                break;
                
              case 'selectAnimation':
                viewer[methodName] = (animationName) => {
                  const result = originalMethods[methodName](animationName);
                  this.recordDiscreteEvent('3d_animation_select', { 
                    animationName 
                  });
                  return result;
                };
                break;
                
              case 'playAnimation':
                viewer[methodName] = (...args) => {
                  const result = originalMethods[methodName](...args);
                  this.recordDiscreteEvent('3d_animation_play');
                  return result;
                };
                break;
                
              case 'pauseAnimation':
                viewer[methodName] = (...args) => {
                  const result = originalMethods[methodName](...args);
                  this.recordDiscreteEvent('3d_animation_pause');
                  return result;
                };
                break;
                
              case 'stopAnimation':
                viewer[methodName] = (...args) => {
                  const result = originalMethods[methodName](...args);
                  this.recordDiscreteEvent('3d_animation_stop');
                  return result;
                };
                break;
                
              case 'setAnimationSpeed':
                viewer[methodName] = (speed) => {
                  const result = originalMethods[methodName](speed);
                  this.recordDiscreteEvent('3d_animation_speed', { 
                    speed 
                  });
                  return result;
                };
                break;
            }
          } else {
            console.warn(`Cannot override readonly method: ${methodName}`);
          }
        } catch (error) {
          console.warn(`Failed to override method ${methodName}:`, error);
        }
      }
    });
  }

  setupContentViewerListeners() {
    if (!this.contentViewer) return;

    // Use a safer method override approach
    const viewer = this.contentViewer;
    
    // Store original methods safely
    const originalMethods = {};
    
    // Only override if methods exist and are writable
    const methodsToOverride = ['nextPage', 'prevPage', 'zoomIn', 'zoomOut', 'loadContent'];
    
    methodsToOverride.forEach(methodName => {
      if (typeof viewer[methodName] === 'function') {
        try {
          // Check if the property is writable
          const descriptor = Object.getOwnPropertyDescriptor(viewer, methodName) || 
                           Object.getOwnPropertyDescriptor(Object.getPrototypeOf(viewer), methodName);
          
          if (!descriptor || descriptor.writable !== false) {
            originalMethods[methodName] = viewer[methodName].bind(viewer);
            
            // Override the method
            switch (methodName) {
              case 'nextPage':
                viewer[methodName] = async (...args) => {
                  const result = await originalMethods[methodName](...args);
                  this.recordDiscreteEvent('content_next_page', { 
                    newPage: viewer.currentPage,
                    totalPages: viewer.totalPages
                  });
                  return result;
                };
                break;
                
              case 'prevPage':
                viewer[methodName] = async (...args) => {
                  const result = await originalMethods[methodName](...args);
                  this.recordDiscreteEvent('content_prev_page', { 
                    newPage: viewer.currentPage,
                    totalPages: viewer.totalPages
                  });
                  return result;
                };
                break;
                
              case 'zoomIn':
                viewer[methodName] = async (...args) => {
                  const result = await originalMethods[methodName](...args);
                  this.recordDiscreteEvent('content_zoom_in', { 
                    newScale: viewer.scale 
                  });
                  return result;
                };
                break;
                
              case 'zoomOut':
                viewer[methodName] = async (...args) => {
                  const result = await originalMethods[methodName](...args);
                  this.recordDiscreteEvent('content_zoom_out', { 
                    newScale: viewer.scale 
                  });
                  return result;
                };
                break;
                
              case 'loadContent':
                viewer[methodName] = async (...args) => {
                  const result = await originalMethods[methodName](...args);
                  this.recordDiscreteEvent('content_switch_asset', { 
                    assetId: args[0]?.id,
                    assetName: args[0]?.name,
                    assetType: args[0]?.type,
                    assetUrl: args[0]?.url
                  });
                  return result;
                };
                break;
            }
          } else {
            console.warn(`Cannot override readonly method: ${methodName}`);
          }
        } catch (error) {
          console.warn(`Failed to override method ${methodName}:`, error);
        }
      }
    });
  }

  recordDiscreteEvent(type, data = {}) {
    if (this.recordingState !== 'recording') return;
    
    const timestamp = Date.now() - this.recordingStartTime;
    console.log(`Recording discrete event: ${type}`, data);
    
    // Add discrete event marker to the current state
    this.recordedStates.push({
      timestamp,
      type: 'event',
      eventType: type,
      data,
      state: this.captureCurrentState()
    });
  }

  captureCurrentState() {
    const state = {
      timestamp: Date.now() - this.recordingStartTime
    };

    // Capture 3D viewer state
    if (this.viewer3D) {
      state.viewer3D = {
        camera: {
          position: this.viewer3D.camera.position.toArray(),
          target: this.viewer3D.controls?.target.toArray() || [0, 0, 0]
        },
        explode: this.viewer3D.explodeAmount || 0,
        slice: this.viewer3D.sliceAmount || 1,
        xray: this.viewer3D.xrayAmount || 1,
        focusedPart: this.viewer3D.currentlyFocusedPart?.name || null,
        currentModel: this.getCurrentModelInfo(),
        
        // Animation state
        animation: {
          selectedAnimation: this.getCurrentAnimationName(),
          isPlaying: this.getAnimationPlayingState(),
          isPaused: this.getAnimationPausedState(),
          speed: this.getAnimationSpeed(),
          time: this.getAnimationTime()
        },
        
        // Object visibility state (for isolation)
        objectVisibility: this.getObjectVisibilityState(),
        
        // Previous camera state (for back navigation)
        previousCameraState: this.viewer3D.previousCameraState ? {
          position: this.viewer3D.previousCameraState.position?.toArray(),
          target: this.viewer3D.previousCameraState.target?.toArray()
        } : null
      };
    }

    // Capture content viewer state
    if (this.contentViewer) {
      state.contentViewer = {
        currentPage: this.contentViewer.currentPage || 1,
        totalPages: this.contentViewer.totalPages || 1,
        zoom: this.contentViewer.zoomLevel || 1,
        baseZoom: this.contentViewer.baseZoomLevel || 1,
        currentAsset: this.contentViewer.currentAsset ? {
          id: this.contentViewer.currentAsset.id,
          name: this.contentViewer.currentAsset.name,
          type: this.contentViewer.currentAsset.type,
          url: this.contentViewer.currentAsset.url
        } : null
      };
    }

    return state;
  }

  getCurrentModelInfo() {
    // Get current model information from AssetManager
    if (window.assetManager && window.assetManager.currentAsset3D) {
      const asset = window.assetManager.currentAsset3D;
      return {
        id: asset.id,
        name: asset.name,
        url: asset.url
      };
    }
    return null;
  }

  getCurrentAnimationName() {
    if (!this.viewer3D?.animationSystem) return null;
    return this.viewer3D.animationSystem.getCurrentAnimationName();
  }

  getAnimationPlayingState() {
    if (!this.viewer3D?.animationSystem) return false;
    return this.viewer3D.animationSystem.getAnimationPlayingState();
  }

  getAnimationPausedState() {
    if (!this.viewer3D?.animationSystem) return false;
    return this.viewer3D.animationSystem.getAnimationPausedState();
  }

  getAnimationSpeed() {
    if (!this.viewer3D?.animationSystem) return 1.0;
    return this.viewer3D.animationSystem.getAnimationSpeed();
  }

  getAnimationTime() {
    if (!this.viewer3D?.animationSystem) return 0;
    return this.viewer3D.animationSystem.getAnimationTime();
  }

  getObjectVisibilityState() {
    if (!this.viewer3D?.parts) return {};
    
    const visibility = {};
    this.viewer3D.parts.forEach((part, index) => {
      const partName = part.name || `part_${index}`;
      visibility[partName] = part.visible;
    });
    return visibility;
  }

  startContinuousStateTracking() {
    // Track state changes at high frequency for smooth playback
    this.stateTrackingInterval = setInterval(() => {
      if (this.recordingState !== 'recording') return;
      
      this.frameCounter++;
      const currentState = this.captureCurrentState();
      
      // Only record if state has changed significantly
      if (this.hasStateChanged(currentState)) {
        this.recordedStates.push({
          timestamp: currentState.timestamp,
          type: 'state',
          state: currentState
        });
        this.lastInteractionState = currentState;
      }
      
      // Track camera changes at lower frequency but more precisely
      if (this.frameCounter % 2 === 0) { // Every other frame for camera
        if (this.hasCameraChanged(currentState)) {
          this.recordedStates.push({
            timestamp: currentState.timestamp,
            type: 'camera',
            state: currentState
          });
          this.lastCameraState = currentState;
        }
      }
      
    }, 1000 / this.STATE_TRACK_FREQUENCY);
  }

  hasStateChanged(currentState) {
    if (!this.lastInteractionState) return true;
    
    const prev = this.lastInteractionState;
    const curr = currentState;
    
    // Check 3D viewer changes
    if (prev.viewer3D && curr.viewer3D) {
      if (Math.abs(prev.viewer3D.explode - curr.viewer3D.explode) > 0.01) return true;
      if (Math.abs(prev.viewer3D.slice - curr.viewer3D.slice) > 0.01) return true;
      if (Math.abs(prev.viewer3D.xray - curr.viewer3D.xray) > 0.01) return true;
      if (prev.viewer3D.focusedPart !== curr.viewer3D.focusedPart) return true;
    }
    
    // Check content viewer changes
    if (prev.contentViewer && curr.contentViewer) {
      if (prev.contentViewer.currentPage !== curr.contentViewer.currentPage) return true;
      if (Math.abs(prev.contentViewer.zoom - curr.contentViewer.zoom) > 0.01) return true;
      if (prev.contentViewer.currentAsset?.id !== curr.contentViewer.currentAsset?.id) return true;
    }
    
    return false;
  }

  hasCameraChanged(currentState) {
    if (!this.lastCameraState) return true;
    
    const prev = this.lastCameraState.viewer3D?.camera;
    const curr = currentState.viewer3D?.camera;
    
    if (!prev || !curr) return false;
    
    // Check position changes
    for (let i = 0; i < 3; i++) {
      if (Math.abs(prev.position[i] - curr.position[i]) > 0.01) return true;
      if (Math.abs(prev.target[i] - curr.target[i]) > 0.01) return true;
    }
    
    return false;
  }

  async startRecording() {
    console.log('Starting recording...');
    this.recordingState = 'recording';
    this.recordedStates = [];
    this.recordingStartTime = Date.now();
    this.frameCounter = 0;
    this.lastCameraState = null;
    this.lastInteractionState = null;

    // Capture initial state
    const initialState = this.captureCurrentState();
    this.currentRecording.initialState = initialState;
    
    this.recordedStates.push({
      timestamp: 0,
      type: 'initial',
      state: initialState
    });

    // Start continuous state tracking
    this.startContinuousStateTracking();

    // Start audio recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = event => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();
      console.log('Audio recording started');
    } catch (error) {
      console.error('Error starting audio recording:', error);
      // Continue without audio if permission denied
    }

    this.updateButtonStates();
  }

  stopRecording() {
    console.log('Stopping recording...');
    this.recordingState = 'processing';
    this.updateButtonStates();

    // Stop continuous state tracking
    if (this.stateTrackingInterval) {
      clearInterval(this.stateTrackingInterval);
      this.stateTrackingInterval = null;
    }

    // Stop audio recording
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.ondataavailable = null;
      
      this.mediaRecorder.onstop = () => {
        // Create audio blob
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.currentRecording.audio = URL.createObjectURL(audioBlob);
        this.currentRecording.duration = Date.now() - this.recordingStartTime;
        this.currentRecording.states = [...this.recordedStates];
        this.currentRecording.timestamp = new Date().toISOString();

        console.log(`Recording completed: ${this.currentRecording.duration}ms, ${this.recordedStates.length} states`);
        
        this.recordingState = 'stopped';
        this.updateButtonStates();
      };
    } else {
      // No audio recording
      this.currentRecording.duration = Date.now() - this.recordingStartTime;
      this.currentRecording.states = [...this.recordedStates];
      this.currentRecording.timestamp = new Date().toISOString();
      
      console.log(`Recording completed (no audio): ${this.currentRecording.duration}ms, ${this.recordedStates.length} states`);
      
      this.recordingState = 'stopped';
      this.updateButtonStates();
    }
  }

  async playRecording() {
    if (!this.currentRecording.states || this.currentRecording.states.length === 0) {
      console.warn('No recording to play');
      return;
    }

    console.log('Starting playback...');
    this.recordingState = 'playing';
    this.currentStateIndex = 0;
    this.playbackStartTime = Date.now();

    // Restore initial state
    if (this.currentRecording.initialState) {
      await this.restoreState(this.currentRecording.initialState);
    }

    // Start audio playback
    if (this.currentRecording.audio) {
      this.playbackAudio = new Audio(this.currentRecording.audio);
      this.playbackAudio.currentTime = 0;
      try {
        await this.playbackAudio.play();
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }

    // Start smooth state playback
    this.startSmoothPlayback();
    this.updateButtonStates();
  }

  startSmoothPlayback() {
    const playbackLoop = () => {
      if (this.recordingState !== 'playing') return;
      
      const currentTime = Date.now() - this.playbackStartTime;
      
      // Find the current and next states for interpolation
      const { currentState, nextState, interpolationFactor } = this.findStatesForTime(currentTime);
      
      if (currentState) {
        // Apply interpolated state
        this.applyInterpolatedState(currentState, nextState, interpolationFactor);
      }
      
      // Check if playback is complete
      if (currentTime >= this.currentRecording.duration) {
        this.stopPlayback();
        return;
      }
      
      // Continue on next frame
      this.playbackFrameId = requestAnimationFrame(playbackLoop);
    };
    
    this.playbackFrameId = requestAnimationFrame(playbackLoop);
  }

  findStatesForTime(currentTime) {
    const states = this.currentRecording.states;
    let currentState = null;
    let nextState = null;
    let interpolationFactor = 0;
    
    // Find the appropriate states for the current time
    for (let i = 0; i < states.length; i++) {
      if (states[i].timestamp <= currentTime) {
        currentState = states[i];
        // Look for next state for interpolation
        if (i + 1 < states.length) {
          nextState = states[i + 1];
          // Calculate interpolation factor
          const timeDiff = nextState.timestamp - currentState.timestamp;
          if (timeDiff > 0) {
            interpolationFactor = (currentTime - currentState.timestamp) / timeDiff;
            interpolationFactor = Math.min(1, Math.max(0, interpolationFactor));
          }
        }
      } else {
        break;
      }
    }
    
    return { currentState, nextState, interpolationFactor };
  }

  async applyInterpolatedState(currentState, nextState = null, factor = 0) {
    if (!currentState?.state) return;
    
    const state = currentState.state;
    
    // Handle discrete events immediately
    if (currentState.type === 'event') {
      await this.executeDiscreteEvent(currentState);
    }
    
    // Apply 3D viewer state with interpolation
    if (state.viewer3D && this.viewer3D) {
      // Interpolate camera position
      if (nextState?.state?.viewer3D?.camera && factor > 0) {
        const currCam = state.viewer3D.camera;
        const nextCam = nextState.state.viewer3D.camera;
        
        const interpolatedPos = this.interpolateArray(currCam.position, nextCam.position, factor);
        const interpolatedTarget = this.interpolateArray(currCam.target, nextCam.target, factor);
        
        this.viewer3D.camera.position.fromArray(interpolatedPos);
        this.viewer3D.controls?.target.fromArray(interpolatedTarget);
        this.viewer3D.controls?.update();
      } else {
        // Direct application
        if (state.viewer3D.camera) {
          this.viewer3D.camera.position.fromArray(state.viewer3D.camera.position);
          this.viewer3D.controls?.target.fromArray(state.viewer3D.camera.target);
          this.viewer3D.controls?.update();
        }
      }
      
      // Apply other 3D properties (with interpolation if next state available)
      if (nextState?.state?.viewer3D && factor > 0) {
        const currState = state.viewer3D;
        const nextStateViz = nextState.state.viewer3D;
        
        const explode = this.interpolateValue(currState.explode, nextStateViz.explode, factor);
        const slice = this.interpolateValue(currState.slice, nextStateViz.slice, factor);
        const xray = this.interpolateValue(currState.xray, nextStateViz.xray, factor);
        
        this.viewer3D.setExplodeAmount?.(explode);
        this.viewer3D.setSliceAmount?.(slice);
        this.viewer3D.setXRayAmount?.(xray);
        
        // Update UI controls
        this.updateUIControl('explodeSlider', explode);
        this.updateUIControl('sliceSlider', slice);
        this.updateUIControl('xraySlider', xray);
      } else {
        // Direct application
        this.viewer3D.setExplodeAmount?.(state.viewer3D.explode);
        this.viewer3D.setSliceAmount?.(state.viewer3D.slice);
        this.viewer3D.setXRayAmount?.(state.viewer3D.xray);
        
        this.updateUIControl('explodeSlider', state.viewer3D.explode);
        this.updateUIControl('sliceSlider', state.viewer3D.slice);
        this.updateUIControl('xraySlider', state.viewer3D.xray);
      }
      
      // Apply animation state (no interpolation needed - discrete state)
      if (state.viewer3D.animation) {
        await this.restoreAnimationState(state.viewer3D.animation);
      }
      
      // Apply object visibility state (for isolation)
      if (state.viewer3D.objectVisibility) {
        this.restoreObjectVisibility(state.viewer3D.objectVisibility);
      }
      
      // Restore focused part state
      if (state.viewer3D.focusedPart !== null) {
        // Update the viewer's focused part reference
        this.viewer3D.currentlyFocusedPart = this.findPartByName(state.viewer3D.focusedPart);
        
        // Show/hide back button based on focus state
        const backButton = document.getElementById('backButtonOverlay');
        if (backButton) {
          if (state.viewer3D.focusedPart) {
            backButton.classList.add('visible');
          } else {
            backButton.classList.remove('visible');
          }
        }
      }
      
      // Restore previous camera state for proper back navigation
      if (state.viewer3D.previousCameraState && state.viewer3D.previousCameraState.position) {
        this.viewer3D.previousCameraState = {
          position: new THREE.Vector3().fromArray(state.viewer3D.previousCameraState.position),
          target: new THREE.Vector3().fromArray(state.viewer3D.previousCameraState.target)
        };
      }
    }
    
    // Apply content viewer state (usually discrete, no interpolation needed)
    if (state.contentViewer && this.contentViewer) {
      // Handle asset switching
      if (state.contentViewer.currentAsset) {
        const currentAsset = this.contentViewer.currentAsset;
        if (!currentAsset || currentAsset.id !== state.contentViewer.currentAsset.id) {
          // Need to switch asset
          await this.switchToAsset(state.contentViewer.currentAsset);
        }
      }
      
      // Set page (absolute positioning)
      if (state.contentViewer.currentPage !== this.contentViewer.currentPage) {
        await this.setContentPage(state.contentViewer.currentPage);
      }
      
      // Set zoom level
      if (Math.abs(state.contentViewer.zoom - this.contentViewer.zoomLevel) > 0.01) {
        await this.setContentZoom(state.contentViewer.zoom);
      }
    }
  }

  interpolateValue(start, end, factor) {
    if (start === undefined || end === undefined) return start;
    return start + (end - start) * factor;
  }

  interpolateArray(start, end, factor) {
    if (!start || !end || start.length !== end.length) return start;
    return start.map((val, i) => val + (end[i] - val) * factor);
  }

  updateUIControl(controlId, value) {
    const control = document.getElementById(controlId);
    if (control) {
      control.value = value;
      // Trigger value display update
      const event = new Event('input');
      control.dispatchEvent(event);
    }
  }

  async executeDiscreteEvent(eventState) {
    console.log('Executing discrete event:', eventState.eventType, eventState.data);
    
    try {
      switch (eventState.eventType) {
        case '3d_focus':
          if (this.viewer3D && eventState.data.objectName) {
            await this.focusOnPartByName(eventState.data.objectName);
          }
          break;
          
        case '3d_back_to_full':
          if (this.viewer3D) {
            this.viewer3D.goBackToFullView?.(false); // No animation during playback
          }
          break;
          
        case '3d_reset':
          if (this.viewer3D) {
            // Temporarily disable recording to avoid recursive calls
            const wasRecording = this.recordingState === 'recording';
            if (wasRecording) {
              this.recordingState = 'playback';
            }
            
            this.viewer3D.reset?.();
            
            if (wasRecording) {
              this.recordingState = 'recording';
            }
          }
          break;
          
        case '3d_model_load':
          if (this.viewer3D && eventState.data.modelUrl) {
            await this.loadModel(eventState.data.modelUrl, eventState.data.modelName);
          }
          break;
          
        case '3d_animation_select':
          if (this.viewer3D && eventState.data.animationName) {
            await this.selectAnimationByName(eventState.data.animationName);
          }
          break;
          
        case '3d_animation_play':
          if (this.viewer3D?.animationSystem) {
            // Temporarily disable recording to avoid recursive calls
            const wasRecording = this.recordingState === 'recording';
            if (wasRecording) {
              this.recordingState = 'playback';
            }
            
            this.viewer3D.animationSystem.playAnimation?.();
            
            if (wasRecording) {
              this.recordingState = 'recording';
            }
          }
          break;
          
        case '3d_animation_pause':
          if (this.viewer3D?.animationSystem) {
            // Temporarily disable recording to avoid recursive calls
            const wasRecording = this.recordingState === 'recording';
            if (wasRecording) {
              this.recordingState = 'playback';
            }
            
            this.viewer3D.animationSystem.pauseAnimation?.();
            
            if (wasRecording) {
              this.recordingState = 'recording';
            }
          }
          break;
          
        case '3d_animation_stop':
          if (this.viewer3D?.animationSystem) {
            // Temporarily disable recording to avoid recursive calls
            const wasRecording = this.recordingState === 'recording';
            if (wasRecording) {
              this.recordingState = 'playback';
            }
            
            this.viewer3D.animationSystem.stopAnimation?.();
            
            if (wasRecording) {
              this.recordingState = 'recording';
            }
          }
          break;
          
        case '3d_animation_speed':
          if (this.viewer3D?.animationSystem && eventState.data.speed) {
            // Temporarily disable recording to avoid recursive calls
            const wasRecording = this.recordingState === 'recording';
            if (wasRecording) {
              this.recordingState = 'playback';
            }
            
            this.viewer3D.animationSystem.setAnimationSpeed?.(eventState.data.speed);
            
            if (wasRecording) {
              this.recordingState = 'recording';
            }
          }
          break;
          
        case 'content_switch_asset':
          if (eventState.data.assetId) {
            await this.switchToAsset(eventState.data);
          }
          break;
      }
    } catch (error) {
      console.error('Error executing discrete event:', eventState, error);
    }
  }

  async focusOnPartByName(objectName) {
    if (!this.viewer3D || !objectName) return;
    
    // Find the object in the current model
    if (this.viewer3D.model) {
      let targetMesh = null;
      this.viewer3D.model.traverse((child) => {
        if (child.isMesh && child.name === objectName) {
          targetMesh = child;
        }
      });
      
      if (targetMesh) {
        this.viewer3D.focusOnPart(targetMesh);
      }
    }
  }

  async loadModel(modelUrl, modelName) {
    if (!this.viewer3D) return;
    
    try {
      await this.viewer3D.loadModel(modelUrl, modelName);
    } catch (error) {
      console.error('Error loading model during playback:', error);
    }
  }

  async switchToAsset(assetInfo) {
    if (!assetInfo || !window.assetManager) return;
    
    try {
      // Find the asset in the asset manager
      const asset = window.assetManager.getAssetById(assetInfo.id);
      if (asset) {
        await this.contentViewer.loadContent(asset);
      } else {
        console.warn('Asset not found during playback:', assetInfo.id);
      }
    } catch (error) {
      console.error('Error switching asset during playback:', error);
    }
  }

  async setContentPage(pageNumber) {
    if (!this.contentViewer || !this.contentViewer.pdfDoc) return;
    
    // Set page directly (absolute positioning)
    this.contentViewer.currentPage = pageNumber;
    await this.contentViewer.renderPDFPage(pageNumber);
    this.contentViewer.updateNavigation();
  }

  async setContentZoom(zoomLevel) {
    if (!this.contentViewer) return;
    
    this.contentViewer.zoomLevel = zoomLevel;
    if (this.contentViewer.pdfDoc) {
      await this.contentViewer.renderPDFPage(this.contentViewer.currentPage);
    }
    this.contentViewer.updateNavigation();
  }

  async restoreState(state) {
    console.log('Restoring initial state');
    
    // Restore 3D viewer state
    if (state.viewer3D && this.viewer3D) {
      // Load model if needed
      if (state.viewer3D.currentModel) {
        const currentModel = this.getCurrentModelInfo();
        if (!currentModel || currentModel.id !== state.viewer3D.currentModel.id) {
          await this.loadModel(state.viewer3D.currentModel.url, state.viewer3D.currentModel.name);
        }
      }
      
      // Restore camera
      if (state.viewer3D.camera) {
        this.viewer3D.camera.position.fromArray(state.viewer3D.camera.position);
        this.viewer3D.controls?.target.fromArray(state.viewer3D.camera.target);
        this.viewer3D.controls?.update();
      }
      
      // Restore interaction state
      this.viewer3D.setExplodeAmount?.(state.viewer3D.explode || 0);
      this.viewer3D.setSliceAmount?.(state.viewer3D.slice || 1);
      this.viewer3D.setXRayAmount?.(state.viewer3D.xray || 1);
      
      // Update UI
      this.updateUIControl('explodeSlider', state.viewer3D.explode || 0);
      this.updateUIControl('sliceSlider', state.viewer3D.slice || 1);
      this.updateUIControl('xraySlider', state.viewer3D.xray || 1);
      
      // Restore animation state
      if (state.viewer3D.animation) {
        await this.restoreAnimationState(state.viewer3D.animation);
      }
      
      // Restore object visibility state (for isolation)
      if (state.viewer3D.objectVisibility) {
        this.restoreObjectVisibility(state.viewer3D.objectVisibility);
      }
      
      // Restore focused part state
      if (state.viewer3D.focusedPart) {
        this.viewer3D.currentlyFocusedPart = this.findPartByName(state.viewer3D.focusedPart);
        
        // Show back button if focusing on a part
        const backButton = document.getElementById('backButtonOverlay');
        if (backButton) {
          backButton.classList.add('visible');
        }
      } else {
        // Clear focused part state
        this.viewer3D.currentlyFocusedPart = null;
        
        // Hide back button
        const backButton = document.getElementById('backButtonOverlay');
        if (backButton) {
          backButton.classList.remove('visible');
        }
      }
      
      // Restore previous camera state for proper back navigation
      if (state.viewer3D.previousCameraState && state.viewer3D.previousCameraState.position) {
        this.viewer3D.previousCameraState = {
          position: new THREE.Vector3().fromArray(state.viewer3D.previousCameraState.position),
          target: new THREE.Vector3().fromArray(state.viewer3D.previousCameraState.target)
        };
      } else {
        this.viewer3D.previousCameraState = { position: null, target: null };
      }
    }
    
    // Restore content viewer state
    if (state.contentViewer && this.contentViewer) {
      // Load asset if needed
      if (state.contentViewer.currentAsset) {
        await this.switchToAsset(state.contentViewer.currentAsset);
        
        // Restore page and zoom
        await this.setContentPage(state.contentViewer.currentPage || 1);
        await this.setContentZoom(state.contentViewer.zoom || 1);
      }
    }
  }

  pausePlayback() {
    if (this.recordingState !== 'playing') return;
    
    this.recordingState = 'paused';
    this.playbackPauseTime = Date.now() - this.playbackStartTime;
    
    // Pause audio
    if (this.playbackAudio) {
      this.playbackAudio.pause();
    }
    
    // Stop frame-based playback
    if (this.playbackFrameId) {
      cancelAnimationFrame(this.playbackFrameId);
      this.playbackFrameId = null;
    }
    
    this.updateButtonStates();
    console.log('Playback paused at:', this.playbackPauseTime, 'ms');
  }

  resumePlayback() {
    if (this.recordingState !== 'paused') return;
    
    this.recordingState = 'playing';
    this.playbackStartTime = Date.now() - this.playbackPauseTime;
    
    // Resume audio
    if (this.playbackAudio) {
      this.playbackAudio.play();
    }
    
    // Resume frame-based playback
    this.startSmoothPlayback();
    
    this.updateButtonStates();
    console.log('Playback resumed');
  }

  stopPlayback() {
    this.recordingState = 'stopped';
    this.playbackPauseTime = 0;
    this.currentStateIndex = 0;
    
    // Stop audio
    if (this.playbackAudio) {
      this.playbackAudio.pause();
      this.playbackAudio.currentTime = 0;
    }
    
    // Stop frame-based playback
    if (this.playbackFrameId) {
      cancelAnimationFrame(this.playbackFrameId);
      this.playbackFrameId = null;
    }
    
    this.updateButtonStates();
    console.log('Playback stopped');
  }

  updateButtonStates() {
    const btnRecord = document.getElementById('btnRecord');
    const btnStop = document.getElementById('btnStop');
    const btnPlay = document.getElementById('btnPlay');
    const btnPause = document.getElementById('btnPause');

    // Reset all states
    [btnRecord, btnStop, btnPlay, btnPause].forEach(btn => {
      if (btn) btn.disabled = false;
    });

    switch (this.recordingState) {
      case 'idle':
        if (btnStop) btnStop.disabled = true;
        if (btnPlay) btnPlay.disabled = true;
        if (btnPause) btnPause.disabled = true;
        break;
        
      case 'recording':
        if (btnRecord) btnRecord.disabled = true;
        if (btnPlay) btnPlay.disabled = true;
        if (btnPause) btnPause.disabled = true;
        break;
        
      case 'processing':
        if (btnRecord) btnRecord.disabled = true;
        if (btnStop) btnStop.disabled = true;
        if (btnPlay) btnPlay.disabled = true;
        if (btnPause) btnPause.disabled = true;
        break;
        
      case 'stopped':
        if (btnStop) btnStop.disabled = true;
        if (btnPause) btnPause.disabled = true;
        if (btnPlay) btnPlay.disabled = !this.currentRecording.audio && !this.currentRecording.states.length;
        break;
        
      case 'playing':
        if (btnRecord) btnRecord.disabled = true;
        if (btnPlay) btnPlay.disabled = true;
        if (btnStop) btnStop.disabled = false;
        if (btnPause) btnPause.disabled = false;
        break;
        
      case 'paused':
        if (btnRecord) btnRecord.disabled = true;
        if (btnPlay) {
          btnPlay.textContent = 'Resume';
          btnPlay.onclick = () => this.resumePlayback();
          btnPlay.disabled = false;
        }
        if (btnStop) btnStop.disabled = false;
        if (btnPause) btnPause.disabled = true;
        break;
    }
    
    // Update play button text
    if (btnPlay && this.recordingState !== 'paused') {
      btnPlay.textContent = 'Play';
      btnPlay.onclick = () => this.playRecording();
    }
  }

  saveRecording(name = 'recording') {
    const data = JSON.stringify(this.currentRecording);
    localStorage.setItem(`recording_${name}`, data);
    console.log(`Recording saved as: recording_${name}`);
  }

  loadRecording(name) {
    const data = localStorage.getItem(`recording_${name}`);
    if (data) {
      this.currentRecording = JSON.parse(data);
      this.recordingState = 'stopped';
      this.updateButtonStates();
      console.log(`Recording loaded: recording_${name}`);
    }
  }

  async restoreAnimationState(animationState) {
    if (!this.viewer3D || !animationState) return;
    
    // Select animation if there's one specified
    if (animationState.selectedAnimation) {
      await this.selectAnimationByName(animationState.selectedAnimation);
    }
    
    // Restore animation playback state
    if (this.viewer3D.animationSystem && animationState.selectedAnimation) {
      // Set animation time
      if (typeof animationState.time === 'number') {
        this.viewer3D.animationSystem.setAnimationTime(animationState.time);
      }
      
      // Set animation speed
      if (typeof animationState.speed === 'number') {
        this.viewer3D.animationSystem.setAnimationSpeed(animationState.speed);
        this.updateUIControl('animationSpeed', animationState.speed);
      }
      
      // Set play/pause state
      if (animationState.isPlaying) {
        this.viewer3D.animationSystem.playAnimation?.();
      } else if (animationState.isPaused) {
        this.viewer3D.animationSystem.pauseAnimation?.();
      } else {
        // Stopped
        this.viewer3D.animationSystem.stopAnimation?.();
      }
      
      // Update animation UI
      this.viewer3D.animationSystem.updateAnimationButtons?.();
    }
  }

  async selectAnimationByName(animationName) {
    if (!this.viewer3D || !animationName) return;
    
    // Update the animation select dropdown
    const animationSelect = document.getElementById('animationSelect');
    if (animationSelect) {
      animationSelect.value = animationName;
    }
    
    // Call the actual select method (but avoid triggering our override)
    if (this.viewer3D.animationSystem) {
      // Temporarily disable recording to avoid recursive calls
      const wasRecording = this.recordingState === 'recording';
      if (wasRecording) {
        this.recordingState = 'playback';
      }
      
      this.viewer3D.animationSystem.selectAnimation(animationName);
      
      if (wasRecording) {
        this.recordingState = 'recording';
      }
    }
  }

  restoreObjectVisibility(visibilityState) {
    if (!this.viewer3D?.parts || !visibilityState) return;
    
    // Restore visibility for each part
    this.viewer3D.parts.forEach((part, index) => {
      const partName = part.name || `part_${index}`;
      if (partName in visibilityState) {
        part.visible = visibilityState[partName];
      }
    });
  }

  findPartByName(partName) {
    if (!this.viewer3D?.parts || !partName) return null;
    
    return this.viewer3D.parts.find(part => part.name === partName) || null;
  }
} 