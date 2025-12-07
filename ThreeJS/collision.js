import * as THREE from "three"

//orbit control
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


//setup Canvas Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//setup shadow
renderer.shadowMap.enabled = true;

//setup scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

//setup camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 50);
camera.lookAt(0, 0, 0);

//setup orbit control
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 5, 0);

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


// Directional Light
color = 0xFFFFFF;
light = new THREE.DirectionalLight(color, intensity);
light.position.set(0, 10, 0);
light.target.position.set(-5, 0, 0);
light.castShadow = true;
light.shadow.camera.near = 0.1;
light.shadow.camera.far = 50;
light.shadow.camera.right = 15;
light.shadow.camera.left = -15;
light.shadow.camera.top = 15;
light.shadow.camera.bottom = -15;
scene.add(light);
scene.add(light.target);


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

size = 3;
geometry = new THREE.BoxGeometry(size, size, size);
material = new THREE.MeshPhongMaterial(
    { color: '#8AC' });
mesh = new THREE.Mesh(geometry, material);
mesh.position.set(size - 3, size / 2, 0);
mesh.castShadow = true;
scene.add(mesh);

//bounding box
let bb1 = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
bb1.setFromObject(mesh);
let bb1Helper = new THREE.Box3Helper(bb1);
scene.add(bb1Helper);

size = 1;
geometry = new THREE.SphereGeometry(size);
material = new THREE.MeshPhongMaterial(
    { color: '#8AC' });
mesh = new THREE.Mesh(geometry, material);
mesh.position.set(size - 3, size / 2, size + 3);
mesh.castShadow = true;
scene.add(mesh);
//bounding sphere
let bs1 = new THREE.Sphere(mesh.position, size);

size = 4;
geometry = new THREE.BoxGeometry(size, size, size);
material = new THREE.MeshPhongMaterial(
    {
        color: 'rgba(0, 0, 0, 1)',
        transparent: true,
        opacity: 1
    });
mesh = new THREE.Mesh(geometry, material);
mesh.position.set(size + 3, size / 2, 0);
mesh.castShadow = true;
scene.add(mesh);
//bounding box
let bb3 = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
bb3.setFromObject(mesh);
let bb3Helper = new THREE.Box3Helper(bb3);
scene.add(bb3Helper);

var player = mesh;

const speed = 0.1;
const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

window.addEventListener("keydown", (e) => {
    if (keys[e.key.toLowerCase()] !== undefined) {
        keys[e.key.toLowerCase()] = true;
    }
});

window.addEventListener("keyup", (e) => {
    if (keys[e.key.toLowerCase()] !== undefined) {
        keys[e.key.toLowerCase()] = false;
    }
});

function move() {
    if (keys.w) player.position.z -= speed;
    if (keys.s) player.position.z += speed;
    if (keys.a) player.position.x -= speed;
    if (keys.d) player.position.x += speed;
}

function checkCollision() {
    if (bb3.containsBox(bb1)) {
        console.log("contain cube");
        player.material.opacity = 0.5;
        player.material.color = new THREE.Color("red");

    } else if (bb3.intersectsBox(bb1)) {
        console.log("intersect cube");
        player.material.opacity = 0.3;
        player.material.color = new THREE.Color("green");

    } else if (bb3.intersectsSphere(bs1)) {
        console.log("intersect sphere");
        player.material.opacity = 0.3;
        player.material.color = new THREE.Color("green");

    }
    else {
        player.material.opacity = 1;
        player.material.color = new THREE.Color("black");
    }


}

function animate() {
    move();

    //Update posisi bb sesuai player
    bb3.copy(player.geometry.boundingBox).applyMatrix4(player.matrixWorld);

    checkCollision();

    renderer.render(scene, camera);
    controls.update();
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);