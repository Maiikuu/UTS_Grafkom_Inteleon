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
renderer.shadowMap = THREE.PCFSoftShadowMap;
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
camera.position.set(-12, 3, -2);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 5, 0);
controls.update();

//Ambient Lights
var color = 0xFFFFFF;
var intensity = 0.7;
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
light.position.set(-4, 10, 3);
light.target.position.set(0, 0, 0);
light.castShadow = true;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
light.shadow.camera.near = 0.5
light.shadow.camera.far = 10
light.shadow.camera.right = 10
light.shadow.camera.left = -10
light.shadow.camera.top = 15
light.shadow.camera.bottom = -10
scene.add(new  THREE.CameraHelper(light.shadow.camera))
scene.add(light);
scene.add(light.target);

var directionalLightHelper = new THREE.DirectionalLightHelper(light);
scene.add(directionalLightHelper);

// // Plane
// let size = 40;
// let geometry = new THREE.PlaneGeometry(size, size);
// let material = new THREE.MeshPhongMaterial({
//   color: 0x888888,
//   side: THREE.DoubleSide,
//   transparent: true,
//   opacity: 0.8,
// });
// let plane = new THREE.Mesh(geometry, material);
// plane.rotation.x = -Math.PI / 2;
// scene.add(plane);

let bigBulb;
let bulbLight;
let floorobj = null;
let maxArea = 0;

let power = 0;

// Load GLTF
let mixer;
const loader = new GLTFLoader();
loader.load('LuxoJRnew.glb', (gltf) => {
  scene.add(gltf.scene);

  gltf.scene.traverse((child) => {
    if (child.name === "BigBulb") {
      bigBulb = child;
    }
  });

  gltf.scene.traverse((child) => {
    // Detect floor meshes
    if (child.isMesh && child.name.startsWith("Plane")) {
      child.gepmetry.computeBoundingBox();
      const box = child.geometry.boundingBox;

      const size = new THREE.Vector3();
      box.getSize(size);
      const area = size.x * size.z;

      if (area > maxArea) {
        maxArea = area;
        floorobj = child;
      }
    }
  });
  if (!floorobj) {
    console.warn("Floor object not found");
  } else {
    floorobj.material.transparent = true;
    floorobj.material.opacity = 0.5;
    floorobj.material.depthWrite = false;
    floorobj.receiveShadow = true;
  }

  if (!bigBulb) {
    console.error("BigBulb not found");
    return;
  }

  if (!floorobj) {
    console.warn("Floor object not found");
  }

  floorobj.material.transparent = true;
  floorobj.material.opacity = 0.5;
  floorobj.material.depthWrite = false;

  bigBulb.castShadow = true;
  bigBulb.receiveShadow = false;

  bigBulb.material.emissive = new THREE.Color(0xffffaa);
  bigBulb.material.emissiveIntensity = 0;

  bulbLight = new THREE.PointLight(0xfff2cc, 0, 100);
  bulbLight.castShadow = true;
  bigBulb.add(bulbLight);

  if (gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(gltf.scene);
    mixer.clipAction(gltf.animations[0]).play();
  }
  console.log(gltf.animations[0].tracks.map(t => t.name));

});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

window.addEventListener("keydown", (e) => {
  if (!bigBulb) return;

  const speed = 0.3;

  switch (e.key) {
    case "ArrowUp":
      bigBulb.position.z -= speed;
      break;
    case "ArrowDown":
      bigBulb.position.z += speed;
      break;
    case "ArrowLeft":
      bigBulb.position.x -= speed;
      break;
    case "ArrowRight":
      bigBulb.position.x += speed;
      break;
    case "w":
      bigBulb.position.y += speed;
      break;
    case "s":
      bigBulb.position.y -= speed;
      break;
  }
});

// Animate
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);

  if (bigBulb && bulbLight) {
    power = Math.min(power + 0.03, 6);
    bulbLight.intensity = power;
    bigBulb.material.emissiveIntensity = power * 0.3;
  }
  if (bigBulb) {
  bigBulb.position.x += 1.1;
}

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  renderer.render(scene, camera);
}
animate();