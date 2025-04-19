import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19.2/+esm';
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm"; // Added for animation

/* ---------- Recording State ---------- */
let mediaRecorder;
let audioChunks = [];
let recordedEvents = [];
let recordingStartTime;
let stateCaptureInterval;
let playbackLoop;
let currentAudio = null;
let recordingState = 'idle'; // idle, recording, stopped, playing, paused

/* ---------- Focus State ---------- */
let currentlyFocusedPart = null;
let previousCameraState = { position: null, target: null }; // To store state before focusing

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

/* ---------- Raycasting Setup ---------- */
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

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
    goBackToFullView(false); // Ensure we are not in focused view, don't animate
    controls.reset();
    resetRecording();
    gui.refresh();
  }
};

// Create GUI
const gui = new GUI({ 
  title: 'Gearbox Controls',
  container: container,
  width: 300
});
const explodeController = gui.add(params, 'explode', 0, 1, 0.01)
   .name('Explode View')
   .onChange(explode);
const sliceController = gui.add(params, 'slice', -1, 1, 0.01)
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
    // Ensure explode doesn't interfere with focus position
    if (!currentlyFocusedPart || mesh === currentlyFocusedPart) {
        mesh.position.lerpVectors(mesh.userData.origin, mesh.userData.origin.clone().add(dir), factor);
    } else if (currentlyFocusedPart) {
        // If focused on another part, keep this one at its origin
        mesh.position.copy(mesh.userData.origin);
    }
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

/* ---------- Part Selection/Focus Logic ---------- */

const btnBack = document.getElementById('btnBack');

function setFocusState(targetPart) {
  currentlyFocusedPart = targetPart;
  parts.forEach(mesh => {
    mesh.visible = (targetPart === null || mesh === targetPart);
  });
  // Update button state based on focus AND recording state
  updateButtonStates();

  // Maybe disable explode/slice controls when focused?
  explodeController.domElement.parentElement.parentElement.style.pointerEvents = targetPart ? 'none' : '';
  explodeController.domElement.parentElement.parentElement.style.opacity = targetPart ? '0.5' : '1';
  sliceController.domElement.parentElement.parentElement.style.pointerEvents = targetPart ? 'none' : '';
  sliceController.domElement.parentElement.parentElement.style.opacity = targetPart ? '0.5' : '1';
}

function focusOnPart(selectedMesh) {
  if (!selectedMesh || selectedMesh === currentlyFocusedPart) return;

  // Store previous state only if not already focused
  if (!currentlyFocusedPart) {
    previousCameraState.position = camera.position.clone();
    previousCameraState.target = controls.target.clone();
  }

  setFocusState(selectedMesh);
  params.explode = 0; // Reset explode when focusing
  explode(0);
  gui.refresh(); // Update GUI display for explode slider

  // Calculate bounding box and target camera position
  const box = new THREE.Box3().setFromObject(selectedMesh);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  const camDistance = size * 1.5; // Adjust multiplier for desired distance

  // Use GSAP for smooth animation
  gsap.to(camera.position, {
    duration: 0.8,
    x: center.x + camDistance * 0.6, // Adjust view angle
    y: center.y + camDistance * 0.4,
    z: center.z + camDistance * 0.6,
    ease: "power2.inOut",
    onUpdate: () => camera.lookAt(center) // Ensure camera keeps looking at center during tween
  });
  gsap.to(controls.target, {
    duration: 0.8,
    x: center.x,
    y: center.y,
    z: center.z,
    ease: "power2.inOut"
  });

}

function goBackToFullView(animate = true) {
  if (!currentlyFocusedPart) return;

  const targetPosition = previousCameraState.position || new THREE.Vector3(3, 2, 6); // Default if no state saved
  const targetTarget = previousCameraState.target || new THREE.Vector3(0, 0, 0);

  setFocusState(null);
  params.explode = 0; // Ensure explode is reset
  explode(0);
  gui.refresh(); // Update GUI

  if (animate && previousCameraState.position && previousCameraState.target) {
      gsap.to(camera.position, {
          duration: 0.8,
          x: targetPosition.x,
          y: targetPosition.y,
          z: targetPosition.z,
          ease: "power2.inOut",
          onUpdate: () => camera.lookAt(controls.target) // Look at the animating target
      });
      gsap.to(controls.target, {
          duration: 0.8,
          x: targetTarget.x,
          y: targetTarget.y,
          z: targetTarget.z,
          ease: "power2.inOut"
      });
  } else {
      // If not animating or no previous state, jump instantly
      camera.position.copy(targetPosition);
      controls.target.copy(targetTarget);
  }
}

function onCanvasClick(event) {
  // Don't select if interacting with GUI
  if (gui.domElement.contains(event.target) || (btnBack && btnBack.contains(event.target))) {
      return;
  }
  // Don't select if recording controls are interacted with
  if (event.target.closest('.card-footer')) {
      return;
  }
  // Don't select if already focused and clicking the background
  if (currentlyFocusedPart && event.target === renderer.domElement) {
      // Calculate mouse position relative to the canvas
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(parts); // Only check parts

      // If click was on canvas bg (no intersection), go back
      if (intersects.length === 0) {
          goBackToFullView();
          return; // Don't proceed to select
      }
  }

  // Calculate mouse position relative to the canvas
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(parts); // Only check parts

  if (intersects.length > 0) {
    // Check if the first intersected object is visible (avoids selecting hidden parts)
    if (intersects[0].object.visible) {
        focusOnPart(intersects[0].object);
    }
  }
}

// Add event listeners
renderer.domElement.addEventListener('click', onCanvasClick);
if (btnBack) {
  btnBack.addEventListener('click', () => goBackToFullView());
}

/* ---------- Recording/Playback Logic ---------- */

function updateButtonStates() {
  btnRecord.disabled = recordingState === 'recording' || recordingState === 'playing';
  btnStop.disabled = recordingState !== 'recording';
  btnPlay.disabled = recordingState === 'recording' || recordingState === 'playing' || audioChunks.length === 0;
  btnPause.disabled = recordingState !== 'playing';
  // Back button: Disable if playing OR if not focused on a part
  if (btnBack) {
    btnBack.disabled = (recordingState === 'playing' || currentlyFocusedPart === null);
  }
  // Disable sliders during playback/recording?
  // explodeSlider.disabled = recordingState === 'recording' || recordingState === 'playing';
  // sliceSlider.disabled = recordingState === 'recording' || recordingState === 'playing';
}

async function startRecording() {
  if (recordingState !== 'idle' && recordingState !== 'stopped') return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    audioChunks = [];
    recordedEvents = [];
    recordingState = 'recording';
    recordingStartTime = performance.now();
    updateButtonStates();
    console.log('Recording started...');

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      // Explicitly use window.URL
      try {
        currentAudio = new Audio(window.URL.createObjectURL(audioBlob));
        recordingState = 'stopped';
        updateButtonStates();
        // Clean up the media stream tracks
        stream.getTracks().forEach(track => track.stop());
        console.log('Recording stopped. Audio ready.');
        clearInterval(stateCaptureInterval); // Stop capturing state
        updateProgressBar(0); // Reset progress bar
        updateTimeDisplay(0); // Reset time display
      } catch (error) {
          console.error('Error creating object URL or processing stop:', error);
          // Attempt to reset state even if audio creation failed
          recordingState = 'idle'; 
          updateButtonStates();
          stream.getTracks().forEach(track => track.stop());
          clearInterval(stateCaptureInterval);
      }
    };

    mediaRecorder.start();

    // Start capturing state periodically (e.g., 10 times per second)
    // Make sure we're not focused when starting recording
    goBackToFullView(false);
    stateCaptureInterval = setInterval(captureState, 100);

  } catch (err) {
    console.error('Error accessing microphone:', err);
    alert('Could not access microphone. Please ensure permission is granted.');
    recordingState = 'idle'; // Reset state on error
    updateButtonStates();
  }
}

function stopRecording() {
  if (recordingState !== 'recording') return;
  mediaRecorder.stop(); // This will trigger the onstop event
}

function captureState() {
  const timestamp = performance.now() - recordingStartTime;
  const state = {
    timestamp,
    cameraPosition: camera.position.clone(),
    controlsTarget: controls.target.clone(),
    explodeValue: params.explode,
    sliceValue: params.slice,
    focusedPartIndex: currentlyFocusedPart ? parts.indexOf(currentlyFocusedPart) : -1 // -1 for no focus
  };
  recordedEvents.push(state);
}

function updateProgressBar(percentage) {
  progressBar.style.width = `${percentage}%`;
  progressBar.setAttribute('aria-valuenow', percentage);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function updateTimeDisplay(currentTime, duration = null) {
  const timeStr = formatTime(currentTime);
  const durationStr = duration ? ` / ${formatTime(duration)}` : '';
  timeDisplay.textContent = timeStr + durationStr;
}

/* ---------- Playback / Pause / Reset ---------- */

function playRecording() {
  if (!currentAudio || (recordingState !== 'stopped' && recordingState !== 'paused')) return;

  const wasPaused = (recordingState === 'paused');
  recordingState = 'playing';
  updateButtonStates();
  console.log(wasPaused ? 'Resuming playback...' : 'Starting playback...');
  
  currentAudio.play();

  // Ensure duration is available before starting the loop
  if (currentAudio.duration && currentAudio.duration > 0) {
    updateTimeDisplay(currentAudio.currentTime, currentAudio.duration);
    playbackLoop = requestAnimationFrame(runPlaybackLoop);
  } else {
    // Wait for metadata if duration isn't ready
    currentAudio.onloadedmetadata = () => {
      console.log('Audio metadata loaded, duration:', currentAudio.duration);
      updateTimeDisplay(currentAudio.currentTime, currentAudio.duration);
      playbackLoop = requestAnimationFrame(runPlaybackLoop);
    };
  }
  
  // Handle end of playback
  currentAudio.onended = () => {
      console.log('Playback finished.');
      recordingState = 'stopped';
      updateButtonStates();
      updateProgressBar(0);
      updateTimeDisplay(0, currentAudio.duration); // Show 0 / total duration
      cancelAnimationFrame(playbackLoop);
  };
}

function pauseRecording() {
  if (recordingState !== 'playing' || !currentAudio) return;

  currentAudio.pause();
  recordingState = 'paused';
  cancelAnimationFrame(playbackLoop);
  updateButtonStates();
  console.log('Playback paused.');
}

let lastAppliedEventIndex = -1; // Keep track of the last applied event

function runPlaybackLoop() {
  if (recordingState !== 'playing' || !currentAudio || !currentAudio.duration) {
    return; // Stop loop if not playing or audio not ready
  }

  const currentTimeMs = currentAudio.currentTime * 1000;
  const currentPlaybackTime = currentAudio.currentTime;
  const totalDuration = currentAudio.duration;

  // Find the latest event that should have occurred by currentTimeMs
  let eventToApply = null;
  // Ensure we check from the beginning if looping or starting
  let searchStartIndex = lastAppliedEventIndex + 1;
  // If playback time jumped backwards (e.g., seeking), reset search
  // Note: Simple check, might need refinement for precise seeking.
  if (recordedEvents[lastAppliedEventIndex] && currentTimeMs < recordedEvents[lastAppliedEventIndex].timestamp) {
      searchStartIndex = 0;
      lastAppliedEventIndex = -1; // Reset index if time went backwards
  }


  for (let i = searchStartIndex; i < recordedEvents.length; i++) {
    if (recordedEvents[i].timestamp <= currentTimeMs) {
        eventToApply = recordedEvents[i];
        lastAppliedEventIndex = i;
    } else {
        // Events are ordered by timestamp, so we can stop searching
        break;
    }
  }

  // Apply the state if a new event was found
  if (eventToApply) {
    // Apply camera state directly from recording
    camera.position.copy(eventToApply.cameraPosition);
    controls.target.copy(eventToApply.controlsTarget);
    controls.update(); // Important after manually setting camera/target

    // Apply slider states ONLY if they changed
    if (params.explode !== eventToApply.explodeValue) {
        params.explode = eventToApply.explodeValue;
        explode(params.explode);
        if (explodeController) explodeController.updateDisplay(); // Update GUI
    }
    if (params.slice !== eventToApply.sliceValue) {
        params.slice = eventToApply.sliceValue;
        clipPlane.constant = params.slice;
        if (sliceController) sliceController.updateDisplay(); // Update GUI
    }

    // Apply focus state ONLY if it changed
    const recordedFocusIndex = eventToApply.focusedPartIndex;
    const currentFocusIndex = currentlyFocusedPart ? parts.indexOf(currentlyFocusedPart) : -1;

    if (recordedFocusIndex !== currentFocusIndex) {
        setFocusState(recordedFocusIndex === -1 ? null : parts[recordedFocusIndex]);
        // Explode value might need resetting if focus changes, handled by setFocusState calling explode(0) indirectly if needed?
        // Let's ensure explode is applied correctly after focus change
        if (params.explode !== eventToApply.explodeValue) {
           explode(params.explode); // Re-apply recorded explode after focus change
        }
    }
  }

  // Update progress bar and time display using current time and duration
  if (totalDuration > 0) {
      const progressPercent = (currentPlaybackTime / totalDuration) * 100;
      updateProgressBar(progressPercent);
      updateTimeDisplay(currentPlaybackTime, totalDuration);
  } else {
      // Handle case where duration might still be NaN or 0
      updateProgressBar(0);
      updateTimeDisplay(0);
  }

  // Continue the loop
  playbackLoop = requestAnimationFrame(runPlaybackLoop);
}

function resetRecording() {
  // Stop any ongoing recording or playback
  if (recordingState === 'recording') {
    stopRecording();
  }
  if (recordingState === 'playing' || recordingState === 'paused') {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.onended = null; // Remove listener
      currentAudio.onloadedmetadata = null; // Remove listener
      URL.revokeObjectURL(currentAudio.src); // Clean up blob URL
    }
    cancelAnimationFrame(playbackLoop);
  }

  // Reset state variables
  audioChunks = [];
  recordedEvents = [];
  currentAudio = null;
  mediaRecorder = null;
  recordingState = 'idle';
  lastAppliedEventIndex = -1;
  setFocusState(null); // Ensure focus is reset
  updateButtonStates();
  updateProgressBar(0);
  updateTimeDisplay(0);
  console.log('Recording state reset.');
}

// Add event listeners
btnRecord.addEventListener('click', startRecording);
btnStop.addEventListener('click', stopRecording);
btnPlay.addEventListener('click', playRecording);
btnPause.addEventListener('click', pauseRecording);
document.getElementById('btnReset').addEventListener('click', resetRecording); // Add explicit reset for recording

// Initial button state update
updateButtonStates();
