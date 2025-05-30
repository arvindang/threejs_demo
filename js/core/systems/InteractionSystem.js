import * as THREE from 'https://unpkg.com/three@0.164.0/build/three.module.js';
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";

/**
 * InteractionSystem - Handles mouse interactions, raycasting, and part selection
 */
export class InteractionSystem {
  constructor(camera, renderer, controls) {
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;
    
    // References to model and parts (updated externally)
    this.model = null;
    this.parts = [];
    
    // Camera system reference (set externally)
    this.cameraSystem = null;
    
    // Interaction state
    this.isMouseDown = false;
    this.mouseDownTime = 0;
    this.hasMouseMoved = false;
    this.hoveredMesh = null;
    
    // Raycasting
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // Callbacks
    this.onPartSelected = null;
    this.onPartFocused = null;
    this.onBackToFullView = null;
    
    this.setupEventListeners();
  }

  /**
   * Set reference to camera system
   */
  setCameraSystem(cameraSystem) {
    this.cameraSystem = cameraSystem;
  }

  setupEventListeners() {
    // Bind methods to preserve context
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mouseleave', this.onMouseLeave);
  }

  onMouseDown(event) {
    this.isMouseDown = true;
    this.mouseDownTime = Date.now();
    this.hasMouseMoved = false;
  }

  onMouseUp(event) {
    if (this.isMouseDown) {
      const timeSinceMouseDown = Date.now() - this.mouseDownTime;
      // Only trigger click if mouse hasn't moved much and it was a quick click (not a drag)
      if (!this.hasMouseMoved && timeSinceMouseDown < 200) {
        this.handleClick(event);
      }
    }
    this.isMouseDown = false;
    this.hasMouseMoved = false;
  }

  onMouseMove(event) {
    // Update mouse position for raycasting
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // If mouse is down and has moved, mark as dragging
    if (this.isMouseDown) {
      this.hasMouseMoved = true;
    }

    // Handle hover effects
    if (!this.isMouseDown && this.parts.length > 0) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.parts, true);
      
      if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object;
        this.setHover(intersectedMesh);
      } else {
        this.clearHover();
      }
    }
  }

  onMouseLeave() {
    this.clearHover();
  }

  setHover(mesh) {
    // Clear previous hover
    this.clearHover();
    
    this.hoveredMesh = mesh;
    
    // Add hover effect - change cursor and potentially material
    this.renderer.domElement.style.cursor = 'pointer';
    
    // Optional: Add visual hover effect (like outline or color change)
    if (mesh.material) {
      if (!mesh.userData.originalEmissive) {
        mesh.userData.originalEmissive = mesh.material.emissive ? mesh.material.emissive.clone() : new THREE.Color(0x000000);
      }
      if (mesh.material.emissive) {
        mesh.material.emissive.setHex(0x444444); // Slight glow on hover
      }
    }
  }

  clearHover() {
    if (this.hoveredMesh) {
      // Restore original cursor
      this.renderer.domElement.style.cursor = 'default';
      
      // Restore original material properties
      if (this.hoveredMesh.material && this.hoveredMesh.userData.originalEmissive) {
        if (this.hoveredMesh.material.emissive) {
          this.hoveredMesh.material.emissive.copy(this.hoveredMesh.userData.originalEmissive);
        }
      }
      
      this.hoveredMesh = null;
    }
  }

  handleClick(event) {
    if (this.parts.length === 0) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.parts, true);

    if (intersects.length > 0) {
      const selectedMesh = intersects[0].object;
      console.log('Selected mesh:', selectedMesh.name || 'Unnamed');
      
      // Notify owner about selection
      if (this.onPartSelected) {
        this.onPartSelected(selectedMesh);
      }
      
      // Focus on the selected part using camera system
      this.focusOnPart(selectedMesh);
    }
  }

  /**
   * Focus on a specific part (now delegates to CameraSystem)
   */
  focusOnPart(selectedMesh) {
    console.log('Focusing on part:', selectedMesh.name);
    
    // Hide all other parts
    this.parts.forEach(part => {
      if (part !== selectedMesh) {
        part.visible = false;
      }
    });
    
    // Show only the selected part
    selectedMesh.visible = true;
    
    // Use camera system for camera positioning
    if (this.cameraSystem) {
      this.cameraSystem.focusOnPart(selectedMesh);
    }
    
    // Show back button
    const backButton = document.getElementById('backButtonOverlay');
    if (backButton) {
      backButton.classList.add('visible');
    }
    
    // Notify owner about focus
    if (this.onPartFocused) {
      this.onPartFocused(selectedMesh);
    }
  }

  /**
   * Go back to full view showing all parts (now delegates to CameraSystem)
   */
  goBackToFullView(animate = true) {
    if (!this.model) return;
    
    console.log('Going back to full view');
    
    // Show all parts
    this.parts.forEach(part => {
      part.visible = true;
    });
    
    // Use camera system for camera positioning
    if (this.cameraSystem) {
      this.cameraSystem.goBackToFullView(animate);
    } else {
      // Fallback: notify owner to fit model to pane
      if (this.onBackToFullView) {
        this.onBackToFullView();
      }
    }
    
    // Hide back button
    const backButton = document.getElementById('backButtonOverlay');
    if (backButton) {
      backButton.classList.remove('visible');
    }
  }

  /**
   * Focus on a part by name
   */
  focusOnPartByName(objectName) {
    // Find the mesh by name and focus on it
    const targetMesh = this.parts.find(part => part.name === objectName);
    if (targetMesh) {
      this.focusOnPart(targetMesh);
      return true;
    } else {
      console.warn('Could not find part with name:', objectName);
      return false;
    }
  }

  /**
   * Update references to parts and model (called when model changes)
   */
  updateModelReferences(model, parts) {
    this.model = model;
    this.parts = parts;
    
    // Clear any existing hover state when model changes
    this.clearHover();
  }

  /**
   * Set callbacks for interaction events
   */
  setCallbacks({ onPartSelected, onPartFocused, onBackToFullView }) {
    this.onPartSelected = onPartSelected;
    this.onPartFocused = onPartFocused;
    this.onBackToFullView = onBackToFullView;
  }

  /**
   * Get the currently focused part (delegates to CameraSystem)
   */
  getCurrentlyFocusedPart() {
    return this.cameraSystem ? this.cameraSystem.getCurrentlyFocusedPart() : null;
  }

  /**
   * Check if any part is currently focused (delegates to CameraSystem)
   */
  isPartFocused() {
    return this.cameraSystem ? this.cameraSystem.isPartFocused() : false;
  }

  /**
   * Clean up event listeners
   */
  dispose() {
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.removeEventListener('mouseleave', this.onMouseLeave);
  }
} 