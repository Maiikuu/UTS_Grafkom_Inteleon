import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 50);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 5, 0);
controls.update();

//Ambient Lights
var color = 0xFFFFFF;
var intensity = 0.1;
var light = new THREE.AmbientLight(color, intensity);
scene.add(light);

// Plane
let size = 40;
let geometry = new THREE.PlaneGeometry(size, size);
let material = new THREE.MeshPhongMaterial({
  color: 0x888888,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.8,
});
let plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// Load GLTF
let mixer;
const loader = new GLTFLoader();
loader.load('LuxoJR.glb', function (gltf) {
    scene.add(gltf.scene);
}, undefined, function (error) {
    console.error(error);
});


// Animate
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  renderer.render(scene, camera);
}
animate();