import * as THREE from 'https://unpkg.com/three@0.164.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.164.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.164.0/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";

/* ---------- Asset Management ---------- */
class AssetManager {
  constructor() {
    this.models3D = new Map();
    this.contentAssets = new Map();
    this.fileGroups = new Map(); // Store related files for GLTF models
    this.currentModel = null;
    this.currentContent = null;
  }

  addModel(file, id = null) {
    console.log('AssetManager.addModel called with:', file.name);
    const modelId = id || `model_${Date.now()}`;
    
    // Check if this is part of a GLTF file group
    const baseName = this.getBaseName(file.name);
    const extension = this.getFileExtension(file.name);
    
    let modelData;
    
    if (extension === 'gltf') {
      // For GLTF files, we need to create a file group
      modelData = {
        id: modelId,
        name: file.name,
        baseName: baseName,
        mainFile: file,
        relatedFiles: new Map(),
        url: null, // Will be set when all files are ready
        type: file.type,
        size: file.size,
        isGLTF: true
      };
      
      // Store the group for this basename
      this.fileGroups.set(baseName, modelData);
    } else {
      // For GLB files, create blob URL directly
      const url = URL.createObjectURL(file);
      modelData = {
        id: modelId,
        name: file.name,
        file: file,
        url: url,
        type: file.type,
        size: file.size,
        isGLTF: false
      };
    }
    
    this.models3D.set(modelId, modelData);
    console.log('Model stored in AssetManager:', modelId, this.models3D.size, 'total models');
    
    this.updateModelsUI();
    console.log('UI updated for models');
    return modelId;
  }

  // Handle related files for GLTF models (bin, textures, etc.)
  addRelatedFile(file) {
    const baseName = this.getBaseName(file.name);
    const extension = this.getFileExtension(file.name);
    
    // Find the GLTF model this file belongs to
    const group = this.fileGroups.get(baseName);
    if (group) {
      console.log(`Adding related file ${file.name} to GLTF group ${baseName}`);
      group.relatedFiles.set(file.name, file);
      group.size += file.size;
      
      // Update the model in the main collection
      const model = this.models3D.get(group.id);
      if (model) {
        model.relatedFiles = group.relatedFiles;
        model.size = group.size;
        this.setupGLTFLoader(model);
      }
      
      this.updateModelsUI();
      return true;
    }
    
    return false;
  }

  // Setup custom loader for GLTF with dependencies
  setupGLTFLoader(modelData) {
    if (!modelData.isGLTF) return;
    
    console.log('Setting up GLTF loader for:', modelData.name);
    
    // Create object URLs for all files
    const fileMap = new Map();
    fileMap.set(modelData.name, URL.createObjectURL(modelData.mainFile));
    
    modelData.relatedFiles.forEach((file, filename) => {
      fileMap.set(filename, URL.createObjectURL(file));
    });
    
    // Create a custom manager to handle file loading
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      // Extract filename from URL
      const filename = url.split('/').pop();
      const objectURL = fileMap.get(filename);
      
      if (objectURL) {
        console.log(`Redirecting ${filename} to blob URL`);
        return objectURL;
      }
      
      console.warn(`File not found in group: ${filename}`);
      return url;
    });
    
    modelData.customManager = manager;
    modelData.fileMap = fileMap;
  }

  getBaseName(filename) {
    return filename.replace(/\.[^/.]+$/, "");
  }

  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  addContent(file, id = null) {
    const contentId = id || `content_${Date.now()}`;
    const url = URL.createObjectURL(file);
    
    this.contentAssets.set(contentId, {
      id: contentId,
      name: file.name,
      file: file,
      url: url,
      type: file.type,
      size: file.size
    });
    
    this.updateContentUI();
    return contentId;
  }

  loadModel(modelId) {
    const model = this.models3D.get(modelId);
    if (model) {
      this.currentModel = modelId;
      
      if (model.isGLTF) {
        // For GLTF files, create URL and pass custom manager
        if (!model.url) {
          model.url = URL.createObjectURL(model.mainFile);
        }
        viewer3D.loadGLTFModel(model.url, model.name, model.customManager);
      } else {
        // For GLB files, use standard loading
        viewer3D.loadModel(model.url, model.name);
      }
      
      this.updateModelsUI();
    }
  }

  loadContent(contentId) {
    const content = this.contentAssets.get(contentId);
    if (content) {
      this.currentContent = contentId;
      contentViewer.loadContent(content);
      this.updateContentUI();
    }
  }

  deleteModel(modelId) {
    const model = this.models3D.get(modelId);
    if (model) {
      URL.revokeObjectURL(model.url);
      this.models3D.delete(modelId);
      if (this.currentModel === modelId) {
        this.currentModel = null;
        viewer3D.clearModel();
      }
      this.updateModelsUI();
    }
  }

  deleteContent(contentId) {
    const content = this.contentAssets.get(contentId);
    if (content) {
      URL.revokeObjectURL(content.url);
      this.contentAssets.delete(contentId);
      if (this.currentContent === contentId) {
        this.currentContent = null;
        contentViewer.clearContent();
      }
      this.updateContentUI();
    }
  }

  updateModelsUI() {
    console.log('updateModelsUI called, models count:', this.models3D.size);
    const modelsList = document.getElementById('modelsList');
    
    if (!modelsList) {
      console.error('modelsList element not found!');
      return;
    }
    
    if (this.models3D.size === 0) {
      console.log('No models to display, showing empty state');
      modelsList.innerHTML = '<div class="text-muted small text-center py-3">No models uploaded yet</div>';
      return;
    }

    console.log('Building UI for', this.models3D.size, 'models');
    modelsList.innerHTML = '';
    this.models3D.forEach((model, id) => {
      console.log('Creating UI for model:', id, model.name);
      const item = document.createElement('div');
      item.className = `asset-item p-2 mb-2 rounded border ${this.currentModel === id ? 'active' : ''}`;
      
      // Build file info display
      let fileInfo = `<div class="fw-semibold small">${model.name}</div>`;
      
      if (model.isGLTF && model.relatedFiles && model.relatedFiles.size > 0) {
        fileInfo += `<div class="text-muted" style="font-size: 0.7rem;">+ ${model.relatedFiles.size} related files</div>`;
      }
      
      fileInfo += `<div class="text-muted" style="font-size: 0.75rem;">${this.formatFileSize(model.size)}</div>`;
      
      // Add warning for incomplete GLTF files
      const isIncomplete = model.isGLTF && (!model.relatedFiles || model.relatedFiles.size === 0);
      const warningIcon = isIncomplete ? '<i class="bi bi-exclamation-triangle text-warning me-1" title="GLTF may be missing related files"></i>' : '';
      
      item.innerHTML = `
        <div class="d-flex align-items-center justify-content-between">
          <div class="flex-grow-1 model-item-content" data-model-id="${id}" style="cursor: pointer;">
            ${warningIcon}${fileInfo}
          </div>
          <button class="btn btn-sm btn-outline-danger model-delete-btn" data-model-id="${id}" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `;
      
      // Add event listeners
      const contentDiv = item.querySelector('.model-item-content');
      const deleteBtn = item.querySelector('.model-delete-btn');
      
      contentDiv.addEventListener('click', () => this.loadModel(id));
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteModel(id);
      });
      
      modelsList.appendChild(item);
      console.log('Model UI item added to DOM');
    });
    console.log('updateModelsUI completed');
  }

  updateContentUI() {
    const contentList = document.getElementById('contentList');
    
    if (this.contentAssets.size === 0) {
      contentList.innerHTML = '<div class="text-muted small text-center py-3">No content uploaded yet</div>';
      return;
    }

    contentList.innerHTML = '';
    this.contentAssets.forEach((content, id) => {
      const item = document.createElement('div');
      item.className = `asset-item p-2 mb-2 rounded border ${this.currentContent === id ? 'active' : ''}`;
      
      const icon = this.getFileIcon(content.type);
      item.innerHTML = `
        <div class="d-flex align-items-center justify-content-between">
          <div class="flex-grow-1 content-item-content" data-content-id="${id}" style="cursor: pointer;">
            <div class="d-flex align-items-center">
              <i class="bi ${icon} me-2"></i>
              <div>
                <div class="fw-semibold small">${content.name}</div>
                <div class="text-muted" style="font-size: 0.75rem;">${this.formatFileSize(content.size)}</div>
              </div>
            </div>
          </div>
          <button class="btn btn-sm btn-outline-danger content-delete-btn" data-content-id="${id}" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `;
      
      // Add event listeners
      const contentDiv = item.querySelector('.content-item-content');
      const deleteBtn = item.querySelector('.content-delete-btn');
      
      contentDiv.addEventListener('click', () => this.loadContent(id));
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteContent(id);
      });
      
      contentList.appendChild(item);
    });
  }

  getFileIcon(type) {
    if (type.includes('pdf')) return 'bi-file-pdf';
    if (type.includes('image')) return 'bi-file-image';
    return 'bi-file-earmark';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/* ---------- 3D Viewer Class ---------- */
class Viewer3D {
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
    
    // Add a test cube to verify 3D rendering is working
    // this.addTestCube(); // Removed to show only text placeholder
    
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
    
    // Get toolbar elements
    const toolbarTools = document.querySelectorAll('.toolbar-tool');
    const toolControlsPanel = document.getElementById('toolControlsPanel');
    
    // Setup tool click handlers
    toolbarTools.forEach(tool => {
      tool.addEventListener('click', (e) => {
        const toolType = e.currentTarget.dataset.tool;
        this.activateTool(toolType);
      });
    });
  }

  activateTool(toolType) {
    // Update active tool
    this.currentTool = toolType;
    
    // Update toolbar UI
    const toolbarTools = document.querySelectorAll('.toolbar-tool');
    toolbarTools.forEach(tool => {
      if (tool.dataset.tool === toolType) {
        tool.classList.add('active');
      } else {
        tool.classList.remove('active');
      }
    });
    
    // Handle tool-specific logic
    switch (toolType) {
      case 'arrow':
        this.hideToolControls();
        break;
        
      case 'explode':
        this.showToolControls('explodeControls');
        break;
        
      case 'slice':
        this.showToolControls('sliceControls');
        break;
        
      case 'animation':
        this.showToolControls('animationControls');
        this.updateAnimationUI();
        break;
        
      case 'xray':
        this.showToolControls('xrayControls');
        break;
        
      case 'reset':
        this.reset();
        // Reset slider values
        const explodeSlider = document.getElementById('explodeSlider');
        const sliceSlider = document.getElementById('sliceSlider');
        if (explodeSlider) explodeSlider.value = 0;
        if (sliceSlider) sliceSlider.value = 1;
        // Update value displays
        const explodeValue = document.getElementById('explodeValue');
        const sliceValue = document.getElementById('sliceValue');
        if (explodeValue) explodeValue.textContent = '0%';
        if (sliceValue) sliceValue.textContent = '100%';
        // Auto-return to arrow tool after reset
        setTimeout(() => this.activateTool('arrow'), 300);
        break;
    }
  }

  showToolControls(controlsId) {
    const toolControlsPanel = document.getElementById('toolControlsPanel');
    const allControlSections = document.querySelectorAll('.tool-control-section');
    
    // Hide all control sections first
    allControlSections.forEach(section => {
      section.classList.add('d-none');
    });
    
    // Show the requested control section
    const targetControls = document.getElementById(controlsId);
    if (targetControls) {
      targetControls.classList.remove('d-none');
    }
    
    // Show the panel
    if (toolControlsPanel) {
      toolControlsPanel.classList.remove('d-none');
    }
  }

  hideToolControls() {
    const toolControlsPanel = document.getElementById('toolControlsPanel');
    const allControlSections = document.querySelectorAll('.tool-control-section');
    
    // Hide all control sections
    allControlSections.forEach(section => {
      section.classList.add('d-none');
    });
    
    // Hide the panel
    if (toolControlsPanel) {
      toolControlsPanel.classList.add('d-none');
    }
  }

  initializeTooltips() {
    // Initialize Bootstrap tooltips for toolbar tools
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  setupRaycasting() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.mouseDownPosition = new THREE.Vector2();
    this.isMouseDown = false;
    this.hoveredPart = null;
    this.originalMaterials = new Map(); // Store original materials for hover effect
    
    // Mouse/touch events for better click detection
    this.renderer.domElement.addEventListener('mousedown', (event) => this.onMouseDown(event));
    this.renderer.domElement.addEventListener('mouseup', (event) => this.onMouseUp(event));
    this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event));
    this.renderer.domElement.addEventListener('mouseleave', () => this.onMouseLeave());
  }

  onMouseDown(event) {
    this.isMouseDown = true;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseDownPosition.x = event.clientX - rect.left;
    this.mouseDownPosition.y = event.clientY - rect.top;
  }

  onMouseUp(event) {
    if (!this.isMouseDown) return;
    this.isMouseDown = false;
    
    // Calculate how much the mouse moved during the click
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouseUpPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    const moveDistance = Math.sqrt(
      Math.pow(mouseUpPosition.x - this.mouseDownPosition.x, 2) + 
      Math.pow(mouseUpPosition.y - this.mouseDownPosition.y, 2)
    );
    
    // Only register as a click if mouse moved less than 5 pixels (threshold for distinguishing click vs drag)
    const clickThreshold = 5;
    if (moveDistance < clickThreshold) {
      this.handleClick(event);
    }
  }

  onMouseMove(event) {
    if (!this.model || this.isMouseDown) return;
    
    // Update mouse position for raycasting
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Perform raycasting for hover effects
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.parts);

    // Clear previous hover
    this.clearHover();

    if (intersects.length > 0) {
      const hoveredMesh = intersects[0].object;
      this.setHover(hoveredMesh);
    }
  }

  onMouseLeave() {
    this.clearHover();
  }

  setHover(mesh) {
    if (this.hoveredPart === mesh || this.currentlyFocusedPart === mesh) return;
    
    this.hoveredPart = mesh;
    
    // Store original material if not already stored
    if (!this.originalMaterials.has(mesh)) {
      this.originalMaterials.set(mesh, mesh.material);
    }
    
    // Create hover material
    const originalMaterial = this.originalMaterials.get(mesh);
    const hoverMaterial = originalMaterial.clone();
    
    // Make it slightly brighter and add emissive glow
    if (hoverMaterial.color) {
      hoverMaterial.emissive.setHex(0x222222); // Subtle glow
    }
    hoverMaterial.transparent = true;
    hoverMaterial.opacity = 0.8;
    
    mesh.material = hoverMaterial;
    
    // Change cursor to pointer
    this.renderer.domElement.style.cursor = 'pointer';
  }

  clearHover() {
    if (this.hoveredPart && this.originalMaterials.has(this.hoveredPart)) {
      // Restore original material
      this.hoveredPart.material = this.originalMaterials.get(this.hoveredPart);
      this.hoveredPart = null;
    }
    
    // Reset cursor
    this.renderer.domElement.style.cursor = 'default';
  }

  handleClick(event) {
    if (!this.model) return;
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.parts);

    if (intersects.length > 0) {
      // Clicked on a part
      const selectedMesh = intersects[0].object;
      this.focusOnPart(selectedMesh);
    } else {
      // Clicked on empty space - deselect current part
      if (this.currentlyFocusedPart) {
        this.goBackToFullView();
      }
    }
  }

  loadModel(url, name) {
    this.clearModel();
    console.log(`Starting to load model: ${name} from ${url}`);
    
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        this.model = gltf.scene;
        this.scene.add(this.model);
        
        // Calculate model bounds and center it
        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Center the model at origin
        this.model.position.sub(center);
        
        // Fit model to available pane width
        this.fitModelToPane();
        
        this.parts = [];
        this.model.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            obj.userData.origin = obj.position.clone();
            this.parts.push(obj);
            
            // Improve materials
            if (obj.material) {
              if (!obj.material.isMeshStandardMaterial) {
                const oldMat = obj.material;
                const newMat = new THREE.MeshStandardMaterial({
                  color: oldMat.color || new THREE.Color(0x808080),
                  map: oldMat.map,
                  metalness: 0.3,
                  roughness: 0.7
                });
                obj.material = newMat;
              }
            }
          }
        });
        
        // Calculate consistent explosion directions for each part
        this.calculateExplosionDirections();
        
        this.hideEmptyState();
        this.removeTestCube();
        
        // Initialize slice to show whole object
        this.updateSliceDirection();
        this.updateSlice();
        
        // Setup animations if available
        this.setupAnimations(gltf.animations);
        
        console.log(`✅ Successfully loaded model: ${name}`);
        console.log(`   - Parts found: ${this.parts.length}`);
        console.log(`   - Model size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
        console.log(`   - Camera positioned at: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`);
        console.log(`   - Animations found: ${gltf.animations?.length || 0}`);
      },
      (progress) => {
        if (progress.total > 0) {
          const percent = (progress.loaded / progress.total * 100).toFixed(1);
          console.log(`Loading progress: ${percent}%`);
        }
      },
      (error) => {
        console.error('❌ Error loading model:', error);
        this.showEmptyState();
      }
    );
  }

  loadGLTFModel(url, name, customManager = null) {
    this.clearModel();
    console.log(`Starting to load GLTF model: ${name} from ${url}`);
    
    const loader = new GLTFLoader(customManager);
    loader.load(
      url,
      (gltf) => {
        this.model = gltf.scene;
        this.scene.add(this.model);
        
        // Calculate model bounds and center it
        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Center the model at origin
        this.model.position.sub(center);
        
        // Fit model to available pane width
        this.fitModelToPane();
        
        this.parts = [];
        this.model.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            obj.userData.origin = obj.position.clone();
            this.parts.push(obj);
            
            // Improve materials
            if (obj.material) {
              if (!obj.material.isMeshStandardMaterial) {
                const oldMat = obj.material;
                const newMat = new THREE.MeshStandardMaterial({
                  color: oldMat.color || new THREE.Color(0x808080),
                  map: oldMat.map,
                  metalness: 0.3,
                  roughness: 0.7
                });
                obj.material = newMat;
              }
            }
          }
        });
        
        // Calculate consistent explosion directions for each part
        this.calculateExplosionDirections();
        
        this.hideEmptyState();
        this.removeTestCube();
        
        // Initialize slice to show whole object
        this.updateSliceDirection();
        this.updateSlice();
        
        // Setup animations if available
        this.setupAnimations(gltf.animations);
        
        console.log(`✅ Successfully loaded GLTF model: ${name}`);
        console.log(`   - Parts found: ${this.parts.length}`);
        console.log(`   - Model size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
        console.log(`   - Camera positioned at: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`);
        console.log(`   - Animations found: ${gltf.animations?.length || 0}`);
      },
      (progress) => {
        if (progress.total > 0) {
          const percent = (progress.loaded / progress.total * 100).toFixed(1);
          console.log(`GLTF Loading progress: ${percent}%`);
        }
      },
      (error) => {
        console.error('❌ Error loading GLTF model:', error);
        this.showEmptyState();
      }
    );
  }

  fitModelToPane() {
    if (!this.model) return;
    
    // Get current container dimensions
    const rect = this.container.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    
    // Calculate model bounds
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Calculate distance based on container aspect ratio and model size
    const aspectRatio = containerWidth / containerHeight;
    const fov = this.camera.fov * (Math.PI / 180);
    
    // Base distance calculation for fitting model in view
    let distance = maxDim / (2 * Math.tan(fov / 2));
    
    // Adjust distance based on aspect ratio to ensure good fit
    if (aspectRatio < 1) {
      // Taller container - increase distance slightly
      distance *= 1.1;
    } else {
      // Wider container - can be closer
      distance *= 0.85;
    }
    
    // Add minimal breathing room to make object take more space in pane
    distance *= 1.15;
    
    // Ensure distance is within reasonable bounds to avoid clipping issues
    distance = Math.max(maxDim * 0.5, Math.min(distance, maxDim * 20));
    
    // Position camera at optimal viewing angle
    this.camera.position.set(distance * 0.8, distance * 0.5, distance * 0.8);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    
    console.log(`   - Fitted to pane: ${containerWidth}x${containerHeight}, distance: ${distance.toFixed(2)}, maxDim: ${maxDim.toFixed(2)}`);
  }

  clearModel() {
    // Clear hover state first
    this.clearHover();
    
    // Stop animations
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
    this.animations = [];
    this.currentAction = null;
    
    // Clear x-ray mode data
    this.originalMaterialOpacity.clear();
    this.isXrayMode = false;
    
    if (this.model) {
      this.scene.remove(this.model);
      this.model = null;
      this.parts = [];
      this.currentlyFocusedPart = null;
      this.hoveredPart = null;
      this.originalMaterials.clear(); // Clear material references
      this.showEmptyState();
    }
    
    // Reset x-ray slider UI
    const xraySlider = document.getElementById('xraySlider');
    const xrayValue = document.getElementById('xrayValue');
    if (xraySlider) xraySlider.value = 0;
    if (xrayValue) xrayValue.textContent = '0%';
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
  }

  calculateExplosionDirections() {
    if (!this.model || this.parts.length === 0) return;
    
    // Calculate model bounds and center
    const box = new THREE.Box3().setFromObject(this.model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // Sort parts by their distance from center for consistent ordering
    const sortedParts = [...this.parts].sort((a, b) => {
      const distA = a.userData.origin.distanceTo(center);
      const distB = b.userData.origin.distanceTo(center);
      return distA - distB;
    });
    
    // Calculate and store explosion direction for each part
    sortedParts.forEach((part, index) => {
      // Calculate direction from center to part
      let direction = new THREE.Vector3()
        .subVectors(part.userData.origin, center);
      
      // If part is too close to center, assign a unique direction
      if (direction.length() < 0.001) {
        // Distribute around sphere based on index using golden ratio
        const phi = Math.acos(1 - 2 * (index + 0.5) / this.parts.length); // Polar angle
        const theta = Math.PI * (1 + Math.sqrt(5)) * index; // Azimuthal angle (golden ratio)
        
        direction.set(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta)
        );
      } else {
        direction.normalize();
      }
      
      // Store the consistent direction in userData
      part.userData.explosionDirection = direction.clone();
    });
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
    const baseDistance = maxDimension * factor * 0.3;
    
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
    if (this.currentlyFocusedPart === selectedMesh) {
      this.goBackToFullView();
      return;
    }

    // Clear any hover state
    this.clearHover();

    // Store current camera state
    this.previousCameraState.position = this.camera.position.clone();
    this.previousCameraState.target = this.controls.target.clone();

    // Hide other parts
    this.parts.forEach(part => {
      if (part !== selectedMesh) {
        part.visible = false;
      }
    });

    // Focus on selected part
    const box = new THREE.Box3().setFromObject(selectedMesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;

    const newPosition = center.clone().add(new THREE.Vector3(distance, distance, distance));
    
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
      ease: "power2.inOut"
    });

    this.currentlyFocusedPart = selectedMesh;
    document.getElementById('backButtonOverlay').classList.add('visible');
    
    console.log(`Focused on part: ${selectedMesh.name || 'Unnamed part'}`);
  }

  goBackToFullView(animate = true) {
    if (!this.currentlyFocusedPart) return;

    // Show all parts and restore their original materials
    this.parts.forEach(part => {
      part.visible = true;
      // Restore original material if it was stored for hover effects
      if (this.originalMaterials.has(part)) {
        part.material = this.originalMaterials.get(part);
      }
    });

    if (animate && this.previousCameraState.position) {
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
        ease: "power2.inOut"
      });
    }

    this.currentlyFocusedPart = null;
    document.getElementById('backButtonOverlay').classList.remove('visible');
    
    console.log('Returned to full view');
  }

  reset() {
    this.params.explode = 0;
    this.params.slice = 1;
    this.params.sliceDirection = 'y';
    this.sliceDirection = 'y';
    
    // Reset slice direction to Y-axis
    this.updateSliceDirection();
    this.updateSlice();
    this.explode(0);
    this.goBackToFullView(false);
    this.controls.reset();
    
    // Reset animations
    if (this.currentAction) {
      this.currentAction.stop();
    }
    
    // Reset x-ray mode
    this.setXrayMode(0);
    
    // Refit model to current pane size
    if (this.model) {
      this.fitModelToPane();
    }
    
    // Reset slider values and radio buttons in the HTML
    const explodeSlider = document.getElementById('explodeSlider');
    const sliceSlider = document.getElementById('sliceSlider');
    const sliceYRadio = document.getElementById('sliceY');
    const explodeValue = document.getElementById('explodeValue');
    const sliceValue = document.getElementById('sliceValue');
    const animationSpeed = document.getElementById('animationSpeed');
    const animationSpeedValue = document.getElementById('animationSpeedValue');
    const xraySlider = document.getElementById('xraySlider');
    const xrayValue = document.getElementById('xrayValue');
    
    if (explodeSlider) explodeSlider.value = 0;
    if (sliceSlider) sliceSlider.value = 1;
    if (sliceYRadio) sliceYRadio.checked = true;
    if (explodeValue) explodeValue.textContent = '0%';
    if (sliceValue) sliceValue.textContent = '100%';
    if (animationSpeed) animationSpeed.value = 1;
    if (animationSpeedValue) animationSpeedValue.textContent = '1.0x';
    if (xraySlider) xraySlider.value = 0;
    if (xrayValue) xrayValue.textContent = '0%';
  }

  onResize() {
    const rect = this.container.getBoundingClientRect();
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height);
    
    // Refit model to new pane size if model is loaded
    if (this.model && !this.currentlyFocusedPart) {
      this.fitModelToPane();
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Update animation mixer
    if (this.mixer) {
      const delta = this.clock.getDelta();
      this.mixer.update(delta);
    }
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  addTestCube() {
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3 });
    this.testCube = new THREE.Mesh(geometry, material);
    this.testCube.position.set(0, 0, 0);
    this.scene.add(this.testCube);
    console.log('🟢 Test cube added to verify 3D rendering');
  }

  removeTestCube() {
    if (this.testCube) {
      this.scene.remove(this.testCube);
      this.testCube = null;
      console.log('🟢 Test cube removed');
    }
  }

  setupAnimations(animations) {
    if (!animations || animations.length === 0) {
      this.animations = [];
      this.mixer = null;
      return;
    }
    
    this.animations = [];
    this.mixer = new THREE.AnimationMixer(this.model);
    
    // Create animation actions for each animation clip
    animations.forEach((clip) => {
      const action = this.mixer.clipAction(clip);
      this.animations.push({
        name: clip.name || `Animation ${this.animations.length + 1}`,
        action: action,
        clip: clip
      });
    });
    
    console.log(`Animations setup: ${this.animations.length} animations found`);
  }

  selectAnimation(animationName) {
    if (!this.animations || this.animations.length === 0) return;
    
    // Stop current animation
    if (this.currentAction) {
      this.currentAction.stop();
    }
    
    const animationData = this.animations.find(a => a.name === animationName);
    if (animationData) {
      this.currentAction = animationData.action;
      this.updateAnimationButtons();
    }
  }

  playAnimation() {
    if (this.currentAction) {
      this.currentAction.play();
      this.updateAnimationButtons();
    }
  }

  pauseAnimation() {
    if (this.currentAction) {
      this.currentAction.paused = true;
      this.updateAnimationButtons();
    }
  }

  stopAnimation() {
    if (this.currentAction) {
      this.currentAction.stop();
      this.updateAnimationButtons();
    }
  }

  setAnimationSpeed(speed) {
    if (this.currentAction) {
      this.currentAction.setEffectiveTimeScale(speed);
    }
  }

  updateAnimationUI() {
    const animationSelect = document.getElementById('animationSelect');
    if (!animationSelect) return;
    
    // Clear existing options
    animationSelect.innerHTML = '';
    
    if (!this.animations || this.animations.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No animations available';
      animationSelect.appendChild(option);
      this.updateAnimationButtons();
      return;
    }
    
    // Add animation options
    this.animations.forEach((animationData) => {
      const option = document.createElement('option');
      option.value = animationData.name;
      option.textContent = animationData.name;
      animationSelect.appendChild(option);
    });
    
    // Select first animation by default
    if (this.animations.length > 0) {
      animationSelect.value = this.animations[0].name;
      this.selectAnimation(this.animations[0].name);
    }
  }

  updateAnimationButtons() {
    const hasAnimations = this.animations && this.animations.length > 0;
    const hasAction = this.currentAction !== null;
    const isPlaying = hasAction && this.currentAction.isRunning() && !this.currentAction.paused;
    
    document.getElementById('animationPlay').disabled = !hasAction || isPlaying;
    document.getElementById('animationPause').disabled = !hasAction || !isPlaying;
    document.getElementById('animationStop').disabled = !hasAction;
    document.getElementById('animationSelect').disabled = !hasAnimations;
  }

  setXrayMode(transparency) {
    if (!this.model) return;
    
    // Store original opacity values on first use
    if (!this.isXrayMode && this.originalMaterialOpacity.size === 0) {
      this.model.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          // Handle both single materials and material arrays
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((material, index) => {
            const key = `${obj.uuid}_${index}`;
            this.originalMaterialOpacity.set(key, {
              material: material,
              originalOpacity: material.opacity,
              originalTransparent: material.transparent
            });
          });
        }
      });
    }
    
    // Apply transparency to all materials
    this.model.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((material, index) => {
          const key = `${obj.uuid}_${index}`;
          const originalData = this.originalMaterialOpacity.get(key);
          
          if (originalData) {
            if (transparency > 0) {
              // Enable transparency and set new opacity
              material.transparent = true;
              // Calculate new opacity: start from original, reduce by transparency amount
              // transparency of 0.9 should make it very transparent (opacity 0.1)
              material.opacity = Math.max(0.1, originalData.originalOpacity * (1 - transparency));
              this.isXrayMode = true;
            } else {
              // Restore original values when transparency is 0
              material.opacity = originalData.originalOpacity;
              material.transparent = originalData.originalTransparent;
              this.isXrayMode = false;
            }
            
            // Ensure material updates are applied
            material.needsUpdate = true;
          }
        });
      }
    });
    
    console.log(`X-ray mode: transparency=${transparency}, isActive=${this.isXrayMode}`);
  }
}

/* ---------- Content Viewer Class ---------- */
class ContentViewer {
  constructor() {
    this.currentContent = null;
    this.currentPage = 1;
    this.totalPages = 1;
    this.zoomLevel = 1;
    this.pdfDoc = null;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.getElementById('prevPage').addEventListener('click', () => this.prevPage());
    document.getElementById('nextPage').addEventListener('click', () => this.nextPage());
    document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
    document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
  }

  async loadContent(content) {
    this.currentContent = content;
    this.hideAllViewers();
    
    if (content.type.includes('pdf')) {
      await this.loadPDF(content.url);
    } else if (content.type.includes('image')) {
      this.loadImage(content.url);
    } else {
      this.showUnsupportedViewer();
    }
  }

  async loadPDF(url) {
    try {
      // Import PDF.js
      const pdfjsLib = await import('https://unpkg.com/pdfjs-dist@latest/build/pdf.min.mjs');
      
      // Set worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.mjs';
      
      const loadingTask = pdfjsLib.getDocument(url);
      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      this.currentPage = 1;
      
      await this.renderPDFPage(this.currentPage);
      this.showPDFViewer();
      this.updateNavigation();
      
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.showUnsupportedViewer();
    }
  }

  async renderPDFPage(pageNum) {
    if (!this.pdfDoc) return;
    
    const page = await this.pdfDoc.getPage(pageNum);
    const canvas = document.getElementById('pdfCanvas');
    const context = canvas.getContext('2d');
    
    const viewport = page.getViewport({ scale: this.zoomLevel });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
  }

  loadImage(url) {
    const img = document.getElementById('imageDisplay');
    img.src = url;
    img.onload = () => {
      this.showImageViewer();
      this.updateNavigation();
    };
    img.onerror = () => {
      this.showUnsupportedViewer();
    };
  }

  clearContent() {
    this.currentContent = null;
    this.pdfDoc = null;
    this.hideAllViewers();
    this.showEmptyState();
  }

  hideAllViewers() {
    document.getElementById('contentViewerEmpty').style.display = 'none';
    document.getElementById('pdfViewer').classList.add('d-none');
    document.getElementById('imageViewer').classList.add('d-none');
    document.getElementById('unsupportedViewer').classList.add('d-none');
    document.getElementById('contentNavigation').classList.add('d-none');
  }

  showEmptyState() {
    document.getElementById('contentViewerEmpty').style.display = 'block';
  }

  showPDFViewer() {
    document.getElementById('pdfViewer').classList.remove('d-none');
    document.getElementById('contentNavigation').classList.remove('d-none');
  }

  showImageViewer() {
    document.getElementById('imageViewer').classList.remove('d-none');
    document.getElementById('contentNavigation').classList.remove('d-none');
  }

  showUnsupportedViewer() {
    document.getElementById('unsupportedViewer').classList.remove('d-none');
  }

  updateNavigation() {
    if (this.currentContent?.type.includes('pdf')) {
      document.getElementById('pageInfo').textContent = `Page ${this.currentPage} of ${this.totalPages}`;
      document.getElementById('prevPage').disabled = this.currentPage <= 1;
      document.getElementById('nextPage').disabled = this.currentPage >= this.totalPages;
    } else {
      document.getElementById('pageInfo').textContent = 'Image';
      document.getElementById('prevPage').disabled = true;
      document.getElementById('nextPage').disabled = true;
    }
    
    document.getElementById('zoomLevel').textContent = `${Math.round(this.zoomLevel * 100)}%`;
  }

  async prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.renderPDFPage(this.currentPage);
      this.updateNavigation();
    }
  }

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.renderPDFPage(this.currentPage);
      this.updateNavigation();
    }
  }

  async zoomIn() {
    this.zoomLevel = Math.min(this.zoomLevel * 1.2, 3);
    if (this.currentContent?.type.includes('pdf')) {
      await this.renderPDFPage(this.currentPage);
    }
    this.updateNavigation();
  }

  async zoomOut() {
    this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.5);
    if (this.currentContent?.type.includes('pdf')) {
      await this.renderPDFPage(this.currentPage);
    }
    this.updateNavigation();
  }
}

/* ---------- Drag and Drop Handler ---------- */
class DragDropHandler {
  constructor() {
    this.setupDropZones();
  }

  setupDropZones() {
    // 3D Models drop zone
    const modelsDropZone = document.getElementById('modelsDropZone');
    const modelsFileInput = document.getElementById('modelsFileInput');
    
    this.setupDropZone(modelsDropZone, modelsFileInput, (files) => {
      this.handleModelFiles(files);
    }, ['.glb', '.gltf']);

    // Content drop zone
    const contentDropZone = document.getElementById('contentDropZone');
    const contentFileInput = document.getElementById('contentFileInput');
    
    this.setupDropZone(contentDropZone, contentFileInput, (files) => {
      this.handleContentFiles(files);
    }, ['.pdf', '.png', '.jpg', '.jpeg']);
  }

  setupDropZone(dropZone, fileInput, onFiles, acceptedTypes) {
    // Drag events
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter(file => 
        acceptedTypes.some(type => file.name.toLowerCase().endsWith(type))
      );
      
      if (validFiles.length > 0) {
        onFiles(validFiles);
      }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      onFiles(files);
      e.target.value = ''; // Reset input
    });
  }

  handleModelFiles(files) {
    console.log('handleModelFiles called with:', files.length, 'files');
    
    // First pass: identify GLTF files and related files
    const gltfFiles = [];
    const relatedFiles = [];
    const standaloneFiles = [];
    
    files.forEach(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      
      if (extension === 'gltf') {
        gltfFiles.push(file);
      } else if (extension === 'glb') {
        standaloneFiles.push(file);
      } else if (['bin', 'jpg', 'jpeg', 'png', 'bmp', 'tiff'].includes(extension)) {
        relatedFiles.push(file);
      } else {
        console.warn('Unknown file type for 3D model:', file.name);
        standaloneFiles.push(file); // Try to load anyway
      }
    });
    
    // Process standalone files (GLB, etc.)
    standaloneFiles.forEach(file => {
      console.log('Processing standalone model file:', file.name, file.type, file.size);
      try {
        const modelId = assetManager.addModel(file);
        console.log('Added standalone model with ID:', modelId);
        // Auto-load the first model if none is currently loaded
        if (!assetManager.currentModel) {
          console.log('Auto-loading model:', modelId);
          assetManager.loadModel(modelId);
        }
      } catch (error) {
        console.error('Error handling standalone model file:', error);
      }
    });
    
    // Process GLTF files
    gltfFiles.forEach(file => {
      console.log('Processing GLTF model file:', file.name, file.type, file.size);
      try {
        const modelId = assetManager.addModel(file);
        console.log('Added GLTF model with ID:', modelId);
        
        // Auto-load the first model if none is currently loaded
        if (!assetManager.currentModel) {
          console.log('Auto-loading GLTF model:', modelId);
          assetManager.loadModel(modelId);
        }
      } catch (error) {
        console.error('Error handling GLTF model file:', error);
      }
    });
    
    // Process related files and try to match them to GLTF models
    relatedFiles.forEach(file => {
      console.log('Processing related file:', file.name, file.type, file.size);
      try {
        const wasAdded = assetManager.addRelatedFile(file);
        if (!wasAdded) {
          console.warn('Could not match related file to any GLTF model:', file.name);
          // Could potentially treat as a standalone model or texture
        }
      } catch (error) {
        console.error('Error handling related file:', error);
      }
    });
  }

  handleContentFiles(files) {
    console.log('handleContentFiles called with:', files.length, 'files');
    files.forEach(file => {
      console.log('Processing content file:', file.name, file.type, file.size);
      try {
        const contentId = assetManager.addContent(file);
        console.log('Added content with ID:', contentId);
        // Auto-load the first content if none is currently loaded
        if (!assetManager.currentContent) {
          console.log('Auto-loading content:', contentId);
          assetManager.loadContent(contentId);
        }
      } catch (error) {
        console.error('Error handling content file:', error);
      }
    });
  }
}

/* ---------- Recording System (Simplified) ---------- */
class RecordingManager {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordedEvents = [];
    this.recordingStartTime = null;
    this.recordingState = 'idle';
    this.currentAudio = null;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.getElementById('btnRecord').addEventListener('click', () => this.startRecording());
    document.getElementById('btnStop').addEventListener('click', () => this.stopRecording());
    document.getElementById('btnPlay').addEventListener('click', () => this.playRecording());
    document.getElementById('btnPause').addEventListener('click', () => this.pauseRecording());
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.recordedEvents = [];
      this.recordingStartTime = Date.now();
      
      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };
      
      this.mediaRecorder.start();
      this.recordingState = 'recording';
      this.updateButtonStates();
      
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.recordingState === 'recording') {
      this.mediaRecorder.stop();
      this.recordingState = 'stopped';
      this.updateButtonStates();
      
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.currentAudio = URL.createObjectURL(audioBlob);
        console.log('Recording stopped');
      };
    }
  }

  playRecording() {
    if (this.currentAudio) {
      const audio = new Audio(this.currentAudio);
      audio.play();
      this.recordingState = 'playing';
      this.updateButtonStates();
      
      audio.onended = () => {
        this.recordingState = 'stopped';
        this.updateButtonStates();
      };
    }
  }

  pauseRecording() {
    // Simplified pause functionality
    this.recordingState = 'paused';
    this.updateButtonStates();
  }

  updateButtonStates() {
    const btnRecord = document.getElementById('btnRecord');
    const btnStop = document.getElementById('btnStop');
    const btnPlay = document.getElementById('btnPlay');
    const btnPause = document.getElementById('btnPause');

    // Reset all states
    [btnRecord, btnStop, btnPlay, btnPause].forEach(btn => btn.disabled = false);

    switch (this.recordingState) {
      case 'idle':
        btnStop.disabled = true;
        btnPlay.disabled = true;
        btnPause.disabled = true;
        break;
      case 'recording':
        btnRecord.disabled = true;
        btnPlay.disabled = true;
        btnPause.disabled = true;
        break;
      case 'stopped':
        btnPause.disabled = true;
        btnPlay.disabled = !this.currentAudio;
        break;
      case 'playing':
        btnRecord.disabled = true;
        btnPlay.disabled = true;
        break;
    }
  }
}

/* ---------- Initialize Application ---------- */
const assetManager = new AssetManager();
const viewer3D = new Viewer3D('viewer3D');
const contentViewer = new ContentViewer();
const dragDropHandler = new DragDropHandler();
const recordingManager = new RecordingManager();

// Make instances globally accessible for debugging and drawer resize functionality
window.assetManager = assetManager;
window.viewer3D = viewer3D;

// Remove direct model loading - let users upload their own models
// This was bypassing the AssetManager system and not showing in the drawer
console.log('Interactive 3D Learning Platform initialized - ready for file uploads');

// Back button functionality
document.getElementById('btnBack').addEventListener('click', () => {
  viewer3D.goBackToFullView();
});

// Initially hide back button
document.getElementById('backButtonOverlay').classList.remove('visible');

// Monitor drawer state changes for automatic model refitting
function setupDrawerResizeObserver() {
  // Monitor the 3D viewer container for size changes
  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target.id === 'viewer3D') {
          // Debounce resize calls to avoid excessive refitting
          clearTimeout(viewer3D.resizeTimeout);
          viewer3D.resizeTimeout = setTimeout(() => {
            viewer3D.onResize();
          }, 100);
        }
      }
    });
    
    resizeObserver.observe(document.getElementById('viewer3D'));
  } else {
    // Fallback for browsers without ResizeObserver
    // Monitor drawer toggle clicks manually
    document.addEventListener('click', (e) => {
      if (e.target.closest('.drawer-toggle')) {
        setTimeout(() => {
          viewer3D.onResize();
        }, 300); // Wait for CSS transition to complete
      }
    });
  }
}

// Initialize drawer resize monitoring
setupDrawerResizeObserver();

console.log('Interactive 3D Learning Platform initialized');
