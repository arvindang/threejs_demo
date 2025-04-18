import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19.2/dist/lil-gui.module.min.js';

class GLTFViewer {
  constructor(container) {
    this.container = container;
    this.parts = [];
    this.model = null;
    this.loadingManager = new THREE.LoadingManager();
    this.setupLoadingManager();
    this.setupScene();
    this.setupControls();
    this.setupLighting();
    this.setupGUI();
    this.setupEventListeners();
    this.animate();
    
    // Model URL paths
    this.modelURLs = {
      'GearboxAssy (GLB)': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/GearboxAssy/glTF-Binary/GearboxAssy.glb',
      'GearboxAssy (GLTF)': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/GearboxAssy/glTF/GearboxAssy.gltf',
      'GearboxAssy (Draco)': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/GearboxAssy/glTF-Draco/GearboxAssy.gltf'
    };
  }

  setupLoadingManager() {
    // Loading progress indicator
    const loadingElement = document.createElement('div');
    loadingElement.id = 'loading';
    loadingElement.style.position = 'absolute';
    loadingElement.style.top = '50%';
    loadingElement.style.left = '50%';
    loadingElement.style.transform = 'translate(-50%, -50%)';
    loadingElement.style.fontSize = '24px';
    loadingElement.style.fontWeight = 'bold';
    loadingElement.style.color = '#333';
    loadingElement.style.display = 'none';
    loadingElement.textContent = 'Loading model...';
    this.container.appendChild(loadingElement);

    this.loadingManager.onStart = () => {
      loadingElement.style.display = 'block';
    };

    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = Math.round((itemsLoaded / itemsTotal) * 100);
      loadingElement.textContent = `Loading model... ${progress}%`;
    };

    this.loadingManager.onLoad = () => {
      loadingElement.style.display = 'none';
    };

    this.loadingManager.onError = (url) => {
      loadingElement.textContent = `Error loading: ${url}`;
    };
  }

  setupScene() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45, this.container.clientWidth / this.container.clientHeight, 0.1, 1000
    );
    this.camera.position.set(5, 5, 5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
    
    // Clipping plane for slicing
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1);
    this.renderer.clippingPlanes = [this.clipPlane];
    this.renderer.localClippingEnabled = true;
  }

  setupControls() {
    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.enableZoom = true;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 100;
    this.controls.screenSpacePanning = true;
  }

  setupLighting() {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    // Directional light (for shadows)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(5, 10, 5);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(this.directionalLight);

    // Environment map for reflection
    this.setupEnvironmentMap();
  }

  setupEnvironmentMap() {
    // Default environment map
    const rgbeLoader = new RGBELoader(this.loadingManager);
    const envMapURL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/equirectangular/venice_sunset_1k.hdr';
    
    rgbeLoader.load(envMapURL, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.environment = texture;
      
      // Optionally show environment as background
      // this.scene.background = texture;
    });
  }

  setupGUI() {
    // GUI parameters
    this.params = {
      autoRotate: false,
      explode: 0,
      slice: 1,
      model: Object.keys(this.modelURLs)[0],
      reset: () => this.resetView()
    };

    // Create GUI
    this.gui = new GUI({ 
      title: 'Model Controls',
      container: this.container,
      width: 300
    });

    // Add controls
    this.gui.add(this.params, 'model', Object.keys(this.modelURLs))
      .name('Select Model')
      .onChange((value) => {
        this.loadModel(this.modelURLs[value]);
      });
      
    this.gui.add(this.params, 'autoRotate')
      .name('Auto Rotate')
      .onChange((value) => {
        this.controls.autoRotate = value;
      });

    this.gui.add(this.params, 'explode', 0, 1, 0.01)
      .name('Explode View')
      .onChange((value) => this.explode(value));

    this.gui.add(this.params, 'slice', -1, 1, 0.01)
      .name('Slice View')
      .onChange((value) => {
        this.clipPlane.constant = value;
      });

    this.gui.add(this.params, 'reset')
      .name('Reset View');

    // Style GUI
    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '10px';
    this.gui.domElement.style.right = '10px';
    const guiEl = this.gui.domElement;
    guiEl.style.backgroundColor = 'rgba(5, 5, 5, 0.8)';
    guiEl.style.borderRadius = '5px';
    guiEl.style.padding = '5px';
  }

  setupEventListeners() {
    // Handle window resize
    window.addEventListener('resize', () => this.onResize());
    
    // Handle drag and drop of models
    this.container.addEventListener('dragover', (event) => {
      event.preventDefault();
    });
    
    this.container.addEventListener('drop', (event) => {
      event.preventDefault();
      
      if (event.dataTransfer.items) {
        const items = event.dataTransfer.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file') {
            const file = items[i].getAsFile();
            if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
              const url = URL.createObjectURL(file);
              this.loadModel(url);
              break;
            } else if (file.name.endsWith('.hdr') || file.name.endsWith('.exr')) {
              const url = URL.createObjectURL(file);
              const rgbeLoader = new RGBELoader();
              rgbeLoader.load(url, (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                this.scene.environment = texture;
              });
            }
          }
        }
      }
    });
  }

  loadModel(url) {
    // Clear existing model
    if (this.model) {
      this.scene.remove(this.model);
      this.model = null;
      this.parts = [];
    }

    // Set up loaders
    const gltfLoader = new GLTFLoader(this.loadingManager);
    const dracoLoader = new DRACOLoader(this.loadingManager);
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/libs/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);

    // Load model
    gltfLoader.load(url, (gltf) => {
      this.model = gltf.scene;
      this.scene.add(this.model);

      // Collect parts for explode view
      this.parts = [];
      this.model.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          obj.userData.origin = obj.position.clone();
          this.parts.push(obj);
        }
      });

      // Center and scale model
      const box = new THREE.Box3().setFromObject(this.model);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      
      this.model.position.x = -center.x;
      this.model.position.y = -center.y;
      this.model.position.z = -center.z;
      
      // Position camera to see the whole model
      this.camera.position.set(size * 0.6, size * 0.4, size * 0.8);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
      
      // Reset controls
      this.resetView();
    });
  }

  explode(factor) {
    for (const mesh of this.parts) {
      if (mesh.userData.origin) {
        const dir = mesh.userData.origin.clone().normalize(); // radial direction
        mesh.position.lerpVectors(
          mesh.userData.origin,
          mesh.userData.origin.clone().add(dir),
          factor
        );
      }
    }
  }

  resetView() {
    this.params.explode = 0;
    this.params.slice = 1;
    this.clipPlane.constant = 1;
    this.explode(0);
    this.controls.reset();
    this.gui.refresh();
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the viewer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('viewer');
  if (container) {
    const viewer = new GLTFViewer(container);
    // Load default model
    viewer.loadModel(viewer.modelURLs[Object.keys(viewer.modelURLs)[0]]);
  }
});

export { GLTFViewer }; 