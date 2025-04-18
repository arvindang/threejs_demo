import * as THREE from 'https://unpkg.com/three@0.164.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.164.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.164.0/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'https://unpkg.com/lil-gui@0.19.2/dist/lil-gui.module.js';

/* ---------- scene setup ---------- */
const container = document.getElementById('viewer');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf8f9fa);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(3, 2, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

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
gui.domElement.style.top = '10px';
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
const loader = new GLTFLoader();
const URL = 'https://raw.githubusercontent.com/KhronosGroup/' +
            'glTF-Sample-Models/master/2.0/GearboxAssy/glTF-Binary/GearboxAssy.glb';

let model, parts = [];
loader.load(URL, (gltf) => {
  model = gltf.scene;
  scene.add(model);

  /* collect child meshes for explode algorithm */
  model.traverse((obj) => {
    if (obj.isMesh) {
      obj.userData.origin = obj.position.clone();
      parts.push(obj);
    }
  });

  /* centre and scale */
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3()).length();
  const centre = box.getCenter(new THREE.Vector3());
  model.position.sub(centre);      // centre at (0,0,0)
  camera.position.set(size * 0.6, size * 0.3, size * 0.6);
}, undefined, console.error);

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
