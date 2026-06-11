/*
 * Brain Activity Visualizer (Option A)
 *
 * This script creates a Three.js scene and loads a 3D brain model (GLB file).
 * A swarm of particles and connecting line segments are distributed within
 * the brain's bounding box to suggest neural activity. A slider UI allows
 * interactive control of a scalar index in the range [0, 1]. Changes to
 * this index drive the colour, emissive glow and intensity of the brain
 * mesh, as well as the size and brightness of the particles and lines.
 *
 * The goal is to approximate the kind of energetic, pulsating brain
 * visualisation shown in the reference images while running entirely in
 * client‑side HTML/JavaScript.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js';

// Create the renderer and append the canvas to the DOM
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Create a scene and add some fog for depth
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000010, 0.05);

// Set up a camera looking at the origin
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.5, 5);

// Allow the user to orbit around the model
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting: ambient and directional to illuminate the model
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Containers for dynamic objects
let brain; // the loaded GLB brain model
const particles = []; // array to hold particle systems
const groupLines = new THREE.Group(); // group for line segments
scene.add(groupLines);

// Load the brain model
const loader = new GLTFLoader();
loader.load(
  './generated_brain.glb',
  (gltf) => {
    brain = gltf.scene;
    // Assign a standard material to all meshes in the brain model
    brain.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0x222255,
          emissive: 0x111122,
          roughness: 0.4,
          metalness: 0.1,
        });
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    scene.add(brain);

    // After loading, populate the brain volume with particles and lines
    populateActivity();
  },
  undefined,
  (err) => {
    console.error('Error loading GLB file:', err);
  }
);

// Generate a swarm of particles and connecting lines inside the brain's bounding box
function populateActivity() {
  // Calculate an axis‑aligned bounding box encompassing the brain
  const bbox = new THREE.Box3().setFromObject(brain);
  const min = bbox.min;
  const max = bbox.max;
  const size = new THREE.Vector3();
  bbox.getSize(size);

  // Create a point cloud of pseudo‑neurons
  const count = 600;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Randomly sample positions within the bounding box
    positions[i * 3] = THREE.MathUtils.lerp(min.x, max.x, Math.random());
    positions[i * 3 + 1] = THREE.MathUtils.lerp(min.y, max.y, Math.random());
    positions[i * 3 + 2] = THREE.MathUtils.lerp(min.z, max.z, Math.random());
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x00ffff,
    size: 0.03,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const points = new THREE.Points(geom, material);
  scene.add(points);
  particles.push(points);

  // Create line segments connecting random pairs of points
  const linePositions = new Float32Array(count * 3 * 2);
  for (let i = 0; i < count; i += 2) {
    const j = (i + 1) % count;
    // Copy start point
    linePositions[i * 6] = positions[i * 3];
    linePositions[i * 6 + 1] = positions[i * 3 + 1];
    linePositions[i * 6 + 2] = positions[i * 3 + 2];
    // Copy end point
    linePositions[i * 6 + 3] = positions[j * 3];
    linePositions[i * 6 + 4] = positions[j * 3 + 1];
    linePositions[i * 6 + 5] = positions[j * 3 + 2];
  }
  const lineGeom = new THREE.BufferGeometry();
  lineGeom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.3,
    linewidth: 1,
  });
  const lines = new THREE.LineSegments(lineGeom, lineMat);
  groupLines.add(lines);
}

// Manage the current activity index
let activityIndex = 0.5;

// Function to update visual parameters based on the index
function setIndex(val) {
  activityIndex = val;
  // Interpolate hue from blue (0.6) to orange/red (0.0)
  const hue = THREE.MathUtils.lerp(0.6, 0.02, val);
  const baseColor = new THREE.Color().setHSL(hue, 1.0, 0.5);
  const emissiveColor = new THREE.Color().setHSL(hue, 1.0, 0.25 + 0.35 * val);
  if (brain) {
    brain.traverse((child) => {
      if (child.isMesh) {
        child.material.color.copy(baseColor);
        child.material.emissive.copy(emissiveColor);
        child.material.emissiveIntensity = 0.5 + val * 2.0;
      }
    });
  }
  // Adjust particle material
  particles.forEach((pt) => {
    pt.material.color.copy(baseColor);
    pt.material.opacity = 0.2 + val * 0.8;
    pt.material.size = 0.015 + val * 0.05;
  });
  // Adjust line material
  groupLines.children.forEach((line) => {
    line.material.color.copy(emissiveColor);
    line.material.opacity = 0.1 + val * 0.9;
  });
}

// Hook up the slider UI
const slider = document.getElementById('slider');
const valueLabel = document.getElementById('value');
slider.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  valueLabel.textContent = val.toFixed(2);
  setIndex(val);
});
// Initialise with default value
setIndex(parseFloat(slider.value));

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  // Rotate the brain and energy flows slowly
  if (brain) {
    brain.rotation.y += 0.002 + activityIndex * 0.005;
  }
  groupLines.rotation.y += 0.003 + activityIndex * 0.008;
  renderer.render(scene, camera);
}
animate();

// Handle window resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});