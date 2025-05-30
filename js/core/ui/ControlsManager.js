export class ControlsManager {
  constructor() {
    this.callbacks = {
      onExplodeChange: null,
      onSliceChange: null,
      onSliceDirectionChange: null,
      onXrayChange: null,
      onAnimationSelect: null,
      onAnimationPlay: null,
      onAnimationPause: null,
      onAnimationStop: null,
      onAnimationSpeedChange: null,
      onBackButton: null
    };
    
    this.setupControls();
    this.initializeTooltips();
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  setupControls() {
    this.setupExplodeControls();
    this.setupSliceControls();
    this.setupAnimationControls();
    this.setupXrayControls();
    this.setupBackButton();
  }

  setupExplodeControls() {
    // Connect explode slider
    const explodeSlider = document.getElementById('explodeSlider');
    if (explodeSlider) {
      explodeSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.callbacks.onExplodeChange?.(value);
        // Update value display
        const explodeValue = document.getElementById('explodeValue');
        if (explodeValue) {
          explodeValue.textContent = Math.round(value * 100) + '%';
        }
      });
    }
  }

  setupSliceControls() {
    // Connect slice slider  
    const sliceSlider = document.getElementById('sliceSlider');
    if (sliceSlider) {
      sliceSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.callbacks.onSliceChange?.(value);
        // Update value display
        const sliceValue = document.getElementById('sliceValue');
        if (sliceValue) {
          sliceValue.textContent = Math.round(value * 100) + '%';
        }
      });
    }

    // Connect slice direction radio buttons
    const sliceDirectionInputs = document.querySelectorAll('input[name="sliceDirection"]');
    sliceDirectionInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.callbacks.onSliceDirectionChange?.(e.target.value);
        }
      });
    });
  }

  setupAnimationControls() {
    const animationSelect = document.getElementById('animationSelect');
    const animationPlay = document.getElementById('animationPlay');
    const animationPause = document.getElementById('animationPause');
    const animationStop = document.getElementById('animationStop');
    const animationSpeed = document.getElementById('animationSpeed');
    
    if (animationSelect) {
      animationSelect.addEventListener('change', (e) => {
        this.callbacks.onAnimationSelect?.(e.target.value);
      });
    }
    
    if (animationPlay) {
      animationPlay.addEventListener('click', () => {
        this.callbacks.onAnimationPlay?.();
      });
    }
    
    if (animationPause) {
      animationPause.addEventListener('click', () => {
        this.callbacks.onAnimationPause?.();
      });
    }
    
    if (animationStop) {
      animationStop.addEventListener('click', () => {
        this.callbacks.onAnimationStop?.();
      });
    }
    
    if (animationSpeed) {
      animationSpeed.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        this.callbacks.onAnimationSpeedChange?.(speed);
        const speedValue = document.getElementById('animationSpeedValue');
        if (speedValue) {
          speedValue.textContent = speed.toFixed(1) + 'x';
        }
      });
    }
  }

  setupXrayControls() {
    // Connect x-ray controls
    const xraySlider = document.getElementById('xraySlider');
    if (xraySlider) {
      xraySlider.addEventListener('input', (e) => {
        const transparencyPercentage = parseFloat(e.target.value);
        this.callbacks.onXrayChange?.(transparencyPercentage);
        const xrayValue = document.getElementById('xrayValue');
        if (xrayValue) {
          xrayValue.textContent = Math.round(transparencyPercentage * 100) + '%';
        }
      });
    }
  }

  setupBackButton() {
    // Connect back button
    const backBtn = document.getElementById('btnBack');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.callbacks.onBackButton?.();
      });
    }
  }

  initializeTooltips() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  // Methods to update UI controls programmatically
  updateExplodeSlider(value) {
    const explodeSlider = document.getElementById('explodeSlider');
    const explodeValue = document.getElementById('explodeValue');
    if (explodeSlider) explodeSlider.value = value;
    if (explodeValue) explodeValue.textContent = Math.round(value * 100) + '%';
  }

  updateSliceSlider(value) {
    const sliceSlider = document.getElementById('sliceSlider');
    const sliceValue = document.getElementById('sliceValue');
    if (sliceSlider) sliceSlider.value = value;
    if (sliceValue) sliceValue.textContent = Math.round(value * 100) + '%';
  }

  updateXraySlider(value) {
    const xraySlider = document.getElementById('xraySlider');
    const xrayValue = document.getElementById('xrayValue');
    if (xraySlider) xraySlider.value = value;
    if (xrayValue) xrayValue.textContent = Math.round(value * 100) + '%';
  }

  updateSliceDirection(direction) {
    const sliceDirectionInput = document.getElementById(`slice${direction.toUpperCase()}`);
    if (sliceDirectionInput) {
      sliceDirectionInput.checked = true;
    }
  }

  resetAllControls() {
    this.updateExplodeSlider(0);
    this.updateSliceSlider(1);
    this.updateXraySlider(1);
    this.updateSliceDirection('y');
    
    // Reset animation controls
    const animationSpeed = document.getElementById('animationSpeed');
    const animationSpeedValue = document.getElementById('animationSpeedValue');
    if (animationSpeed) animationSpeed.value = 1;
    if (animationSpeedValue) animationSpeedValue.textContent = '1.0x';
  }
} 