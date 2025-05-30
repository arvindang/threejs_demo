export class ToolManager {
  constructor() {
    this.currentTool = 'arrow';
    this.callbacks = {
      onToolActivated: null,
      onReset: null,
      onShowHelp: null,
      onUpdateAnimationUI: null
    };
    
    this.setupToolbar();
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  setupToolbar() {
    // Tool buttons
    const toolButtons = document.querySelectorAll('.toolbar-tool');
    toolButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const toolType = e.currentTarget.dataset.tool;
        this.activateTool(toolType);
      });
    });
  }

  activateTool(toolType) {
    // Update current tool
    this.currentTool = toolType;
    
    // Update UI
    document.querySelectorAll('.toolbar-tool').forEach(btn => {
      btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-tool="${toolType}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
    
    // Hide all tool controls first
    this.hideToolControls();
    
    // Get the tool controls panel
    const toolControlsPanel = document.getElementById('toolControlsPanel');
    
    // Show relevant controls for the tool
    switch (toolType) {
      case 'arrow':
        // Default selection tool - no additional controls needed
        if (toolControlsPanel) {
          toolControlsPanel.classList.add('d-none');
        }
        break;
      case 'explode':
        this.showToolControls('explodeControls');
        if (toolControlsPanel) {
          toolControlsPanel.classList.remove('d-none');
        }
        break;
      case 'slice':
        this.showToolControls('sliceControls');
        if (toolControlsPanel) {
          toolControlsPanel.classList.remove('d-none');
        }
        break;
      case 'xray':
        this.showToolControls('xrayControls');
        if (toolControlsPanel) {
          toolControlsPanel.classList.remove('d-none');
        }
        break;
      case 'animation':
        this.showToolControls('animationControls');
        this.callbacks.onUpdateAnimationUI?.(); // Update the animation dropdown
        if (toolControlsPanel) {
          toolControlsPanel.classList.remove('d-none');
        }
        break;
      case 'reset':
        // Reset tool should trigger reset and stay on arrow tool
        this.callbacks.onReset?.();
        // After reset, switch back to arrow tool
        this.activateTool('arrow');
        return; // Exit early to avoid double activation
      case '?':
      case '/':
        event.preventDefault();
        this.callbacks.onShowHelp?.();
        break;
      default:
        console.warn('Unknown tool type:', toolType);
    }
    
    // Notify callback about tool activation
    this.callbacks.onToolActivated?.(toolType);
  }

  showToolControls(controlsId) {
    const controls = document.getElementById(controlsId);
    if (controls) {
      controls.classList.remove('d-none');
    }
  }

  hideToolControls() {
    const allControls = [
      'explodeControls',
      'sliceControls', 
      'xrayControls',
      'animationControls'
    ];
    
    allControls.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.add('d-none');
      }
    });
  }

  getCurrentTool() {
    return this.currentTool;
  }

  setCurrentTool(toolType) {
    this.activateTool(toolType);
  }
} 