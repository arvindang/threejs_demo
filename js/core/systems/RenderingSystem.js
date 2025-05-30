import * as THREE from 'https://unpkg.com/three@0.164.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.164.0/examples/jsm/controls/OrbitControls.js';

/**
 * RenderingSystem handles Three.js scene, camera, renderer, lighting, and render loop
 */
export class RenderingSystem {
  constructor(container) {
    this.container = container;
    this.initializeRenderer();
    this.initializeScene();
    this.initializeCamera();
    this.initializeLighting();
    this.initializeControls();
    this.initializeClipping();
    
    // Animation system
    this.clock = new THREE.Clock();
    
    this.container.appendChild(this.renderer.domElement);
    
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
    
    this.startRenderLoop();
  }

  initializeRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  initializeScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8f9fa);
  }

  initializeCamera() {
    // Increase far clipping plane to prevent model disappearing when zooming out
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 10000);
    // Set a more neutral initial position that will be overridden when model loads
    this.camera.position.set(5, 3, 8);
    // Point camera toward origin initially
    this.camera.lookAt(0, 0, 0);
  }

  initializeLighting() {
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

  initializeControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
  }

  initializeClipping() {
    // Default to Y-axis slicing (existing behavior)
    this.sliceDirection = 'y';
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    this.renderer.clippingPlanes = [this.clipPlane];
    this.renderer.localClippingEnabled = true;
  }

  onResize() {
    if (!this.container) return;
    
    const containerRect = this.container.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;
    
    // Validate dimensions
    if (width <= 0 || height <= 0) {
      console.warn('Invalid container dimensions detected:', { width, height });
      return;
    }
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    
    console.log('3D Viewer resized to:', width, 'x', height, 'aspect ratio:', this.camera.aspect);
  }

  startRenderLoop() {
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Update controls
    this.controls.update();
    
    // Update animations (will be handled by AnimationSystem later)
    if (this.mixer) {
      this.mixer.update(this.clock.getDelta());
    }
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  // Getters for other systems to access Three.js objects
  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  getRenderer() {
    return this.renderer;
  }

  getControls() {
    return this.controls;
  }

  getClipPlane() {
    return this.clipPlane;
  }

  // For animation system integration
  setMixer(mixer) {
    this.mixer = mixer;
  }

  // For slice direction changes
  setSliceDirection(direction) {
    this.sliceDirection = direction;
    switch (direction) {
      case 'x':
        this.clipPlane.normal.set(-1, 0, 0);
        break;
      case 'y':
        this.clipPlane.normal.set(0, -1, 0);
        break;
      case 'z':
        this.clipPlane.normal.set(0, 0, -1);
        break;
      default:
        this.clipPlane.normal.set(0, -1, 0);
    }
    console.log(`Slice direction changed to: ${direction.toUpperCase()}-axis`);
  }

  // Clean up resources
  dispose() {
    window.removeEventListener('resize', () => this.onResize());
    this.renderer.dispose();
    this.controls.dispose();
  }
} 