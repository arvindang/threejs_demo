/**
 * StateManager - Manages model state, UI state, and synchronization
 */
export class StateManager {
  constructor() {
    // Model state
    this.model = null;
    this.parts = [];
    this.currentlyFocusedPart = null;
    
    // UI/Effect state
    this.params = {
      explode: 0,
      slice: 1,
      sliceDirection: 'y',
      xray: 1
    };
    
    // Camera state (managed by CameraSystem but tracked here)
    this.cameraState = {
      position: null,
      target: null,
      focusedPart: null
    };
    
    // Tool state
    this.currentTool = 'arrow';
    
    // State change callbacks
    this.callbacks = {
      onModelStateChange: null,
      onUIStateChange: null,
      onCameraStateChange: null,
      onToolStateChange: null
    };
    
    // State history for undo/redo functionality
    this.stateHistory = [];
    this.currentStateIndex = -1;
    this.maxHistorySize = 50;
  }

  /**
   * Update model state
   */
  updateModelState(model, parts, focusedPart = null) {
    const previousState = this.getModelState();
    
    this.model = model;
    this.parts = parts || [];
    this.currentlyFocusedPart = focusedPart;
    
    const newState = this.getModelState();
    
    // Notify if state changed
    if (this.hasModelStateChanged(previousState, newState)) {
      if (this.callbacks.onModelStateChange) {
        this.callbacks.onModelStateChange(newState, previousState);
      }
    }
  }

  /**
   * Update UI parameters state
   */
  updateUIState(newParams) {
    const previousState = { ...this.params };
    
    // Merge new params with existing ones
    this.params = { ...this.params, ...newParams };
    
    // Notify if state changed
    if (this.hasUIStateChanged(previousState, this.params)) {
      if (this.callbacks.onUIStateChange) {
        this.callbacks.onUIStateChange(this.params, previousState);
      }
    }
  }

  /**
   * Update camera state
   */
  updateCameraState(position, target, focusedPart = null) {
    const previousState = { ...this.cameraState };
    
    this.cameraState = {
      position: position ? position.clone() : null,
      target: target ? target.clone() : null,
      focusedPart: focusedPart
    };
    
    // Notify if state changed
    if (this.hasCameraStateChanged(previousState, this.cameraState)) {
      if (this.callbacks.onCameraStateChange) {
        this.callbacks.onCameraStateChange(this.cameraState, previousState);
      }
    }
  }

  /**
   * Update current tool
   */
  updateToolState(toolType) {
    const previousTool = this.currentTool;
    this.currentTool = toolType;
    
    if (previousTool !== toolType) {
      if (this.callbacks.onToolStateChange) {
        this.callbacks.onToolStateChange(toolType, previousTool);
      }
    }
  }

  /**
   * Get current model state
   */
  getModelState() {
    return {
      hasModel: this.model !== null,
      modelName: this.model ? this.model.name : null,
      partCount: this.parts.length,
      focusedPart: this.currentlyFocusedPart ? this.currentlyFocusedPart.name : null,
      focusedPartUuid: this.currentlyFocusedPart ? this.currentlyFocusedPart.uuid : null
    };
  }

  /**
   * Get current UI state
   */
  getUIState() {
    return { ...this.params };
  }

  /**
   * Get current camera state
   */
  getCameraState() {
    return {
      position: this.cameraState.position ? this.cameraState.position.clone() : null,
      target: this.cameraState.target ? this.cameraState.target.clone() : null,
      focusedPart: this.cameraState.focusedPart
    };
  }

  /**
   * Get current tool state
   */
  getToolState() {
    return this.currentTool;
  }

  /**
   * Get complete application state
   */
  getCompleteState() {
    return {
      model: this.getModelState(),
      ui: this.getUIState(),
      camera: this.getCameraState(),
      tool: this.getToolState(),
      timestamp: Date.now()
    };
  }

  /**
   * Set complete application state (useful for state restoration)
   */
  setCompleteState(state) {
    if (state.ui) {
      this.params = { ...state.ui };
    }
    if (state.camera) {
      this.cameraState = {
        position: state.camera.position ? state.camera.position.clone() : null,
        target: state.camera.target ? state.camera.target.clone() : null,
        focusedPart: state.camera.focusedPart
      };
    }
    if (state.tool) {
      this.currentTool = state.tool;
    }
  }

  /**
   * Save current state to history (for undo/redo)
   */
  saveStateToHistory() {
    const currentState = this.getCompleteState();
    
    // Remove any states after current index (when adding new state after undo)
    this.stateHistory = this.stateHistory.slice(0, this.currentStateIndex + 1);
    
    // Add new state
    this.stateHistory.push(currentState);
    this.currentStateIndex = this.stateHistory.length - 1;
    
    // Maintain history size limit
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
      this.currentStateIndex--;
    }
  }

  /**
   * Undo to previous state
   */
  undo() {
    if (this.currentStateIndex > 0) {
      this.currentStateIndex--;
      const state = this.stateHistory[this.currentStateIndex];
      this.setCompleteState(state);
      return state;
    }
    return null;
  }

  /**
   * Redo to next state
   */
  redo() {
    if (this.currentStateIndex < this.stateHistory.length - 1) {
      this.currentStateIndex++;
      const state = this.stateHistory[this.currentStateIndex];
      this.setCompleteState(state);
      return state;
    }
    return null;
  }

  /**
   * Check if undo is available
   */
  canUndo() {
    return this.currentStateIndex > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo() {
    return this.currentStateIndex < this.stateHistory.length - 1;
  }

  /**
   * Reset all state to defaults
   */
  resetToDefaults() {
    this.params = {
      explode: 0,
      slice: 1,
      sliceDirection: 'y',
      xray: 1
    };
    
    this.currentTool = 'arrow';
    this.currentlyFocusedPart = null;
    
    // Don't reset model state or camera state as they should be managed externally
  }

  /**
   * Get state for recording system
   */
  getRecordingState() {
    return {
      explode: this.params.explode,
      slice: this.params.slice,
      sliceDirection: this.params.sliceDirection,
      xray: this.params.xray,
      tool: this.currentTool,
      focusedPart: this.currentlyFocusedPart ? this.currentlyFocusedPart.name : null,
      timestamp: Date.now()
    };
  }

  /**
   * Set state from recording playback
   */
  setRecordingState(state) {
    this.updateUIState({
      explode: state.explode,
      slice: state.slice,
      sliceDirection: state.sliceDirection,
      xray: state.xray
    });
    
    this.updateToolState(state.tool);
    
    // Note: focusedPart should be handled by the system that manages part focus
  }

  /**
   * Check if model state has changed
   */
  hasModelStateChanged(oldState, newState) {
    return oldState.hasModel !== newState.hasModel ||
           oldState.modelName !== newState.modelName ||
           oldState.partCount !== newState.partCount ||
           oldState.focusedPartUuid !== newState.focusedPartUuid;
  }

  /**
   * Check if UI state has changed
   */
  hasUIStateChanged(oldState, newState) {
    return Object.keys(newState).some(key => oldState[key] !== newState[key]);
  }

  /**
   * Check if camera state has changed
   */
  hasCameraStateChanged(oldState, newState) {
    const positionChanged = (!oldState.position && newState.position) ||
                          (oldState.position && !newState.position) ||
                          (oldState.position && newState.position && 
                           !oldState.position.equals(newState.position));
    
    const targetChanged = (!oldState.target && newState.target) ||
                        (oldState.target && !newState.target) ||
                        (oldState.target && newState.target && 
                         !oldState.target.equals(newState.target));
    
    const focusChanged = oldState.focusedPart !== newState.focusedPart;
    
    return positionChanged || targetChanged || focusChanged;
  }

  /**
   * Set state change callbacks
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Clear all state
   */
  clearState() {
    this.model = null;
    this.parts = [];
    this.currentlyFocusedPart = null;
    this.cameraState = { position: null, target: null, focusedPart: null };
    this.resetToDefaults();
    this.stateHistory = [];
    this.currentStateIndex = -1;
  }
} 