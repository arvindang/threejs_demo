import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19.2/+esm';
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";

/* ---------- Asset Management ---------- */
class AssetManager {
  constructor() {
    this.models3D = new Map();
    this.contentAssets = new Map();
    this.currentModel = null;
    this.currentContent = null;
  }

  addModel(file, id = null) {
    const modelId = id || `model_${Date.now()}`;
    const url = URL.createObjectURL(file);
    
    this.models3D.set(modelId, {
      id: modelId,
      name: file.name,
      file: file,
      url: url,
      type: file.type,
      size: file.size
    });
    
    this.updateModelsUI();
    return modelId;
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
      viewer3D.loadModel(model.url, model.name);
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
    const modelsList = document.getElementById('modelsList');
    
    if (this.models3D.size === 0) {
      modelsList.innerHTML = '<div class="text-muted small text-center py-3">No models uploaded yet</div>';
      return;
    }

    modelsList.innerHTML = '';
    this.models3D.forEach((model, id) => {
      const item = document.createElement('div');
      item.className = `asset-item p-2 mb-2 rounded border ${this.currentModel === id ? 'active' : ''}`;
      item.innerHTML = `
        <div class="d-flex align-items-center justify-content-between">
          <div class="flex-grow-1 model-item-content" data-model-id="${id}" style="cursor: pointer;">
            <div class="fw-semibold small">${model.name}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${this.formatFileSize(model.size)}</div>
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
    });
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
    
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
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
    
    // Add a test cube to verify 3D rendering is working
    this.addTestCube();
    
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
    
    this.animate();
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
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1);
    this.renderer.clippingPlanes = [this.clipPlane];
    this.renderer.localClippingEnabled = true;
  }

  setupGUI() {
    this.params = {
      explode: 0,
      slice: 1,
      reset: () => this.reset()
    };

    this.gui = new GUI({ 
      title: '3D Controls',
      container: this.container,
      width: 250
    });
    
    this.explodeController = this.gui.add(this.params, 'explode', 0, 1, 0.01)
       .name('Explode View')
       .onChange((value) => this.explode(value));
       
    this.sliceController = this.gui.add(this.params, 'slice', -1, 1, 0.01)
       .name('Slice View')
       .onChange((value) => {
         this.clipPlane.constant = value;
       });
       
    this.gui.add(this.params, 'reset').name('Reset View');

    // Style GUI
    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '10px';
    this.gui.domElement.style.right = '10px';
    this.gui.domElement.style.backgroundColor = 'rgba(5, 5, 5, 0.8)';
    this.gui.domElement.style.borderRadius = '5px';
    this.gui.domElement.style.padding = '5px';
  }

  setupRaycasting() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.renderer.domElement.addEventListener('click', (event) => this.onCanvasClick(event));
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
        
        // Position camera based on model size
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2.5; // Give some breathing room
        
        this.camera.position.set(distance, distance * 0.7, distance);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        
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
        
        this.hideEmptyState();
        this.removeTestCube();
        console.log(`✅ Successfully loaded model: ${name}`);
        console.log(`   - Parts found: ${this.parts.length}`);
        console.log(`   - Model size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
        console.log(`   - Camera positioned at: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`);
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

  clearModel() {
    if (this.model) {
      this.scene.remove(this.model);
      this.model = null;
      this.parts = [];
      this.currentlyFocusedPart = null;
      this.showEmptyState();
    }
  }

  showEmptyState() {
    document.getElementById('viewer3DEmpty').style.display = 'block';
  }

  hideEmptyState() {
    document.getElementById('viewer3DEmpty').style.display = 'none';
  }

  explode(factor) {
    if (!this.model) return;
    
    const center = new THREE.Vector3();
    const box = new THREE.Box3().setFromObject(this.model);
    box.getCenter(center);

    this.parts.forEach((part) => {
      const direction = new THREE.Vector3()
        .subVectors(part.userData.origin, center)
        .normalize();
      
      const distance = factor * 2;
      const newPosition = new THREE.Vector3()
        .copy(part.userData.origin)
        .add(direction.multiplyScalar(distance));
      
      part.position.copy(newPosition);
    });
  }

  onCanvasClick(event) {
    if (!this.model) return;
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.parts);

    if (intersects.length > 0) {
      const selectedMesh = intersects[0].object;
      this.focusOnPart(selectedMesh);
    }
  }

  focusOnPart(selectedMesh) {
    if (this.currentlyFocusedPart === selectedMesh) {
      this.goBackToFullView();
      return;
    }

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
    document.getElementById('btnBack').style.display = 'inline-block';
  }

  goBackToFullView(animate = true) {
    if (!this.currentlyFocusedPart) return;

    // Show all parts
    this.parts.forEach(part => {
      part.visible = true;
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
    document.getElementById('btnBack').style.display = 'none';
  }

  reset() {
    this.params.explode = 0;
    this.params.slice = 1;
    this.clipPlane.constant = 1;
    this.explode(0);
    this.goBackToFullView(false);
    this.controls.reset();
    this.gui.refresh();
  }

  onResize() {
    const rect = this.container.getBoundingClientRect();
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
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
    files.forEach(file => {
      const modelId = assetManager.addModel(file);
      // Auto-load the first model if none is currently loaded
      if (!assetManager.currentModel) {
        assetManager.loadModel(modelId);
      }
    });
  }

  handleContentFiles(files) {
    files.forEach(file => {
      const contentId = assetManager.addContent(file);
      // Auto-load the first content if none is currently loaded
      if (!assetManager.currentContent) {
        assetManager.loadContent(contentId);
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

// Make assetManager globally accessible for any remaining references
window.assetManager = assetManager;

// Load default 3D model after initialization
setTimeout(() => {
  const defaultModelUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/GearboxAssy/glTF-Binary/GearboxAssy.glb';
  console.log('Loading default gearbox model...');
  viewer3D.loadModel(defaultModelUrl, 'Sample Gearbox Assembly');
}, 100);

// Back button functionality
document.getElementById('btnBack').addEventListener('click', () => {
  viewer3D.goBackToFullView();
});

// Initially hide back button
document.getElementById('btnBack').style.display = 'none';

console.log('Interactive 3D Learning Platform initialized');
