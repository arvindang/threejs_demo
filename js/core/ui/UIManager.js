import { KeyboardManager } from './KeyboardManager.js';
import { ToolManager } from './ToolManager.js';
import { ControlsManager } from './ControlsManager.js';

export class UIManager {
  constructor() {
    // Initialize UI subsystems
    this.keyboardManager = new KeyboardManager();
    this.toolManager = new ToolManager();
    this.controlsManager = new ControlsManager();
    
    // Callbacks from the main Viewer3D
    this.callbacks = {
      // Effects callbacks
      onExplodeChange: null,
      onSliceChange: null,
      onSliceDirectionChange: null,
      onXrayChange: null,
      
      // Animation callbacks
      onAnimationSelect: null,
      onAnimationPlay: null,
      onAnimationPause: null,
      onAnimationStop: null,
      onAnimationSpeedChange: null,
      onUpdateAnimationUI: null,
      
      // Navigation callbacks
      onBackButton: null,
      onReset: null,
      
      // Tool callbacks
      onToolActivated: null
    };
    
    this.setupConnections();
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  setupConnections() {
    // Connect keyboard manager
    this.keyboardManager.setCallbacks({
      onToolActivate: (toolType) => {
        this.toolManager.activateTool(toolType);
      },
      onPercentageSet: (percentage) => {
        this.handlePercentageShortcut(percentage);
      },
      onShowHelp: () => {
        // Help is already shown by keyboard manager
      }
    });

    // Connect tool manager
    this.toolManager.setCallbacks({
      onToolActivated: (toolType) => {
        this.callbacks.onToolActivated?.(toolType);
      },
      onReset: () => {
        this.callbacks.onReset?.();
        this.controlsManager.resetAllControls();
      },
      onShowHelp: () => {
        this.keyboardManager.showKeyboardShortcutsHelp();
      },
      onUpdateAnimationUI: () => {
        this.callbacks.onUpdateAnimationUI?.();
      }
    });

    // Connect controls manager
    this.controlsManager.setCallbacks({
      onExplodeChange: (value) => {
        this.callbacks.onExplodeChange?.(value);
      },
      onSliceChange: (value) => {
        this.callbacks.onSliceChange?.(value);
      },
      onSliceDirectionChange: (direction) => {
        this.callbacks.onSliceDirectionChange?.(direction);
      },
      onXrayChange: (value) => {
        this.callbacks.onXrayChange?.(value);
      },
      onAnimationSelect: (animationName) => {
        this.callbacks.onAnimationSelect?.(animationName);
      },
      onAnimationPlay: () => {
        this.callbacks.onAnimationPlay?.();
      },
      onAnimationPause: () => {
        this.callbacks.onAnimationPause?.();
      },
      onAnimationStop: () => {
        this.callbacks.onAnimationStop?.();
      },
      onAnimationSpeedChange: (speed) => {
        this.callbacks.onAnimationSpeedChange?.(speed);
      },
      onBackButton: () => {
        this.callbacks.onBackButton?.();
      }
    });
  }

  handlePercentageShortcut(percentage) {
    const currentTool = this.toolManager.getCurrentTool();
    
    // Apply percentage based on current tool
    switch (currentTool) {
      case 'explode':
        this.callbacks.onExplodeChange?.(percentage);
        this.controlsManager.updateExplodeSlider(percentage);
        break;
        
      case 'slice':
        this.callbacks.onSliceChange?.(percentage);
        this.controlsManager.updateSliceSlider(percentage);
        break;
        
      case 'xray':
        this.callbacks.onXrayChange?.(percentage);
        this.controlsManager.updateXraySlider(percentage);
        break;
    }
  }

  // Public interface methods
  getCurrentTool() {
    return this.toolManager.getCurrentTool();
  }

  activateTool(toolType) {
    this.toolManager.activateTool(toolType);
  }

  updateControlValues(values) {
    if (values.explode !== undefined) {
      this.controlsManager.updateExplodeSlider(values.explode);
    }
    if (values.slice !== undefined) {
      this.controlsManager.updateSliceSlider(values.slice);
    }
    if (values.xray !== undefined) {
      this.controlsManager.updateXraySlider(values.xray);
    }
    if (values.sliceDirection !== undefined) {
      this.controlsManager.updateSliceDirection(values.sliceDirection);
    }
  }

  resetControls() {
    this.controlsManager.resetAllControls();
  }

  // Expose subsystem references if needed
  getKeyboardManager() {
    return this.keyboardManager;
  }

  getToolManager() {
    return this.toolManager;
  }

  getControlsManager() {
    return this.controlsManager;
  }
} 