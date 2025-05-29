import * as THREE from 'https://unpkg.com/three@0.164.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.164.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.164.0/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";

// Export THREE to global window object to avoid multiple imports
window.THREE = THREE;

export class Viewer3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8f9fa);
    
    // Increase far clipping plane to prevent model disappearing when zooming out
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 10000);
    this.camera.position.set(3, 2, 6);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    this.container.appendChild(this.renderer.domElement);
    
    this.setupLighting();
    this.setupControls();
    this.setupClipping();
    this.setupGUI();
    this.setupRaycasting();
    
    this.model = null;
    this.parts = [];
    this.currentlyFocusedPart = null;
    this.previousCameraState = { position: null, target: null };
    
    // Animation system
    this.mixer = null;
    this.animations = [];
    this.currentAction = null;
    this.clock = new THREE.Clock();
    
    // X-ray system
    this.originalMaterialOpacity = new Map();
    this.isXrayMode = false;
    
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
    
    this.animate();
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight);

    // Hemisphere light
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x404040, 0.8);
    this.scene.add(hemisphereLight);
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
  }

  setupClipping() {
    // Default to Y-axis slicing (existing behavior)
    this.sliceDirection = 'y';
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    this.renderer.clippingPlanes = [this.clipPlane];
    this.renderer.localClippingEnabled = true;
  }

  setupGUI() {
    // Controls parameters
    this.params = {
      explode: 0,
      slice: 1,
      sliceDirection: 'y',
      reset: () => this.reset()
    };

    // Connect HTML controls instead of lil-gui
    this.setupHTMLControls();
  }

  setupHTMLControls() {
    // Setup toolbar tools
    this.setupToolbar();
    
    // Connect explode slider
    const explodeSlider = document.getElementById('explodeSlider');
    if (explodeSlider) {
      explodeSlider.addEventListener('input', (e) => {
        this.params.explode = parseFloat(e.target.value);
        this.explode(this.params.explode);
        // Update value display
        const explodeValue = document.getElementById('explodeValue');
        if (explodeValue) {
          explodeValue.textContent = Math.round(this.params.explode * 100) + '%';
        }
      });
    }

    // Connect slice slider  
    const sliceSlider = document.getElementById('sliceSlider');
    if (sliceSlider) {
      sliceSlider.addEventListener('input', (e) => {
        this.params.slice = parseFloat(e.target.value);
        this.updateSlice();
        // Update value display
        const sliceValue = document.getElementById('sliceValue');
        if (sliceValue) {
          sliceValue.textContent = Math.round(this.params.slice * 100) + '%';
        }
      });
    }

    // Connect slice direction radio buttons
    const sliceDirectionInputs = document.querySelectorAll('input[name="sliceDirection"]');
    sliceDirectionInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.params.sliceDirection = e.target.value;
          this.sliceDirection = e.target.value;
          this.updateSliceDirection();
          this.updateSlice();
        }
      });
    });

    // Connect animation controls
    const animationSelect = document.getElementById('animationSelect');
    const animationPlay = document.getElementById('animationPlay');
    const animationPause = document.getElementById('animationPause');
    const animationStop = document.getElementById('animationStop');
    const animationSpeed = document.getElementById('animationSpeed');
    
    if (animationSelect) {
      animationSelect.addEventListener('change', (e) => {
        this.selectAnimation(e.target.value);
      });
    }
    
    if (animationPlay) {
      animationPlay.addEventListener('click', () => this.playAnimation());
    }
    
    if (animationPause) {
      animationPause.addEventListener('click', () => this.pauseAnimation());
    }
    
    if (animationStop) {
      animationStop.addEventListener('click', () => this.stopAnimation());
    }
    
    if (animationSpeed) {
      animationSpeed.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        this.setAnimationSpeed(speed);
        const speedValue = document.getElementById('animationSpeedValue');
        if (speedValue) {
          speedValue.textContent = speed.toFixed(1) + 'x';
        }
      });
    }

    // Connect x-ray controls
    const xraySlider = document.getElementById('xraySlider');
    if (xraySlider) {
      xraySlider.addEventListener('input', (e) => {
        const transparency = parseFloat(e.target.value);
        this.setXrayMode(transparency);
        const xrayValue = document.getElementById('xrayValue');
        if (xrayValue) {
          xrayValue.textContent = Math.round(transparency * 100) + '%';
        }
      });
    }

    // Connect back button
    const backBtn = document.getElementById('btnBack');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.goBackToFullView();
      });
    }
    
    // Initialize Bootstrap tooltips
    this.initializeTooltips();
  }

  setupToolbar() {
    this.currentTool = 'arrow';
    
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
        this.updateAnimationUI(); // Update the animation dropdown
        if (toolControlsPanel) {
          toolControlsPanel.classList.remove('d-none');
        }
        break;
      case 'reset':
        // Reset tool should trigger reset and stay on arrow tool
        this.reset();
        // After reset, switch back to arrow tool
        this.activateTool('arrow');
        return; // Exit early to avoid double activation
      default:
        console.warn('Unknown tool type:', toolType);
    }
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

  initializeTooltips() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  setupRaycasting() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.isMouseDown = false;
    this.mouseDownTime = 0;
    this.hasMouseMoved = false;
    this.hoveredMesh = null;

    this.renderer.domElement.addEventListener('mousedown', (event) => this.onMouseDown(event));
    this.renderer.domElement.addEventListener('mouseup', (event) => this.onMouseUp(event));
    this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event));
    this.renderer.domElement.addEventListener('mouseleave', () => this.onMouseLeave());
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
      
      // Focus on the selected part
      this.focusOnPart(selectedMesh);
    }
  }

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
        
        // Setup animations if available
        if (gltf.animations && gltf.animations.length > 0) {
          this.setupAnimations(gltf.animations);
        }
        
        this.calculateExplosionDirections();
        this.fitModelToPane();
        this.updateSlice();
        this.hideEmptyState();
        console.log('Model loading completed and fitted to pane');
      },
      (progress) => {
        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
      },
      (error) => {
        console.error('Error loading model:', error);
      }
    );
  }

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
        
        // Setup animations if available
        if (gltf.animations && gltf.animations.length > 0) {
          this.setupAnimations(gltf.animations);
        }
        
        this.calculateExplosionDirections();
        this.fitModelToPane();
        this.updateSlice();
        this.hideEmptyState();
        console.log('GLTF model loading completed and fitted to pane');
      },
      (progress) => {
        console.log('GLTF loading progress:', (progress.loaded / progress.total * 100) + '%');
      },
      (error) => {
        console.error('Error loading GLTF model:', error);
      }
    );
  }

  fitModelToPane() {
    if (!this.model) return;

    // Calculate the bounding box of the model
    const box = new THREE.Box3().setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Get the current aspect ratio of the renderer
    const containerRect = this.container.getBoundingClientRect();
    const aspect = containerRect.width / containerRect.height;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    // Calculate distance needed to fit object
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let distance = maxDim / (2 * Math.tan(fov / 2));
    
    // Add some padding (20% extra distance)
    distance *= 1.4;
    
    // Ensure minimum distance to prevent being too close
    distance = Math.max(distance, maxDim * 2);

    // Position camera
    const direction = new THREE.Vector3(1, 1, 1).normalize();
    this.camera.position.copy(center).add(direction.multiplyScalar(distance));
    
    // Point camera at the center of the model
    this.camera.lookAt(center);
    
    // Update controls to focus on the model center
    this.controls.target.copy(center);
    this.controls.update();

    console.log('Model fitted to pane:', {
      center: center,
      size: size,
      maxDimension: maxDim,
      cameraDistance: distance,
      cameraPosition: this.camera.position
    });
  }

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
    this.currentlyFocusedPart = null;
    this.previousCameraState = { position: null, target: null };
    
    // Clear animations
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
    this.animations = [];
    this.currentAction = null;
    
    // Clear x-ray mode
    this.originalMaterialOpacity.clear();
    this.isXrayMode = false;
    
    // Hide back button
    const backButton = document.getElementById('backButtonOverlay');
    if (backButton) {
      backButton.classList.remove('visible');
    }
    
    this.showEmptyState();
    console.log('Model cleared');
  }

  showEmptyState() {
    document.getElementById('viewer3DEmpty').style.display = 'block';
  }

  hideEmptyState() {
    document.getElementById('viewer3DEmpty').style.display = 'none';
  }

  updateSliceDirection() {
    // Update the clipping plane normal vector based on selected direction
    switch (this.sliceDirection) {
      case 'x':
        this.clipPlane.normal.set(-1, 0, 0); // Slice along X axis (left to right)
        break;
      case 'y':
        this.clipPlane.normal.set(0, -1, 0); // Slice along Y axis (bottom to top)
        break;
      case 'z':
        this.clipPlane.normal.set(0, 0, -1); // Slice along Z axis (front to back)
        break;
      default:
        this.clipPlane.normal.set(0, -1, 0); // Default to Y axis
    }
    
    console.log(`Slice direction changed to: ${this.sliceDirection.toUpperCase()}-axis`);
  }

  updateSlice() {
    if (!this.model) {
      this.clipPlane.constant = 1000; // Show everything when no model
      return;
    }

    // Calculate model bounds to determine clipping range
    const box = new THREE.Box3().setFromObject(this.model);
    const modelSize = box.getSize(new THREE.Vector3());

    // Get min/max values based on current slice direction
    let minValue, maxValue;
    switch (this.sliceDirection) {
      case 'x':
        minValue = box.min.x;
        maxValue = box.max.x;
        break;
      case 'y':
        minValue = box.min.y;
        maxValue = box.max.y;
        break;
      case 'z':
        minValue = box.min.z;
        maxValue = box.max.z;
        break;
      default:
        minValue = box.min.y;
        maxValue = box.max.y;
    }

    // Map slider value 0-1 to clipping range
    // slice = 0: clip everything (constant = minValue - buffer) 
    // slice = 1: show everything (constant = maxValue + buffer)
    const buffer = Math.max(modelSize.x, modelSize.y, modelSize.z) * 0.1; // Buffer based on largest dimension
    const clippingRange = (maxValue + buffer) - (minValue - buffer);
    this.clipPlane.constant = (minValue - buffer) + (this.params.slice * clippingRange);

    console.log(`Slice ${this.sliceDirection}-axis: ${this.params.slice.toFixed(2)} (position: ${this.clipPlane.constant.toFixed(2)})`);
  }

  calculateExplosionDirections() {
    if (!this.model || this.parts.length === 0) return;

    // Calculate model bounds and center
    const box = new THREE.Box3().setFromObject(this.model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // For z-axis explosion, parts move forward or backward based on their z-position relative to center
    this.parts.forEach((part, index) => {
      if (!part.userData.origin) return;
      
      // Get current world position of the part for direction calculation
      const worldPosition = new THREE.Vector3();
      part.getWorldPosition(worldPosition);
      
      // Determine direction along z-axis based on part's world z-position relative to center
      const partZ = worldPosition.z;
      const centerZ = center.z;
      
      let direction;
      if (partZ >= centerZ) {
        // Parts at or in front of center move forward (+z)
        direction = new THREE.Vector3(0, 0, 1);
      } else {
        // Parts behind center move backward (-z)  
        direction = new THREE.Vector3(0, 0, -1);
      }
      
      // Store the consistent direction in userData
      part.userData.explosionDirection = direction.clone();
    });

    console.log('Calculated z-axis explosion directions for', this.parts.length, 'parts');
  }

  explode(factor) {
    if (!this.model) return;
    
    // Reset all parts to their original positions first
    this.parts.forEach((part) => {
      part.position.copy(part.userData.origin);
    });
    
    if (factor === 0) return; // No explosion needed
    
    // Calculate model bounds for scale reference
    const box = new THREE.Box3().setFromObject(this.model);
    const modelSize = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z);
    
    // Base explosion distance scaled by model size
    const baseDistance = maxDimension * factor * 0.09;
    
    // Apply explosion using stored directions
    this.parts.forEach((part) => {
      if (!part.userData.explosionDirection) return;
      
      // Calculate explosion distance - parts further from center move more
      const center = new THREE.Vector3();
      box.getCenter(center);
      const partDistFromCenter = part.userData.origin.distanceTo(center);
      const distanceMultiplier = 1 + (partDistFromCenter / maxDimension) * 0.5;
      const explosionDistance = baseDistance * distanceMultiplier;
      
      // Apply explosion offset using consistent direction
      const explosionOffset = part.userData.explosionDirection.clone().multiplyScalar(explosionDistance);
      part.position.copy(part.userData.origin).add(explosionOffset);
    });
  }

  focusOnPart(selectedMesh) {
    console.log('Focusing on part:', selectedMesh.name);
    
    // Store the previous camera state for back navigation
    this.previousCameraState = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone()
    };
    
    // Hide all other parts
    this.parts.forEach(part => {
      if (part !== selectedMesh) {
        part.visible = false;
      }
    });
    
    // Show only the selected part
    selectedMesh.visible = true;
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
    
    // Show back button
    const backButton = document.getElementById('backButtonOverlay');
    if (backButton) {
      backButton.classList.add('visible');
    }
    
    console.log('Focused on part:', selectedMesh.name || 'Unnamed', 'at center:', center);
  }

  goBackToFullView(animate = true) {
    if (!this.model) return;
    
    console.log('Going back to full view');
    
    // Show all parts
    this.parts.forEach(part => {
      part.visible = true;
    });
    
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
    
    // Hide back button
    const backButton = document.getElementById('backButtonOverlay');
    if (backButton) {
      backButton.classList.remove('visible');
    }
    
    // Clear previous camera state
    this.previousCameraState = { position: null, target: null };
  }

  reset() {
    this.params.explode = 0;
    this.params.slice = 1;
    this.explode(0);
    this.updateSlice();
    
    // Reset UI controls
    const explodeSlider = document.getElementById('explodeSlider');
    const sliceSlider = document.getElementById('sliceSlider');
    const explodeValue = document.getElementById('explodeValue');
    const sliceValue = document.getElementById('sliceValue');
    
    if (explodeSlider) {
      explodeSlider.value = 0;
      if (explodeValue) explodeValue.textContent = '0%';
    }
    
    if (sliceSlider) {
      sliceSlider.value = 1;
      if (sliceValue) sliceValue.textContent = '100%';
    }
    
    // Reset camera to fit model
    if (this.currentlyFocusedPart) {
      this.goBackToFullView();
    } else {
      this.fitModelToPane();
    }
    
    console.log('Reset to default state');
  }

  onResize() {
    if (!this.container) return;
    
    const containerRect = this.container.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    
    console.log('3D Viewer resized to:', width, 'x', height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Update controls
    this.controls.update();
    
    // Update animations
    if (this.mixer) {
      this.mixer.update(this.clock.getDelta());
    }
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  addTestCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    this.testCube = new THREE.Mesh(geometry, material);
    this.testCube.name = 'TestCube';
    this.scene.add(this.testCube);
    this.parts.push(this.testCube);
    console.log('Added test cube for verification');
  }

  removeTestCube() {
    if (this.testCube) {
      this.scene.remove(this.testCube);
      this.testCube.geometry.dispose();
      this.testCube.material.dispose();
      this.testCube = null;
      console.log('Removed test cube');
    }
  }

  setupAnimations(animations) {
    this.animations = animations;
    this.mixer = new THREE.AnimationMixer(this.model);
    
    console.log('Setup animations:', animations.length, 'found');
    animations.forEach((clip, index) => {
      console.log(`Animation ${index}:`, clip.name, clip.duration + 's');
    });
    
    this.updateAnimationUI();
  }

  selectAnimation(animationName) {
    if (!this.mixer || !this.animations.length) return;
    
    // Stop current animation
    if (this.currentAction) {
      this.currentAction.stop();
    }
    
    // Find and setup new animation
    const clip = this.animations.find(anim => anim.name === animationName);
    if (clip) {
      this.currentAction = this.mixer.clipAction(clip);
      console.log('Selected animation:', animationName);
      this.updateAnimationButtons();
    }
  }

  playAnimation() {
    if (this.currentAction) {
      this.currentAction.play();
      console.log('Playing animation');
      this.updateAnimationButtons();
    }
  }

  pauseAnimation() {
    if (this.currentAction) {
      this.currentAction.paused = !this.currentAction.paused;
      console.log('Animation paused:', this.currentAction.paused);
      this.updateAnimationButtons();
    }
  }

  stopAnimation() {
    if (this.currentAction) {
      this.currentAction.stop();
      console.log('Animation stopped');
      this.updateAnimationButtons();
    }
  }

  setAnimationSpeed(speed) {
    if (this.currentAction) {
      this.currentAction.setEffectiveTimeScale(speed);
      console.log('Animation speed set to:', speed);
    }
  }

  updateAnimationUI() {
    const animationSelect = document.getElementById('animationSelect');
    if (!animationSelect) return;
    
    animationSelect.innerHTML = '<option value="">Select Animation</option>';
    
    this.animations.forEach(anim => {
      const option = document.createElement('option');
      option.value = anim.name;
      option.textContent = anim.name;
      animationSelect.appendChild(option);
    });
    
    this.updateAnimationButtons();
  }

  updateAnimationButtons() {
    const playBtn = document.getElementById('animationPlay');
    const pauseBtn = document.getElementById('animationPause');
    const stopBtn = document.getElementById('animationStop');
    
    const hasAnimation = !!this.currentAction;
    const isPlaying = hasAnimation && this.currentAction.isRunning() && !this.currentAction.paused;
    const isPaused = hasAnimation && this.currentAction.paused;
    
    if (playBtn) playBtn.disabled = !hasAnimation || isPlaying;
    if (pauseBtn) pauseBtn.disabled = !hasAnimation || (!isPlaying && !isPaused);
    if (stopBtn) stopBtn.disabled = !hasAnimation || (!isPlaying && !isPaused);
  }

  setXrayMode(transparency) {
    if (!this.model) return;
    
    this.parts.forEach(part => {
      if (part.material) {
        // Store original opacity if not already stored
        if (!this.originalMaterialOpacity.has(part)) {
          this.originalMaterialOpacity.set(part, part.material.opacity || 1.0);
        }
        
        if (transparency > 0) {
          // Enable x-ray mode
          part.material.transparent = true;
          part.material.opacity = transparency;
          this.isXrayMode = true;
        } else {
          // Disable x-ray mode - restore original opacity
          const originalOpacity = this.originalMaterialOpacity.get(part);
          part.material.opacity = originalOpacity;
          part.material.transparent = originalOpacity < 1.0;
          this.isXrayMode = false;
        }
        
        part.material.needsUpdate = true;
      }
    });
    
    console.log('X-ray mode:', transparency > 0 ? `${Math.round(transparency * 100)}%` : 'disabled');
  }
} 