import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap = true;
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

// Hemisphere Light - pencahayaan terhadap tanah dan langit
var skyColor = 0xB1E1FF;  // light blue
var groundColor = 0xB97A20;  // brownish orange
intensity = .5;
light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
scene.add(light);

// Directional Light
color = 0xFFFFFF;
light = new THREE.DirectionalLight(color, intensity);
light.position.set(0, 10, 0);
light.target.position.set(-5, 0, 0);
light.castShadow = true;
light.shadow.camera.near = 0.1
light.shadow.camera.far = 10
light.shadow.camera.right = 10
light.shadow.camera.left = -10
light.shadow.camera.top = 10
light.shadow.camera.bottom = -10
// scene.add(new  THREE.CameraHelper(light.shadow.camera))
scene.add(light);
scene.add(light.target);

var directionalLightHelper = new THREE.DirectionalLightHelper(light);
scene.add(directionalLightHelper);

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
loader.load('LuxoJRnew.glb', function (gltf) {
    scene.add(gltf.scene);

    gltf.scene.traverse((child)  =>  {
      console.log(child.name);
    });
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