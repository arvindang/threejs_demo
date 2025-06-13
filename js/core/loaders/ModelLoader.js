import * as THREE from 'https://unpkg.com/three@0.164.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.164.0/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'https://unpkg.com/three@0.164.0/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'https://unpkg.com/three@0.164.0/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'https://unpkg.com/three@0.164.0/examples/jsm/loaders/PLYLoader.js';
import { STLLoader } from 'https://unpkg.com/three@0.164.0/examples/jsm/loaders/STLLoader.js';

/**
 * ModelLoader - Handles loading and management of 3D models
 */
export class ModelLoader {
  constructor(scene, camera, controls) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    
    // Model state
    this.model = null;
    this.parts = [];
    
    // Callbacks for events
    this.onModelLoaded = null;
    this.onModelCleared = null;
    this.onProgress = null;
    this.onError = null;
    
    // Reference to camera system (set externally)
    this.cameraSystem = null;
  }

  /**
   * Set reference to camera system
   */
  setCameraSystem(cameraSystem) {
    this.cameraSystem = cameraSystem;
  }

  /**
   * Load a GLB model from URL
   */
  loadModel(url, name) {
    console.log('Loading GLB model from:', url);
    
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        console.log('Model loaded successfully:', gltf);
        this.clearModel();
        
        this.model = gltf.scene;
        this.model.name = name || 'LoadedModel';
        
        this.scene.add(this.model);
        
        // Collect all mesh parts for interaction
        this.parts = [];
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // Store original local position relative to model (not world position)
            child.userData.origin = child.position.clone();
            this.parts.push(child);
          }
        });
        
        console.log('Found', this.parts.length, 'mesh parts');
        
        // Notify that model is loaded
        if (this.onModelLoaded) {
          this.onModelLoaded(gltf, this.model, this.parts);
        }
        
        // Use camera system for fitting if available
        if (this.cameraSystem) {
          this.cameraSystem.fitModelToPane(this.model);
        }
        
        this.hideEmptyState();
        console.log('Model loading completed');
      },
      (progress) => {
        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
        if (this.onProgress) {
          this.onProgress(progress);
        }
      },
      (error) => {
        console.error('Error loading model:', error);
        if (this.onError) {
          this.onError(error);
        }
      }
    );
  }

  /**
   * Load a GLTF model from URL with optional custom manager
   */
  loadGLTFModel(url, name, customManager = null) {
    console.log('Loading GLTF model from:', url, 'with custom manager:', !!customManager);
    
    const loader = new GLTFLoader(customManager);
    loader.load(
      url,
      (gltf) => {
        console.log('GLTF model loaded successfully:', gltf);
        this.clearModel();
        
        this.model = gltf.scene;
        this.model.name = name || 'LoadedGLTFModel';
        
        this.scene.add(this.model);
        
        // Collect all mesh parts for interaction
        this.parts = [];
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // Store original local position relative to model (not world position)
            child.userData.origin = child.position.clone();
            this.parts.push(child);
          }
        });
        
        console.log('Found', this.parts.length, 'mesh parts in GLTF');
        
        // Notify that model is loaded
        if (this.onModelLoaded) {
          this.onModelLoaded(gltf, this.model, this.parts);
        }
        
        // Use camera system for fitting if available
        if (this.cameraSystem) {
          this.cameraSystem.fitModelToPane(this.model);
        }
        
        this.hideEmptyState();
        console.log('GLTF model loading completed');
      },
      (progress) => {
        console.log('GLTF loading progress:', (progress.loaded / progress.total * 100) + '%');
        if (this.onProgress) {
          this.onProgress(progress);
        }
      },
      (error) => {
        console.error('Error loading GLTF model:', error);
        if (this.onError) {
          this.onError(error);
        }
      }
    );
  }

  /**
   * Load an FBX model from URL
   */
  loadFBXModel(url, name) {
    console.log('Loading FBX model from:', url);
    
    const loader = new FBXLoader();
    loader.load(
      url,
      (fbx) => {
        console.log('FBX model loaded successfully:', fbx);
        this.clearModel();
        
        this.model = fbx;
        this.model.name = name || 'LoadedFBXModel';
        
        this.scene.add(this.model);
        
        // Collect all mesh parts for interaction
        this.parts = [];
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // Store original local position relative to model (not world position)
            child.userData.origin = child.position.clone();
            this.parts.push(child);
          }
        });
        
        console.log('Found', this.parts.length, 'mesh parts in FBX');
        
        // Notify that model is loaded
        if (this.onModelLoaded) {
          this.onModelLoaded(fbx, this.model, this.parts);
        }
        
        // Use camera system for fitting if available
        if (this.cameraSystem) {
          this.cameraSystem.fitModelToPane(this.model);
        }
        
        this.hideEmptyState();
        console.log('FBX model loading completed');
      },
      (progress) => {
        console.log('FBX loading progress:', (progress.loaded / progress.total * 100) + '%');
        if (this.onProgress) {
          this.onProgress(progress);
        }
      },
      (error) => {
        console.error('Error loading FBX model:', error);
        if (this.onError) {
          this.onError(error);
        }
      }
    );
  }

  /**
   * Load an OBJ model from URL
   */
  loadOBJModel(url, name) {
    console.log('Loading OBJ model from:', url);
    
    const loader = new OBJLoader();
    loader.load(
      url,
      (obj) => {
        console.log('OBJ model loaded successfully:', obj);
        this.clearModel();
        
        this.model = obj;
        this.model.name = name || 'LoadedOBJModel';
        
        this.scene.add(this.model);
        
        // Collect all mesh parts for interaction
        this.parts = [];
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // Store original local position relative to model (not world position)
            child.userData.origin = child.position.clone();
            this.parts.push(child);
          }
        });
        
        console.log('Found', this.parts.length, 'mesh parts in OBJ');
        
        // Notify that model is loaded
        if (this.onModelLoaded) {
          this.onModelLoaded(obj, this.model, this.parts);
        }
        
        // Use camera system for fitting if available
        if (this.cameraSystem) {
          this.cameraSystem.fitModelToPane(this.model);
        }
        
        this.hideEmptyState();
        console.log('OBJ model loading completed');
      },
      (progress) => {
        console.log('OBJ loading progress:', (progress.loaded / progress.total * 100) + '%');
        if (this.onProgress) {
          this.onProgress(progress);
        }
      },
      (error) => {
        console.error('Error loading OBJ model:', error);
        if (this.onError) {
          this.onError(error);
        }
      }
    );
  }

  /**
   * Load a PLY model from URL
   */
  loadPLYModel(url, name) {
    console.log('Loading PLY model from:', url);
    
    const loader = new PLYLoader();
    loader.load(
      url,
      (geometry) => {
        console.log('PLY model loaded successfully:', geometry);
        this.clearModel();
        
        // PLY loader returns geometry, so we need to create a mesh
        const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const mesh = new THREE.Mesh(geometry, material);
        
        this.model = new THREE.Group();
        this.model.add(mesh);
        this.model.name = name || 'LoadedPLYModel';
        
        this.scene.add(this.model);
        
        // Set up the mesh for interaction
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.origin = mesh.position.clone();
        
        this.parts = [mesh];
        
        console.log('Found', this.parts.length, 'mesh parts in PLY');
        
        // Notify that model is loaded
        if (this.onModelLoaded) {
          this.onModelLoaded({ scene: this.model }, this.model, this.parts);
        }
        
        // Use camera system for fitting if available
        if (this.cameraSystem) {
          this.cameraSystem.fitModelToPane(this.model);
        }
        
        this.hideEmptyState();
        console.log('PLY model loading completed');
      },
      (progress) => {
        console.log('PLY loading progress:', (progress.loaded / progress.total * 100) + '%');
        if (this.onProgress) {
          this.onProgress(progress);
        }
      },
      (error) => {
        console.error('Error loading PLY model:', error);
        if (this.onError) {
          this.onError(error);
        }
      }
    );
  }

  /**
   * Load an STL model from URL
   */
  loadSTLModel(url, name) {
    console.log('Loading STL model from:', url);
    
    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        console.log('STL model loaded successfully:', geometry);
        this.clearModel();
        
        // STL loader returns geometry, so we need to create a mesh
        const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const mesh = new THREE.Mesh(geometry, material);
        
        this.model = new THREE.Group();
        this.model.add(mesh);
        this.model.name = name || 'LoadedSTLModel';
        
        this.scene.add(this.model);
        
        // Set up the mesh for interaction
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.origin = mesh.position.clone();
        
        this.parts = [mesh];
        
        console.log('Found', this.parts.length, 'mesh parts in STL');
        
        // Notify that model is loaded
        if (this.onModelLoaded) {
          this.onModelLoaded({ scene: this.model }, this.model, this.parts);
        }
        
        // Use camera system for fitting if available
        if (this.cameraSystem) {
          this.cameraSystem.fitModelToPane(this.model);
        }
        
        this.hideEmptyState();
        console.log('STL model loading completed');
      },
      (progress) => {
        console.log('STL loading progress:', (progress.loaded / progress.total * 100) + '%');
        if (this.onProgress) {
          this.onProgress(progress);
        }
      },
      (error) => {
        console.error('Error loading STL model:', error);
        if (this.onError) {
          this.onError(error);
        }
      }
    );
  }

  /**
   * Clear the current model and dispose of resources
   */
  clearModel() {
    if (this.model) {
      this.scene.remove(this.model);
      // Dispose of geometry and materials to free memory
      this.model.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    
    this.model = null;
    this.parts = [];
    
    // Notify that model is cleared
    if (this.onModelCleared) {
      this.onModelCleared();
    }
    
    this.showEmptyState();
    console.log('Model cleared');
  }

  /**
   * Show empty state UI
   */
  showEmptyState() {
    const emptyElement = document.getElementById('viewer3DEmpty');
    if (emptyElement) {
      emptyElement.style.display = 'block';
    }
  }

  /**
   * Hide empty state UI
   */
  hideEmptyState() {
    const emptyElement = document.getElementById('viewer3DEmpty');
    if (emptyElement) {
      emptyElement.style.display = 'none';
    }
  }

  /**
   * Get the current model
   */
  getModel() {
    return this.model;
  }

  /**
   * Get all mesh parts of the current model
   */
  getParts() {
    return this.parts;
  }

  /**
   * Check if a model is currently loaded
   */
  hasModel() {
    return this.model !== null;
  }

  /**
   * Get model bounding box
   */
  getModelBounds() {
    if (!this.model) return null;
    return new THREE.Box3().setFromObject(this.model);
  }

  /**
   * Set callbacks for model events
   */
  setCallbacks({ onModelLoaded, onModelCleared, onProgress, onError }) {
    this.onModelLoaded = onModelLoaded;
    this.onModelCleared = onModelCleared;
    this.onProgress = onProgress;
    this.onError = onError;
  }
} 