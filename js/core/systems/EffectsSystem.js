import * as THREE from 'https://unpkg.com/three@0.164.0/build/three.module.js';
import { MathUtils } from '../utils/MathUtils.js';

export class EffectsSystem {
  constructor(renderingSystem) {
    this.renderingSystem = renderingSystem;
    
    // Get reference to clip plane from rendering system
    this.clipPlane = renderingSystem.getClipPlane();
    
    // Effects state
    this.sliceDirection = 'y'; // Default to Y-axis slicing
    this.explodeAmount = 0;
    this.sliceAmount = 1;
    this.xrayAmount = 1; // 1 = fully opaque, 0 = fully transparent
    
    // Model references (will be updated when model changes)
    this.model = null;
    this.parts = [];
    this.modelLoader = null;
    
    // X-ray system
    this.originalMaterialOpacity = new Map();
    this.isXrayMode = false;
  }

  // Update model references when model changes
  updateModelReferences(model, parts, modelLoader) {
    this.model = model;
    this.parts = parts || [];
    this.modelLoader = modelLoader;
    
    // Clear x-ray mode when model changes
    this.originalMaterialOpacity.clear();
    this.isXrayMode = false;
  }

  // Clear model references
  clearModel() {
    this.model = null;
    this.parts = [];
    this.modelLoader = null;
    
    // Clear x-ray mode
    this.originalMaterialOpacity.clear();
    this.isXrayMode = false;
  }

  updateSliceDirection() {
    // Update the clipping plane normal vector based on selected direction
    this.clipPlane.normal.copy(MathUtils.getSliceNormal(this.sliceDirection));
    
    console.log(`Slice direction changed to: ${this.sliceDirection.toUpperCase()}-axis`);
  }

  setSliceDirection(direction) {
    this.sliceDirection = direction;
    this.updateSliceDirection();
  }

  updateSlice() {
    if (!this.model) {
      this.clipPlane.constant = 1000; // Show everything when no model
      return;
    }

    // Calculate model bounds to determine clipping range
    const box = this.modelLoader.getModelBounds();
    if (!box) return;
    
    // Use MathUtils to calculate slice position
    this.clipPlane.constant = MathUtils.calculateSlicePosition(box, this.sliceDirection, this.sliceAmount);

    console.log(`Slice ${this.sliceDirection}-axis: ${this.sliceAmount.toFixed(2)} (position: ${this.clipPlane.constant.toFixed(2)})`);
  }

  setSliceAmount(amount) {
    this.sliceAmount = amount;
    this.updateSlice();
  }

  calculateExplosionDirections() {
    if (!this.model || this.parts.length === 0) return;

    // Use MathUtils for explosion direction calculation
    MathUtils.calculateExplosionDirections(this.model, this.parts);
  }

  explode(factor) {
    if (!this.model) return;
    
    // Reset all parts to their original positions first
    this.parts.forEach((part) => {
      part.position.copy(part.userData.origin);
    });
    
    if (factor === 0) return; // No explosion needed
    
    // Calculate model bounds for scale reference
    const box = this.modelLoader.getModelBounds();
    if (!box) return;
    
    const modelSize = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // Apply explosion using MathUtils for offset calculation
    this.parts.forEach((part) => {
      if (!part.userData.explosionDirection) return;
      
      // Use MathUtils to calculate explosion offset
      const explosionOffset = MathUtils.calculateExplosionOffset(part, center, maxDimension, factor);
      part.position.copy(part.userData.origin).add(explosionOffset);
    });
  }

  setExplodeAmount(amount) {
    this.explodeAmount = amount;
    this.explode(amount);
  }

  setXrayMode(transparency) {
    if (!this.model) return;
    
    // Update the xray amount to track current value
    this.xrayAmount = transparency;
    
    this.parts.forEach(part => {
      if (part.material) {
        // Store original opacity if not already stored
        if (!this.originalMaterialOpacity.has(part)) {
          this.originalMaterialOpacity.set(part, part.material.opacity || 1.0);
        }
        
        if (transparency < 1.0) {
          // Enable x-ray mode - transparency is now the actual opacity value
          part.material.transparent = true;
          part.material.opacity = transparency;
          this.isXrayMode = true;
        } else {
          // Disable x-ray mode - restore original opacity when at 100%
          const originalOpacity = this.originalMaterialOpacity.get(part);
          part.material.opacity = originalOpacity;
          part.material.transparent = originalOpacity < 1.0;
          this.isXrayMode = false;
        }
        
        part.material.needsUpdate = true;
      }
    });
    
    console.log('X-ray mode:', transparency < 1.0 ? `opacity: ${transparency.toFixed(2)}` : 'disabled');
  }

  setXRayAmount(amount) {
    this.setXrayMode(amount);
  }

  resetEffects() {
    // Reset all effect values
    this.explodeAmount = 0;
    this.sliceAmount = 1;
    this.xrayAmount = 1;
    
    // Apply reset values
    this.explode(0);
    this.updateSlice();
    this.setXrayMode(1); // 1 = fully opaque
    
    console.log('Effects reset to default state');
  }

  // Getter methods for current state
  get currentExplodeAmount() {
    return this.explodeAmount;
  }

  get currentSliceAmount() {
    return this.sliceAmount;
  }

  get currentXrayAmount() {
    return this.xrayAmount;
  }

  get currentSliceDirection() {
    return this.sliceDirection;
  }
} 