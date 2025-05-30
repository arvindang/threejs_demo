import * as THREE from 'https://unpkg.com/three@0.164.0/build/three.module.js';

/**
 * AnimationSystem handles Three.js animation mixer, playback controls, and animation state management
 */
export class AnimationSystem {
  constructor(renderingSystem) {
    this.renderingSystem = renderingSystem;
    
    // Animation state
    this._mixer = null;
    this._animations = [];
    this._currentAction = null;
    this.model = null;
    
    // Callbacks for UI updates
    this.callbacks = {
      onAnimationUIUpdate: null,
      onAnimationButtonsUpdate: null
    };
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Model management
  updateModelReferences(model) {
    this.model = model;
  }

  clearModel() {
    // Clear animations
    if (this._mixer) {
      this._mixer.stopAllAction();
      this._mixer = null;
    }
    this._animations = [];
    this._currentAction = null;
    this.model = null;
    
    // Clear mixer from rendering system
    this.renderingSystem.setMixer(null);
  }

  // Animation setup
  setupAnimations(animations) {
    if (!this.model) {
      console.warn('No model available for animation setup');
      return;
    }

    this._animations = animations;
    this._mixer = new THREE.AnimationMixer(this.model);
    
    // Register mixer with rendering system so it gets updated in the render loop
    this.renderingSystem.setMixer(this._mixer);
    
    console.log('Setup animations:', animations.length, 'found');
    animations.forEach((clip, index) => {
      console.log(`Animation ${index}:`, clip.name, clip.duration + 's');
    });
    
    this.updateAnimationUI();
  }

  // Animation selection
  selectAnimation(animationName) {
    if (!this._mixer || !this._animations.length) return;
    
    // Stop current animation
    if (this._currentAction) {
      this._currentAction.stop();
    }
    
    // Find and setup new animation
    const clip = this._animations.find(anim => anim.name === animationName);
    if (clip) {
      this._currentAction = this._mixer.clipAction(clip);
      console.log('Selected animation:', animationName);
      this.updateAnimationButtons();
    }
  }

  // Playback controls
  playAnimation() {
    if (this._currentAction) {
      this._currentAction.play();
      console.log('Playing animation');
      this.updateAnimationButtons();
    }
  }

  pauseAnimation() {
    if (this._currentAction) {
      this._currentAction.paused = !this._currentAction.paused;
      console.log('Animation paused:', this._currentAction.paused);
      this.updateAnimationButtons();
    }
  }

  stopAnimation() {
    if (this._currentAction) {
      this._currentAction.stop();
      console.log('Animation stopped');
      this.updateAnimationButtons();
    }
  }

  setAnimationSpeed(speed) {
    if (this._currentAction) {
      this._currentAction.setEffectiveTimeScale(speed);
      console.log('Animation speed set to:', speed);
    }
  }

  // UI management
  updateAnimationUI() {
    const animationSelect = document.getElementById('animationSelect');
    if (!animationSelect) return;
    
    animationSelect.innerHTML = '<option value="">Select Animation</option>';
    
    this._animations.forEach(anim => {
      const option = document.createElement('option');
      option.value = anim.name;
      option.textContent = anim.name;
      animationSelect.appendChild(option);
    });
    
    this.updateAnimationButtons();
    
    // Notify callback
    this.callbacks.onAnimationUIUpdate?.();
  }

  updateAnimationButtons() {
    const playBtn = document.getElementById('animationPlay');
    const pauseBtn = document.getElementById('animationPause');
    const stopBtn = document.getElementById('animationStop');
    
    const hasAnimation = !!this._currentAction;
    const isPlaying = hasAnimation && this._currentAction.isRunning() && !this._currentAction.paused;
    const isPaused = hasAnimation && this._currentAction.paused;
    
    if (playBtn) playBtn.disabled = !hasAnimation || isPlaying;
    if (pauseBtn) pauseBtn.disabled = !hasAnimation || (!isPlaying && !isPaused);
    if (stopBtn) stopBtn.disabled = !hasAnimation || (!isPlaying && !isPaused);
    
    // Notify callback
    this.callbacks.onAnimationButtonsUpdate?.();
  }

  // State getters for external systems (like recording)
  getCurrentAnimationName() {
    if (!this._currentAction) return null;
    
    // Find the animation name from the current action
    for (const anim of this._animations) {
      const action = this._mixer?.clipAction(anim);
      if (action === this._currentAction) {
        return anim.name;
      }
    }
    return null;
  }

  getAnimationPlayingState() {
    if (!this._currentAction) return false;
    return this._currentAction.isRunning() && !this._currentAction.paused;
  }

  getAnimationPausedState() {
    if (!this._currentAction) return false;
    return this._currentAction.paused;
  }

  getAnimationSpeed() {
    if (!this._currentAction) return 1.0;
    return this._currentAction.getEffectiveTimeScale();
  }

  getAnimationTime() {
    if (!this._currentAction) return 0;
    return this._currentAction.time;
  }

  hasAnimations() {
    return this._animations.length > 0;
  }

  hasCurrentAction() {
    return !!this._currentAction;
  }

  // Advanced animation control for recording system
  setAnimationTime(time) {
    if (this._currentAction) {
      this._currentAction.time = time;
    }
  }

  resetAnimationToStart() {
    if (this._currentAction) {
      this._currentAction.reset();
    }
  }

  // Public getters for compatibility
  get mixer() {
    return this._mixer;
  }

  get animations() {
    return this._animations;
  }

  get currentAction() {
    return this._currentAction;
  }
} 