import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";

/**
 * CameraSystem - Handles camera movement, focus, and positioning
 */
export class CameraSystem {
  constructor(camera, controls, container) {
    this.camera = camera;
    this.controls = controls;
    this.container = container;
    
    // Camera state management
    this.previousCameraState = { position: null, target: null };
    this.currentlyFocusedPart = null;
    
    // References to model and parts (updated externally)
    this.model = null;
    this.parts = [];
    
    // Callbacks
    this.onCameraStateChanged = null;
  }

  /**
   * Fit the current model to the camera view
   */
  fitModelToPane(model = null) {
    const targetModel = model || this.model;
    if (!targetModel) return;

    // Update camera aspect ratio from container before fitting
    const containerRect = this.container.getBoundingClientRect();
    const aspect = containerRect.width / containerRect.height;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    // Calculate the bounding box of the model
    const box = new THREE.Box3().setFromObject(targetModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Debug: Check if model is centered at origin
    const modelCenter = center.clone();
    const isOffCenter = modelCenter.length() > 0.1; // Check if center is more than 0.1 units from origin
    
    if (isOffCenter) {
      console.log('Model is off-center from origin:', modelCenter);
    }

    console.log('Model bounds info:', {
      min: box.min,
      max: box.max,
      center: center,
      size: size,
      isOffCenter: isOffCenter
    });

    // Calculate distance needed to fit object in view
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let distance = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
    
    // Add padding (60% extra distance for better framing)
    distance *= 1.6;
    
    // Ensure minimum distance to prevent being too close
    distance = Math.max(distance, maxDim * 2.5);

    // Use a better camera positioning approach
    // Position camera at an optimal viewing angle
    const direction = new THREE.Vector3(1, 0.8, 1).normalize();
    this.camera.position.copy(center).add(direction.multiplyScalar(distance));
    
    // Point camera at the center of the model
    this.camera.lookAt(center);
    
    // Update controls to focus on the model center
    this.controls.target.copy(center);
    this.controls.update();

    console.log('Model fitted to pane:', {
      containerSize: { width: containerRect.width, height: containerRect.height },
      center: center,
      size: size,
      maxDimension: maxDim,
      cameraDistance: distance,
      cameraPosition: this.camera.position,
      cameraTarget: this.controls.target
    });

    // Notify about camera state change
    if (this.onCameraStateChanged) {
      this.onCameraStateChanged({
        type: 'fit_to_pane',
        position: this.camera.position.clone(),
        target: this.controls.target.clone()
      });
    }
  }

  /**
   * Focus camera on a specific part
   */
  focusOnPart(selectedMesh) {
    console.log('Focusing camera on part:', selectedMesh.name);
    
    // Store the previous camera state for back navigation
    this.previousCameraState = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone()
    };
    
    this.currentlyFocusedPart = selectedMesh;
    
    // Calculate bounding box of the selected part
    const box = new THREE.Box3().setFromObject(selectedMesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // Calculate optimal camera position
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let distance = maxDim / (2 * Math.tan(fov / 2));
    distance *= 2; // Add some padding
    distance = Math.max(distance, maxDim * 2); // Ensure minimum distance
    
    // Choose a good viewing angle (45 degrees from each axis)
    const direction = new THREE.Vector3(1, 1, 1).normalize();
    const newPosition = center.clone().add(direction.multiplyScalar(distance));
    
    // Animate camera to new position
    gsap.to(this.camera.position, {
      duration: 1,
      x: newPosition.x,
      y: newPosition.y,
      z: newPosition.z,
      ease: "power2.inOut"
    });
    
    gsap.to(this.controls.target, {
      duration: 1,
      x: center.x,
      y: center.y,
      z: center.z,
      ease: "power2.inOut",
      onUpdate: () => {
        this.controls.update();
      }
    });
    
    console.log('Focused camera on part:', selectedMesh.name || 'Unnamed', 'at center:', center);

    // Notify about camera state change
    if (this.onCameraStateChanged) {
      this.onCameraStateChanged({
        type: 'focus_on_part',
        part: selectedMesh,
        position: newPosition,
        target: center
      });
    }
  }

  /**
   * Go back to full view from focused state
   */
  goBackToFullView(animate = true) {
    if (!this.model) return;
    
    console.log('Camera going back to full view');
    
    this.currentlyFocusedPart = null;
    
    if (animate && this.previousCameraState.position && this.previousCameraState.target) {
      // Animate back to previous camera state
      gsap.to(this.camera.position, {
        duration: 1,
        x: this.previousCameraState.position.x,
        y: this.previousCameraState.position.y,
        z: this.previousCameraState.position.z,
        ease: "power2.inOut"
      });
      
      gsap.to(this.controls.target, {
        duration: 1,
        x: this.previousCameraState.target.x,
        y: this.previousCameraState.target.y,
        z: this.previousCameraState.target.z,
        ease: "power2.inOut",
        onUpdate: () => {
          this.controls.update();
        }
      });
    } else {
      // Instantly fit model to pane
      this.fitModelToPane();
    }
    
    // Clear previous camera state
    this.previousCameraState = { position: null, target: null };

    // Notify about camera state change
    if (this.onCameraStateChanged) {
      this.onCameraStateChanged({
        type: 'back_to_full_view',
        animate: animate
      });
    }
  }

  /**
   * Update references to model and parts (called when model changes)
   */
  updateModelReferences(model, parts) {
    this.model = model;
    this.parts = parts;
    
    // Clear focus state when model changes
    this.currentlyFocusedPart = null;
    this.previousCameraState = { position: null, target: null };
  }

  /**
   * Get the currently focused part
   */
  getCurrentlyFocusedPart() {
    return this.currentlyFocusedPart;
  }

  /**
   * Check if any part is currently focused
   */
  isPartFocused() {
    return this.currentlyFocusedPart !== null;
  }

  /**
   * Get current camera state
   */
  getCameraState() {
    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      focusedPart: this.currentlyFocusedPart,
      hasPreviousState: this.previousCameraState.position !== null
    };
  }

  /**
   * Set camera state (useful for state restoration)
   */
  setCameraState(state, animate = false) {
    if (animate) {
      gsap.to(this.camera.position, {
        duration: 1,
        x: state.position.x,
        y: state.position.y,
        z: state.position.z,
        ease: "power2.inOut"
      });
      
      gsap.to(this.controls.target, {
        duration: 1,
        x: state.target.x,
        y: state.target.y,
        z: state.target.z,
        ease: "power2.inOut",
        onUpdate: () => {
          this.controls.update();
        }
      });
    } else {
      this.camera.position.copy(state.position);
      this.controls.target.copy(state.target);
      this.controls.update();
    }

    this.currentlyFocusedPart = state.focusedPart || null;
  }

  /**
   * Set callback for camera state changes
   */
  setCallback(onCameraStateChanged) {
    this.onCameraStateChanged = onCameraStateChanged;
  }
} 