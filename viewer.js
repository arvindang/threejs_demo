import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19.2/+esm';

/* ---------- scene setup ---------- */
const container = document.getElementById('viewer');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf8f9fa);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(3, 2, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

/* Add lighting to the scene */
// Ambient light for overall illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

// Directional light for shadows and directional lighting
const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

// Add a hemisphere light for more natural lighting
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x404040, 0.8);
scene.add(hemisphereLight);

// Add a visible light indicator
const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 1);
scene.add(lightHelper);

// Add axes helper to show coordinate system
const axesHelper = new THREE.AxesHelper(2);
scene.add(axesHelper);

/* orbit / zoom / pan */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

/* clipping plane (Y‑axis slice) */
const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1);
renderer.clippingPlanes = [clipPlane];
renderer.localClippingEnabled = true;

/* ---------- GUI controls ---------- */
// Create the parameters object for GUI
const params = {
  explode: 0,
  slice: 1,
  reset: function() {
    params.explode = 0;
    params.slice = 1;
    clipPlane.constant = 1;
    explode(0);
    controls.reset();
    gui.refresh();
  }
};

// Create GUI
const gui = new GUI({ 
  title: 'Gearbox Controls',
  container: container,
  width: 300
});
gui.add(params, 'explode', 0, 1, 0.01)
   .name('Explode View')
   .onChange(explode);
gui.add(params, 'slice', -1, 1, 0.01)
   .name('Slice View')
   .onChange(value => {
     clipPlane.constant = value;
   });
gui.add(params, 'reset')
   .name('Reset View');

// Adjust GUI positioning and style
gui.domElement.style.position = 'absolute';
gui.domElement.style.top = '50px';
gui.domElement.style.right = '10px';
// Make GUI more visible with custom styling
const guiEl = gui.domElement;
guiEl.style.backgroundColor = 'rgba(5, 5, 5, 0.8)';
guiEl.style.borderRadius = '5px';
guiEl.style.padding = '5px';
guiEl.style.fontFamily = 'Arial, sans-serif';
guiEl.style.fontSize = '14px';
guiEl.style.userSelect = 'none';

/* ---------- load GLB model ---------- */
// Add a wireframe cube as a placeholder
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe: true
});
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
scene.add(cube);

const loader = new GLTFLoader();
const URL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/GearboxAssy/glTF-Binary/GearboxAssy.glb';

let model, parts = [];

loader.load(
  URL, 
  // Success callback
  (gltf) => {
    // Remove placeholder cube
    scene.remove(cube);
    
    model = gltf.scene;
    scene.add(model);

    /* Check for animations */
    if (gltf.animations && gltf.animations.length > 0) {
      console.log('Model contains animations:', gltf.animations);
      // You could store these animations for later use:
      // model.animations = gltf.animations; 
    } else {
      console.log('Model does not contain animations.');
    }

    /* collect child meshes for explode algorithm */
    let partCount = 0;
    model.traverse((obj) => {
      if (obj.isMesh) {
        // Enable shadows
        obj.castShadow = true;
        obj.receiveShadow = true;
        
        // Store original position for explode view
        obj.userData.origin = obj.position.clone();
        parts.push(obj);
        partCount++;
        
        // Force PBR material settings
        if (obj.material) {
          // Create a new MeshStandardMaterial if needed
          if (!obj.material.isMeshStandardMaterial) {
            const oldMat = obj.material;
            const newMat = new THREE.MeshStandardMaterial({
              color: oldMat.color || new THREE.Color(0x808080),
              map: oldMat.map,
              metalness: 0.3,
              roughness: 0.7
            });
            obj.material = newMat;
          } else {
            // Just update the existing material
            obj.material.metalness = 0.3;
            obj.material.roughness = 0.7;
          }
          
          // Assign different colors to materials based on index
          const colorIndex = parts.length % 6;
          const colors = [
            0xE57373, // red
            0x81C784, // green
            0x64B5F6, // blue
            0xFFD54F, // yellow
            0xBA68C8, // purple
            0x4DB6AC  // teal
          ];
          const hexColor = colors[colorIndex];
          obj.material.color.setHex(hexColor);
          obj.material.needsUpdate = true;
        }
      }
    });

    /* centre and scale */
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3()).length();
    const centre = box.getCenter(new THREE.Vector3());
    model.position.sub(centre);      // centre at (0,0,0)
    camera.position.set(size * 0.6, size * 0.3, size * 0.6);
  },
  
  // Progress callback (optional)
  () => {},

  // Error callback
  (error) => {
    const errorMsg = `ERROR loading GLTF model: ${error.message || 'Unknown loading error'}`;
    console.error(errorMsg, error);
  }
);

// Add an environment map for reflections and better lighting
const envMapTexture = new THREE.TextureLoader().load(
  'https://threejs.org/examples/textures/2294472375_24a3b8ef46_o.jpg', 
  function(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.environment = texture; // Assign inside onLoad
  },
  undefined,
  function(error) {
    console.error(`ERROR loading environment map: ${error.message || 'Unknown error'}`, error);
  }
);

/* explode helper */
function explode(factor) {
  for (const mesh of parts) {
    const dir = mesh.userData.origin.clone().normalize(); // radial
    mesh.position.lerpVectors(mesh.userData.origin, mesh.userData.origin.clone().add(dir), factor);
  }
}

/* responsive canvas */
function onResize() {
  const { clientWidth: w, clientHeight: h } = container;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);
onResize();

/* render loop */
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
