import * as THREE from "three"

//orbit control
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ================ */

//setup Canvas Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//setup shadow
renderer.shadowMap.enabled = true;

//setup scene
const scene = new THREE.Scene();

//setup camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 50);
camera.lookAt(0, 0, 0);

//setup orbit control
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 5, 0);
controls.update();

// Ambient Light
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

// var directionalLightHelper = new THREE.HemisphereLightHelper(light);
// scene.add(directionalLightHelper);

// Directional Light
color = 0xFFFFFF;
light = new THREE.DirectionalLight(color, intensity);
light.position.set(0, 10, 0);
light.target.position.set(-5, 0, 0);
light.castShadow = true;
light.shadow.camera.near = 0.1
light.shadow.camera.far = 50
light.shadow.camera.right = 15
light.shadow.camera.left = -15
light.shadow.camera.top = 15
light.shadow.camera.bottom = -15
// scene.add(new  THREE.CameraHelper(light.shadow.camera))
scene.add(light);
scene.add(light.target);

var directionalLightHelper = new THREE.DirectionalLightHelper(light);
// scene.add(directionalLightHelper);

// Point Light
intensity = 1500;
color = 0xFFFF00;
var distance = 30;
light = new THREE.PointLight(color, intensity, distance);
light.position.set(0, 6, 0);
light.castShadow = true;
scene.add(light);

var pointLightHelper = new THREE.PointLightHelper(light);
scene.add(pointLightHelper);

// Spot Light
color = 0xFF0000;
intensity = 15000;
var angle = THREE.MathUtils.degToRad(35);
distance = 300;
light = new THREE.SpotLight(color, intensity, distance, angle);
light.position.set(-50, 10, 0);
light.target.position.set(10, 10, 0);
// light.castShadow = true;
// light.shadow.camera.far = 0;
// scene.add(new THREE.CameraHelper(light.shadow.camera))
scene.add(light);
scene.add(light.target);

var spotLightHelper = new THREE.SpotLightHelper(light);
scene.add(spotLightHelper);

// Geometry - pake mesh phong
let size = 40;
let geometry = new THREE.PlaneGeometry(size, size);
let material = new THREE.MeshPhongMaterial({
    color: 0x888888,
    side: THREE.DoubleSide,
});


let mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
mesh.receiveShadow = true;
scene.add(mesh);


let radius = 7;
let widthSegments = 12;
let heightSegments = 8;
geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
material = new THREE.MeshPhongMaterial({ color: '#FA8' });
mesh = new THREE.Mesh(geometry, material);
mesh.position.set(-radius - 1, radius + 2, 0);
mesh.castShadow = true;
scene.add(mesh);


size = 4;
geometry = new THREE.BoxGeometry(size, size, size);
material = new THREE.MeshPhongMaterial({ color: '#8AC', transpare

 });
mesh = new THREE.Mesh(geometry, material);
mesh.position.set(size + 1, size / 2, 0);
mesh.castShadow =  true;
scene.add(mesh);

function animate() {
    renderer.render(scene, camera)
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);