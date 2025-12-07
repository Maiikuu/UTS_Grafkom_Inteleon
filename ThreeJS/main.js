import * as THREE from "three"

//orbit control
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

//gui
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

/* ================ */

//setup Canvas Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//setup scene
const scene = new THREE.Scene();

//orthographic camera
// const camSize = 50;
// const camera = new THREE.OrthographicCamera( -camSize, camSize, camSize, -camSize, 0.1,1000 );

//setup camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 50);
camera.lookAt(0, 0, 0);

//setup orbit control
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 5, 0);
controls.update();

//Gui
class MinMaxGUIHelper {
    constructor(obj, minProp, maxProp, minDif) {
        this.obj = obj;
        this.minProp = minProp;
        this.maxProp = maxProp;
        this.minDif = minDif;
    }
    get min() {
        return this.obj[this.minProp];
    }
    set min(v) {
        this.obj[this.minProp] = v;
        this.obj[this.maxProp] = Math.max(this.obj[this.maxProp], v + this.minDif);
    }
    get max() {
        return this.obj[this.maxProp];
    }
    set max(v) {
        this.obj[this.maxProp] = v;
        this.min = this.min;  // this will call the min setter
    }
}

function updateCamera() {
    camera.updateProjectionMatrix();
}


const gui = new GUI();
gui.add(camera, 'fov', 1, 180).onChange(updateCamera);
const minMaxGUIHelper = new MinMaxGUIHelper(camera, 'near', 'far', 0.1);
gui.add(minMaxGUIHelper, 'min', 0.1, 50, 0.1).name('near').onChange(updateCamera);
gui.add(minMaxGUIHelper, 'max', 0.1, 1000, 0.1).name('far').onChange(updateCamera);


// Geometry
let size = 40;
let geometry = new THREE.PlaneGeometry(size, size);
let material = new THREE.MeshBasicMaterial({
    color: 0x888888,
    side: THREE.DoubleSide,
});


let mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);


let radius = 7;
let widthSegments = 12;
let heightSegments = 8;
geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
material = new THREE.MeshBasicMaterial({ color: '#FA8' });
mesh = new THREE.Mesh(geometry, material);
mesh.position.set(-radius - 1, radius + 2, 0);
scene.add(mesh);


size = 4;
geometry = new THREE.BoxGeometry(size, size, size);
material = new THREE.MeshBasicMaterial({ color: '#8AC' });
mesh = new THREE.Mesh(geometry, material);
mesh.position.set(size + 1, size / 2, 0);
scene.add(mesh);

function animate() {
    renderer.render(scene, camera)
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);