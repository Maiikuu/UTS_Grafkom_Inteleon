import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
camera.position.set(-12, 1, -2);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 5, 0);
// Enable smooth rotation and reasonable limits for an orbiting camera
controls.enableDamping = true;
controls.dampingFactor = 0.06; // smooth the motion
controls.enableRotate = true;
controls.enablePan = true;
controls.enableZoom = true;
controls.minDistance = 2;
controls.maxDistance = 60;
controls.maxPolarAngle = Math.PI * 0.95; // prevent flipping under the floor
controls.autoRotate = true;
controls.update();
// Improve touch behavior on mobile/pointer devices
renderer.domElement.style.touchAction = 'none';

// Mouse handlers: Shift+Left-drag = roll
let leftRolling = false;
let leftPrev = { x: 0, y: 0 };
const leftRollSensitivity = 0.006; // roll sensitivity for Shift+left-drag

renderer.domElement.addEventListener('mousedown', (e) => {
  // left button with Shift -> roll mode
  if (e.button === 0 && e.shiftKey) {
    leftRolling = true;
    leftPrev.x = e.clientX; leftPrev.y = e.clientY;
    controls.enabled = false;
    document.body.style.cursor = 'move';
    e.preventDefault();
    return;
  }
});

window.addEventListener('mousemove', (e) => {
  if (leftRolling) {
    const dx = e.clientX - leftPrev.x;
    leftPrev.x = e.clientX; leftPrev.y = e.clientY;

    const roll = -dx * leftRollSensitivity; // horizontal movement maps to roll
    const camToTarget = camera.position.clone().sub(controls.target);
    const forward = camToTarget.clone().normalize().negate();
    camera.up.applyAxisAngle(forward, roll);
    camera.up.normalize();
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
    return;
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0 && leftRolling) {
    leftRolling = false;
    controls.enabled = true;
    document.body.style.cursor = '';
    controls.update();
    return;
  }
});

//Ambient Lights
var color = 0xFFFFFF;
var intensity = 0.7;
var light = new THREE.AmbientLight(color, intensity);
scene.add(light);

// Directional Light
color = 0xFFFFFF;
light = new THREE.DirectionalLight(color, 2);
light.position.set(0, 5, 4);
light.target.position.set(-4, 0, 0);
light.castShadow = true;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
light.shadow.camera.near = 0.5
light.shadow.camera.far = 20
light.shadow.camera.right = 10
light.shadow.camera.left = -10
light.shadow.camera.top = 10
light.shadow.camera.bottom = -10
// scene.add(new THREE.CameraHelper(light.shadow.camera))
scene.add(light);
scene.add(light.target);

var directionalLightHelper = new THREE.DirectionalLightHelper(light);
scene.add(directionalLightHelper);

let bigBulb;
let bulbLight;
let smallBulb;
let smallBulbLight;
let smallLamp;
let smallLampRoot = null; // root we create to control hopping without fighting GLTF animation
let lamp = null; // root object for lamp (declared to avoid ReferenceError)
let floorobj = null;
let maxArea = 0;

// Bulb light constants
const BIG_BULB_EMISSIVE = 6.0;
const BIG_BULB_LIGHT_INTENSITY = 100;
const SMALL_BULB_EMISSIVE = 4.0;
const SMALL_BULB_LIGHT_INTENSITY = 50;

// small-lamp hop state (Luxo)
let smallLampStartPos = null;
let smallHop = {
  enabled: false,
  radius: 2.0,
  speed: 1.2,
  height: 1.2,
  offset: new THREE.Vector3(0,0,0),
  startPos: null,
  luxo: { active: false }
};

// Easing helpers
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
function easeInCubic(t){ return t * t * t; }

// Big head + ball state
let bigHead = null;
let ball = null;
let ballRadius = 0.5;
let ballVelocity = new THREE.Vector3(0,0,0);
let ballLaunched = false;
let ballFriction = 1.5; // damping (per second)

let bigHeadFlick = { active: false, startTime: 0, duration: 0.9, angle: -1.2 };

// positions and temps for bulb/lamp follow
let lampStartPos = null;
let bigBulbStartPos = null;
let currentGltfScene = null;
let bigHeadInitialQuat = null;
let animationsEnabled = false;
const _tmpVec = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _tmpOffset = new THREE.Vector3(0.6, -0.12, 0);

// Procedural cable storage
const cables = [];

function makeSagPoints(aWorld, bWorld, sagFactor = 0.6, segments = 24) {
  const pts = [];
  const dist = aWorld.distanceTo(bWorld);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().lerpVectors(aWorld, bWorld, t);
    const sag = Math.sin(Math.PI * t) * sagFactor * dist * 0.12;
    p.y -= sag;
    pts.push(p);
  }
  return pts;
}

// Procedural cable helpers (top-level so animate() can call updateCable each frame)
function createProceduralCable(startObj, endObj, opts = {}) {
  if (!startObj || !endObj) return null;
  const segments = opts.segments || 28;
  const radius = opts.radius || 0.02;
  const color = opts.color || 0x222222;

  const a = new THREE.Vector3(); startObj.getWorldPosition(a);
  const b = new THREE.Vector3(); endObj.getWorldPosition(b);
  const pts = makeSagPoints(a, b, opts.sagFactor || 0.6, segments);
  const curve = new THREE.CatmullRomCurve3(pts);
  const geom = new THREE.TubeGeometry(curve, segments, radius, 8, false);
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.1, roughness: 0.7 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);

  // control object placed at midpoint to allow moving body but keep anchors fixed
  const control = new THREE.Object3D();
  const mid = a.clone().lerp(b, 0.5);
  control.position.copy(mid);
  scene.add(control);

  const cable = { name: opts.name || null, mesh, startObj, endObj, opts, segments, radius, control, controlWeight: (opts.controlWeight || 0.9) };
  cables.push(cable);
  return cable;
}

function updateCable(cable) {
  if (!cable || !cable.mesh) return;
  const a = new THREE.Vector3(); cable.startObj.getWorldPosition(a);
  const b = new THREE.Vector3(); cable.endObj.getWorldPosition(b);
  const pts = makeSagPoints(a, b, cable.opts.sagFactor || 0.6, cable.segments);

  // if control present, pull intermediate points toward control (keeps ends fixed)
  if (cable.control) {
    const controlWorld = new THREE.Vector3(); cable.control.getWorldPosition(controlWorld);
    const segs = pts.length - 1;
    for (let i = 0; i < pts.length; i++) {
      const t = i / segs;
      const influence = Math.max(0, 1 - Math.abs(t - 0.5) * 2); // triangular influence centered at 0.5
      if (influence > 0.001) {
        pts[i].lerp(controlWorld, influence * cable.controlWeight);
      }
    }
  }

  const curve = new THREE.CatmullRomCurve3(pts);
  const geom = new THREE.TubeGeometry(curve, cable.segments, cable.radius, 8, false);
  const old = cable.mesh.geometry; cable.mesh.geometry = geom; if (old) old.dispose();
}

// helper to move cable midpoint in world units; cname can be cable name or part of startObj name
function moveCableMidpoint(cname, offsetWorld) {
  const c = cables.find(x => x.name === cname || (x.startObj && x.startObj.name && x.startObj.name.includes(cname)));
  if (!c) { console.warn('moveCableMidpoint: cable not found', cname); return; }
  c.control.position.add(offsetWorld);
  c.control.updateMatrixWorld();
  console.log('Moved cable midpoint for', cname, 'by', offsetWorld.toArray());
}

// expose a simple helper for console testing: moveCableMidpoint(name, dx,dy,dz)
if (typeof window !== 'undefined') {
  window.moveCableMidpoint = function(name, dx=0, dy=0, dz=0) {
    moveCableMidpoint(name, new THREE.Vector3(dx, dy, dz));
  };
}

let mixer;
const loader = new GLTFLoader();
loader.load('coloredluxojr.glb', (gltf) => {
  scene.add(gltf.scene);

  gltf.scene.traverse((child) => {
    if (child.isMesh && child.material) {
      const oldMat = child.material;
      child.material = new THREE.MeshPhongMaterial({
        color: oldMat.color,
        map: oldMat.map,
        specular: 0x555555,
        shininess: 30,
        side: oldMat.side,
      });
    }
    // Detect floor meshes
    if (child.isMesh && child.name.startsWith("Floor")) {
      child.geometry.computeBoundingBox();
      const box = child.geometry.boundingBox;

      const area = (box.max.x - box.min.x) * (box.max.z - box.min.z);
      if (area > maxArea) {
        maxArea = area;
        floorobj = child;
      }
    }
  });
  // Setup parts (shadows, small bulb, small lamp root, etc.)
  setupPartsForGLTF(gltf);

  // Find the bulb using .getObjectByName for efficiency
  bigBulb = gltf.scene.getObjectByName("Big_Bulb");

  if (!bigBulb) {
    console.error("BigBulb not found");
    return;
  }

  // record big bulb's start (local) position so we can restore it after flick
  bigBulbStartPos = bigBulb.position.clone();

  // Find the root of the lamp hierarchy (ancestor of BigBulb)
  let obj = bigBulb;
  while (obj.parent && obj.parent !== gltf.scene) {
    obj = obj.parent;
  }
  lamp = obj;
  // record lamp's starting position so we can lower/restore it safely
  lampStartPos = lamp.position.clone();

  if (!floorobj) {
    console.warn("Floor object not found");
  } else {
    floorobj.material.transparent = true;
    floorobj.material.opacity = 0.5;
    floorobj.material.depthWrite = false;
    floorobj.receiveShadow = true;
  }

  bigBulb.castShadow = false;
  bigBulb.receiveShadow = false;

  bigBulb.material.emissive = new THREE.Color(0xffffaa);
  bigBulb.material.emissiveIntensity = BIG_BULB_EMISSIVE;

  if (gltf.animations && gltf.animations.length > 0) {
    console.log(`Discarding ${gltf.animations.length} animations from GLTF to prevent playback.`);
    // Clear animations to avoid any automatic animation playback or conflicts
    gltf.animations.length = 0;
  }
  // remember gltf.scene for later control
  currentGltfScene = gltf.scene;

  bulbLight = new THREE.PointLight(0xfff2cc, BIG_BULB_LIGHT_INTENSITY, 100, 2);
  bulbLight.castShadow = true;

  // keep shadows clean
  bulbLight.shadow.mapSize.set(512, 512);
  bulbLight.shadow.bias = -0.0001;

  // place light inside bulb
  bulbLight.position.set(0, 0, 0);

  // attach to bulb
  bigBulb.add(bulbLight);

  // Move small lamp to the right relative to the *current* camera view
  // (useful to adjust start position without editing the glb)
  // try { moveSmallLampRight(1.5); } catch(e) { /* ignore if not ready */ }



});
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Animate
const clock = new THREE.Clock();

// Start Luxo-style multi-bounce hop
function startLuxoHop(opts = {}) {
  if (!smallLamp || !smallLampStartPos) return null;
  if (smallHop.luxo && smallHop.luxo.active) return null;
  const distance = opts.distance || 2.0;
  const heights = opts.heights || [1.2, 0.7, 0.35];
  const baseDuration = opts.baseDuration || 0.45;
  const seq = [];
  let cum = 0;
  for (let i=0;i<heights.length;i++){
    const dur = baseDuration * Math.pow(0.72, i);
    const distPortion = distance * (0.5 * Math.pow(0.6, i));
    seq.push({ start: cum, duration: dur, height: heights[i], distance: distPortion });
    cum += dur;
  }
  smallHop.luxo = { active: true, startTime: clock.getElapsedTime(), seq, totalTime: cum, totalDistance: distance, startPos: smallLampStartPos.clone() };
  return smallHop.luxo;
}

function triggerFlick() {
  if (bigHeadFlick.active) return;
  bigHeadFlick.active = true;
  bigHeadFlick.startTime = clock.getElapsedTime();
  ballLaunched = false;
}

// Move the small lamp to the right relative to the camera view
function moveSmallLampRight(amount = 1.5) {
  if (!smallLamp && !smallLampRoot) {
    console.warn('moveSmallLampRight: small lamp not available yet');
    return;
  }
  // camera.getWorldDirection gives the forward vector
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  // right = forward x up
  const right = forward.clone().cross(camera.up).normalize();
  const delta = right.multiplyScalar(amount);
  if (smallLampRoot) {
    smallLampRoot.position.add(delta);
    smallLampStartPos = smallLampRoot.position.clone();
  } else if (smallLamp) {
    smallLamp.position.add(delta);
    smallLampStartPos = smallLamp.position.clone();
  }
  console.log('Moved small lamp right by', amount, 'units (camera space)');
}

// Play the full sequence once (small hop -> flick -> ball launch)
let _sequencePlaying = false;
function playOnceSequence(retries = 12) {
  // retry a few times if model or parts not ready yet
  if (_sequencePlaying) return;
  if (!currentGltfScene || !smallLampStartPos || !bigHead || !ball) {
    if (retries <= 0) {
      console.warn('playOnceSequence: required objects not ready, aborting.');
      return;
    }
    console.log('playOnceSequence: waiting for model to be ready, retries left', retries);
    setTimeout(() => playOnceSequence(retries - 1), 200);
    return;
  }

  _sequencePlaying = true;
  animationsEnabled = true;
  smallHop.enabled = true;

  // ensure user camera controls remain active during playback
  if (typeof controls !== 'undefined' && controls) controls.enabled = true;

  // ensure procedural cable exists for small lamp
  const orig = currentGltfScene.getObjectByName('Cablesml');
  if (!orig) {
    // try anchors
    const startAnchor = currentGltfScene.getObjectByName('Plugbtm') || currentGltfScene.getObjectByName('Plug_Base') || currentGltfScene.getObjectByName('Plugtop');
    const endAnchor = smallLampRoot || smallLamp || currentGltfScene.getObjectByName('Head') || currentGltfScene.getObjectByName('Base');
    if (startAnchor && endAnchor) createProceduralCable(startAnchor, endAnchor, { segments: 28, radius: 0.02, sagFactor: 0.75, color: 0xdddddd });
  }

  console.log('playOnceSequence: starting Luxo hop');
  const luxo = startLuxoHop({ distance: 1.6, heights: [1.2, 0.6], baseDuration: 0.45 });

  // schedule big flick after first bounce completes (rough timing)
  const flickDelay = (luxo ? Math.min(luxo.totalTime * 0.7, 0.9) : 0.9);
  setTimeout(() => { console.log('playOnceSequence: triggering flick'); triggerFlick(); }, flickDelay * 1000);

  // schedule end: allow flick + ball travel ~ 4s then stop animations
  setTimeout(() => { animationsEnabled = false; smallHop.enabled = false; _sequencePlaying = false; console.log('playOnceSequence: finished'); }, 4500);
}

// Key handler: P to play once
window.addEventListener('keydown', (e)=>{ if (e.key === 'p' || e.key === 'P') playOnceSequence(); });

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  // update controls so camera remains interactive during play
  if (typeof controls !== 'undefined' && controls) controls.update();

  const t = clock.getElapsedTime();

  // small lamp Luxo hop handling
  if (smallHop.luxo && smallHop.luxo.active && smallHop.luxo.startPos) {
    const data = smallHop.luxo;
    const elapsed = t - data.startTime;
    if (elapsed >= data.totalTime) {
      const endX = data.startPos.x + data.totalDistance;
      if (smallLampRoot) smallLampRoot.position.set(endX, data.startPos.y, data.startPos.z);
      else if (smallLamp) smallLamp.position.set(endX, data.startPos.y, data.startPos.z);
      if (smallLamp) smallLamp.scale.set(1,1,1);
      smallHop.luxo.active = false;
    } else {
      let accDist = 0, localX = 0;
      for (let i=0;i<data.seq.length;i++) {
        const s = data.seq[i];
        if (elapsed >= s.start + s.duration) { accDist += s.distance; continue; }
        const tLocal = Math.max(0, Math.min(1, (elapsed - s.start)/s.duration));
        const y = s.height * Math.sin(Math.PI * tLocal);
        const dx = s.distance * easeOutCubic(tLocal);
        localX = accDist + dx;
        if (smallLampRoot) { smallLampRoot.position.x = data.startPos.x + localX; smallLampRoot.position.y = data.startPos.y + y; }
        else if (smallLamp) { smallLamp.position.x = data.startPos.x + localX; smallLamp.position.y = data.startPos.y + y; }
        const impact = Math.max(0, 1 - (y / (s.height + 1e-6)));
        const squash = 1 - Math.min(0.5, impact * 0.4);
        const stretch = 1 + Math.min(0.35, impact * 0.3);
        if (smallLamp) smallLamp.scale.set(stretch, squash, stretch);
        if (smallLamp) smallLamp.rotation.z = Math.sin(Math.PI * tLocal) * 0.18;
        break;
      }
    }
  }

  // big head flick + ball launch
  if (bigHead && bigHeadFlick.active) {
    const elapsed = t - bigHeadFlick.startTime;
    const p = Math.min(elapsed / bigHeadFlick.duration, 1);
    bigHead.rotation.z = bigHeadFlick.angle * Math.sin(p * Math.PI);

    if (bigBulb && bigHead) {
      bigHead.getWorldPosition(_tmpVec); bigHead.getWorldQuaternion(_tmpQuat);
      const targetWorld = _tmpVec.clone().add(_tmpOffset.clone().applyQuaternion(_tmpQuat));
      if (bigBulb.parent) bigBulb.parent.worldToLocal(targetWorld);
      bigBulb.position.lerp(targetWorld, 0.6);
    }

    if (!ballLaunched && p >= 0.25 && ball) {
      bigHead.getWorldPosition(_tmpVec); bigHead.getWorldQuaternion(_tmpQuat);
      const dir = new THREE.Vector3(1,0,0).applyQuaternion(_tmpQuat).normalize();
      const headContactDist = 0.6;
      const contactPointWorld = _tmpVec.clone().add(dir.clone().multiplyScalar(headContactDist));
      const launchPosWorld = contactPointWorld.clone().add(dir.clone().multiplyScalar(ballRadius + 0.02));
      if (ball.parent) ball.parent.worldToLocal(launchPosWorld);
      ball.position.copy(launchPosWorld);
      const launchSpeed = 5.0; const upToss = 1.2;
      ballVelocity.copy(dir.multiplyScalar(launchSpeed)); ballVelocity.y = upToss;
      ballLaunched = true;
    }

    if (p >= 1) { bigHeadFlick.active = false; bigHead.rotation.z = 0; }
  }

  // ball physics + rolling
  if (ball && ballLaunched) {
    const step = ballVelocity.clone().multiplyScalar(delta);
    ball.position.add(step);
    ballVelocity.y -= 9.8 * delta * 0.15;
    if (floorobj) {
      const floorY = floorobj.position.y || 0;
      if (ball.position.y - ballRadius < floorY + 0.01) {
        ball.position.y = floorY + ballRadius + 0.01;
        ballVelocity.y = Math.max(0, ballVelocity.y * -0.25);
      }
    }
    ballVelocity.x *= Math.max(0, 1 - ballFriction * delta);
    ballVelocity.z *= Math.max(0, 1 - ballFriction * delta);
    const horizSpeed = Math.sqrt(ballVelocity.x*ballVelocity.x + ballVelocity.z*ballVelocity.z);
    if (horizSpeed < 0.05 && Math.abs(ball.position.y - (lampStartPos ? lampStartPos.y : 0)) < 0.5) { ballVelocity.set(0,0,0); ballLaunched = false; }
    const travel = Math.sqrt(step.x*step.x + step.z*step.z);
    if (travel > 0 && ballRadius > 0) {
      const up = new THREE.Vector3(0,1,0); const motionDir = ballVelocity.clone(); motionDir.y = 0;
      const axis = new THREE.Vector3().crossVectors(up, motionDir).normalize(); const angle = travel / ballRadius;
      if (!isNaN(angle) && axis.lengthSq() > 0) { const q = new THREE.Quaternion(); q.setFromAxisAngle(axis, angle); ball.quaternion.premultiply(q); }
    }
  }

  // update procedural cables if any
  if (animationsEnabled) {
    for (const c of cables) updateCable(c);
  }

  renderer.render(scene, camera);
}
animate();

/* Parts lists derived from the commented GLB object list. */
const smallLampParts = [
  'Cablesml','Bulb','Head','Base','Complecated_Bits',
  'Cylinder','Cylinder001','Cylinder002','Cylinder003','Cylinder004',
  'Cylinder005','Cylinder006','Cylinder007','Cylinder008','Cylinder009',
  'Cylinder0010','Cylinder0011'
];

const bigLampParts = [
  'Big_Base','Big_Bulb','Big_Head','Plane','Plane001','Plane002','Plane003',
  'Plane004','Plane005','Plane006','Cylinder0012','Cylinder0013','Cylinder0014',
  'Cylinder0015','Cylinder0016','Cylinder0017','Cylinder0018','Cylinder0019',
  'Cylinder0020','Cylinder0021','Cylinder0022','Cylinder0023','Cylinder0024','Cablebig'
];

const otherParts = ['Ballsml','Floor','Plug_Base', 'Plugbtm','Plugtop'];

// Called during loader callback to set shadows/materials and setup small lamp bulb/light
function setupPartsForGLTF(gltf) {
  smallLampParts.forEach(name => {
    const o = gltf.scene.getObjectByName(name);
    if (o && o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
      o.material && (o.material.needsUpdate = true);
    }
  });

  bigLampParts.forEach(name => {
    const o = gltf.scene.getObjectByName(name);
    if (o && o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
      o.material && (o.material.needsUpdate = true);
    }
  });

  // Setup small bulb and small lamp root
  smallBulb = gltf.scene.getObjectByName('Bulb');
  if (smallBulb) {
    // Try to locate a logical lamp root by finding the top-level child that contains
    // the most parts from `smallLampParts`. This handles cases where parts are
    // grouped under a parent (common), or when the bulb itself is a top-level object.
    const partNameSet = new Set(smallLampParts);
    let bestChild = null;
    let bestCount = 0;
    for (const child of gltf.scene.children) {
      let count = 0;
      child.traverse(c => { if (partNameSet.has(c.name)) count++; });
      if (count > bestCount) { bestCount = count; bestChild = child; }
    }

    if (bestChild && bestCount >= 2) {
      smallLamp = bestChild;
      console.log(`Small lamp root chosen: "${smallLamp.name}" contains ${bestCount} parts`);
    } else {
      // fallback: climb ancestor chain from the bulb until we reach a direct child of the scene
      let obj = smallBulb;
      while (obj.parent && obj.parent !== gltf.scene) obj = obj.parent;
      smallLamp = obj;
      console.log(`Small lamp root fallback: "${smallLamp.name || smallLamp.type}"`);
    }

    smallBulb.castShadow = false;
    smallBulb.receiveShadow = false;
    if (smallBulb.material) {
      smallBulb.material.emissive = new THREE.Color(0xffe6b3);
      smallBulb.material.emissiveIntensity = SMALL_BULB_EMISSIVE;
    }

    smallBulbLight = new THREE.PointLight(0xfff2cc, SMALL_BULB_LIGHT_INTENSITY, 60, 2);
    smallBulbLight.castShadow = true;
    smallBulbLight.shadow.mapSize.set(512, 512);
    smallBulbLight.shadow.bias = -0.0001;
    smallBulb.add(smallBulbLight);

    // record starting position for hop animation (apply right offset)
    if (smallLamp) {
      // Attempt to group all named small-lamp parts into a single root so the whole lamp moves.
      const partsFound = smallLampParts.map(n => gltf.scene.getObjectByName(n)).filter(Boolean);

      // remove parts whose ancestor is also present (we only want to reparent top-level parts)
      function hasAncestor(node, possibleAncestor) {
        let p = node.parent;
        while (p) { if (p === possibleAncestor) return true; p = p.parent; }
        return false;
      }
      const topLevelParts = partsFound.filter(p => !partsFound.some(other => other !== p && hasAncestor(p, other)));

      if (topLevelParts.length > 0) {
        // compute average world position
        const avg = new THREE.Vector3();
        topLevelParts.forEach(p => { const wp = new THREE.Vector3(); p.getWorldPosition(wp); avg.add(wp); });
        avg.multiplyScalar(1 / topLevelParts.length);

        smallLampRoot = new THREE.Object3D();
        smallLampRoot.position.copy(avg);
        scene.add(smallLampRoot);

        topLevelParts.forEach(p => {
          const wp = new THREE.Vector3();
          const wq = new THREE.Quaternion();
          const ws = new THREE.Vector3();
          p.getWorldPosition(wp);
          p.getWorldQuaternion(wq);
          p.getWorldScale(ws);
          if (p.parent) p.parent.remove(p);
          smallLampRoot.add(p);
          smallLampRoot.worldToLocal(wp);
          const parentWorldQuat = new THREE.Quaternion(); smallLampRoot.getWorldQuaternion(parentWorldQuat);
          const localQuat = wq.clone().premultiply(parentWorldQuat.clone().invert());
          const parentWorldScale = new THREE.Vector3(); smallLampRoot.getWorldScale(parentWorldScale);
          p.position.copy(wp);
          p.quaternion.copy(localQuat);
          p.scale.copy(ws.divide(parentWorldScale));
        });

        smallLamp = smallLampRoot;
        console.log('Grouped small-lamp parts into root with', topLevelParts.length, 'items');

        // ensure the Bulb is a child of the new root
        if (!smallLampRoot.getObjectByName('Bulb')) {
          if (smallBulb.parent) smallBulb.parent.remove(smallBulb);
          smallLampRoot.add(smallBulb);
          smallBulb.position.set(0,0,0);
        }

        // record static start position for the small lamp
        smallLampStartPos = smallLampRoot.position.clone();

        // Ensure all named smallLampParts are parented under the new root.
        // Some parts (e.g., lone cylinders) may not have been included in the topLevelParts set
        // because of a different ancestor layout — reparent them now while preserving world transforms.
        const missingParts = smallLampParts.map(n => gltf.scene.getObjectByName(n)).filter(Boolean).filter(p => !smallLampRoot.getObjectById(p.id));
        missingParts.forEach(p => {
          // if it's already a descendant skip
          let cur = p;
          let isDescendant = false;
          while (cur) { if (cur === smallLampRoot) { isDescendant = true; break; } cur = cur.parent; }
          if (isDescendant) return;

          const wp = new THREE.Vector3(); const wq = new THREE.Quaternion(); const ws = new THREE.Vector3();
          p.getWorldPosition(wp); p.getWorldQuaternion(wq); p.getWorldScale(ws);
          if (p.parent) p.parent.remove(p);
          smallLampRoot.add(p);
          smallLampRoot.worldToLocal(wp);
          const parentWorldQuat = new THREE.Quaternion(); smallLampRoot.getWorldQuaternion(parentWorldQuat);
          const localQuat = wq.clone().premultiply(parentWorldQuat.clone().invert());
          const parentWorldScale = new THREE.Vector3(); smallLampRoot.getWorldScale(parentWorldScale);
          p.position.copy(wp); p.quaternion.copy(localQuat); p.scale.copy(ws.divide(parentWorldScale));
          console.log('Reparented small-lamp part into root:', p.name || p.type);
        });

      } else {
        // fallback: create a simple root around the currently selected smallLamp
        const worldPos = new THREE.Vector3();
        smallLamp.getWorldPosition(worldPos);
        smallLampRoot = new THREE.Object3D();
        smallLampRoot.position.copy(worldPos);
        scene.add(smallLampRoot);
        if (smallLamp.parent) smallLamp.parent.remove(smallLamp);
        smallLampRoot.add(smallLamp);
        smallLamp.position.set(0,0,0);
        smallLamp.quaternion.identity();
        smallLamp.scale.set(1,1,1);
        smallLampStartPos = smallLampRoot.position.clone();
      }

    }
  } else {
    console.warn('Small Bulb ("Bulb") not found in GLTF');
  }

  // Find Big_Head and Ballsml and prepare for flick/rolling
  bigHead = gltf.scene.getObjectByName('Big_Head');
  if (bigHead) {
    bigHead.castShadow = true;
    // store initial orientation so we can restore it when stopping animations
    bigHeadInitialQuat = bigHead.quaternion.clone();
    // ensure rotation pivot is usable; if needed user can adjust pivot in editor
    console.log('Big_Head ready for flick:', bigHead.name || bigHead.type);
  } else {
    console.warn('Big_Head not found in GLTF');
  }

  ball = gltf.scene.getObjectByName('Ballsml');
  if (ball && ball.isMesh) {
    ball.castShadow = true;
    ball.receiveShadow = true;
    if (!ball.geometry.boundingSphere) ball.geometry.computeBoundingSphere();
    ballRadius = (ball.geometry.boundingSphere ? ball.geometry.boundingSphere.radius : 0.5) * (ball.scale.x || 1);

    // Reparent the ball to the scene so it moves independently of lamp/head hierarchy
    const worldPos = new THREE.Vector3();
    ball.getWorldPosition(worldPos);
    if (ball.parent) ball.parent.remove(ball);
    scene.add(ball);
    ball.position.copy(worldPos);


    console.log('Ballsml ready and reparented to scene, radius =', ballRadius);

  // end loader callback

    // For cables we prefer procedural geometry so we can animate/move the body
    const cableNames = ['Cablesml'];
    cableNames.forEach(cname => {
      const orig = gltf.scene.getObjectByName(cname);
      // find anchors
      const plugCandidates = ['Plugbtm', 'Plug_Base', 'Plugtop'];
      let startAnchor = null;
      for (const p of plugCandidates) { const a = gltf.scene.getObjectByName(p); if (a) { startAnchor = a; break; } }
      const endAnchor = smallLampRoot || smallLamp || gltf.scene.getObjectByName('Head') || gltf.scene.getObjectByName('Base');

      if (startAnchor && endAnchor) {
        // hide original mesh if present and make a procedural replacement so we can move the middle
        if (orig) { orig.visible = false; console.log('Hidden original cable mesh for', cname, 'and creating procedural version'); }
        createProceduralCable(startAnchor, endAnchor, { segments: 28, radius: 0.02, sagFactor: 0.75, color: 0xdddddd, name: cname });
      } else {
        console.log('Skipping procedural cable for', cname, 'missing anchors');
      }
    });
  } else if (ball) {
    console.warn('Ballsml found but is not a mesh');
  } else {
    console.warn('Ballsml not found in GLTF');
  }
}