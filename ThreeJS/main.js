import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* renderer, scene, camera */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(-15, 10, 15);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 3, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 5;
controls.maxDistance = 60;
controls.maxPolarAngle = Math.PI * 0.95;
controls.update();

/* lights */
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dir = new THREE.DirectionalLight(0xffffff, 2);
dir.position.set(0, 10, 4);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
dir.shadow.camera.near = 0.5;
dir.shadow.camera.far = 30;
dir.shadow.camera.right = 20;
dir.shadow.camera.left = -20;
dir.shadow.camera.top = 20;
dir.shadow.camera.bottom = -20;
scene.add(dir);

/* state */
let smallLampGrp, bigLampGrp;
let smallHead, bigHead;
let smallBulb, bigBulb, smallBulbLight, bigBulbLight;
let ball, floorObj, bigBall;
let ballRadius = 0.5;

const SMALL_EMISSIVE = 4.0, BIG_EMISSIVE = 6.0;
const SMALL_INTENS = 50, BIG_INTENS = 100;

const clock = new THREE.Clock();
let animOn = false;

const seq = {
  phase: 0,
  phaseStart: 0,
  smallHome: new THREE.Vector3(),
  bigHome: new THREE.Vector3(),
  ballHome: new THREE.Vector3(),
  ballScale: new THREE.Vector3()
};

/* helpers */
function easeInOutCubic(t){ return t < 0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
function easeOutBounce(t){ const n1=7.5625,d1=2.75; return t<1/d1?n1*t*t:t<2/d1?n1*(t-=1.5/d1)*t+.75:t<2.5/d1?n1*(t-=2.25/d1)*t+.9375:n1*(t-=2.625/d1)*t+.984375; }
function easeInQuad(t){ return t*t; }
function easeOutCubic(t){ return 1-Math.pow(1-t,3); }

const smallNames = [
  "Cablesml","Bulb","Head","Base","Complecated_Bits",
  "Cylinder","Cylinder001","Cylinder002","Cylinder003","Cylinder004",
  "Cylinder005","Cylinder006","Cylinder007","Cylinder008","Cylinder009",
  "Cylinder0010","Cylinder0011"
];
const bigNames = [
  "Big_Base","Big_Bulb","Big_Head","Plane","Plane001","Plane002","Plane003",
  "Plane004","Plane005","Plane006","Cylinder0012","Cylinder0013","Cylinder0014",
  "Cylinder0015","Cylinder0016","Cylinder0017","Cylinder0018","Cylinder0019",
  "Cylinder0020","Cylinder0021","Cylinder0022","Cylinder0023","Cylinder0024","Cablebig"
];

/* collect unique top-level nodes (direct child of scene) */
function collectTopLevel(sceneRoot, names){
  const set = new Set();
  for(const n of names){
    const obj = sceneRoot.getObjectByName(n);
    if(!obj) continue;
    let p = obj;
    while(p.parent && p.parent !== sceneRoot) p = p.parent;
    set.add(p);
  }
  // remove descendants if any parent already included
  const arr = Array.from(set);
  return arr.filter(a => !arr.some(b => b !== a && a.parent && a.parent.id === b.id));
}

/* group top-level nodes into a container using attach() to preserve world transform */
function makeLampGroup(sceneRoot, names, groupName){
  const tops = collectTopLevel(sceneRoot, names);
  if(tops.length === 0) return null;

  const bbox = new THREE.Box3();
  tops.forEach(o => bbox.expandByObject(o));
  const center = bbox.getCenter(new THREE.Vector3());

  const grp = new THREE.Group();
  grp.name = groupName;
  grp.position.copy(center);
  sceneRoot.add(grp);

  tops.forEach(o => grp.attach(o)); // preserve world transform [web:27]
  return grp;
}

/* setup */
function setupGLTF(gltf){
  const root = gltf.scene;

  // materials receive/cast
  root.traverse(o => {
    if(o.isMesh){
      o.castShadow = true;
      o.receiveShadow = o.name === "Floor";
    }
  });

  // build groups
  smallLampGrp = makeLampGroup(root, smallNames, "SmallLampGroup");
  bigLampGrp   = makeLampGroup(root, bigNames,   "BigLampGroup");

  // cache parts from new hierarchy
  smallHead = smallLampGrp ? smallLampGrp.getObjectByName("Head") : null;
  bigHead   = bigLampGrp   ? bigLampGrp.getObjectByName("Big_Head") : null;

  smallBulb = smallLampGrp ? smallLampGrp.getObjectByName("Bulb") : root.getObjectByName("Bulb");
  bigBulb   = bigLampGrp   ? bigLampGrp.getObjectByName("Big_Bulb") : root.getObjectByName("Big_Bulb");

  // emissive + bulb lights
  if(smallBulb && smallBulb.material){
    smallBulb.material.emissive = new THREE.Color(0xffe6b3);
    smallBulb.material.emissiveIntensity = SMALL_EMISSIVE;
    smallBulbLight = new THREE.PointLight(0xfff2cc, SMALL_INTENS, 60, 2);
    smallBulbLight.castShadow = true;
    smallBulb.add(smallBulbLight);
  }
  if(bigBulb && bigBulb.material){
    bigBulb.material.emissive = new THREE.Color(0xffe6b3);
    bigBulb.material.emissiveIntensity = BIG_EMISSIVE;
    bigBulbLight = new THREE.PointLight(0xfff2cc, BIG_INTENS, 80, 2);
    bigBulbLight.castShadow = true;
    bigBulb.add(bigBulbLight);
  }

  // ball + floor
  ball = root.getObjectByName("Ballsml");
  floorObj = root.getObjectByName("Floor");

  if(ball){
    const bb = new THREE.Box3().setFromObject(ball);
    ballRadius = (bb.max.x - bb.min.x) / 2;
    seq.ballHome.copy(ball.getWorldPosition(new THREE.Vector3())); // world anchor [web:29]
    seq.ballScale.copy(ball.scale);
  }

  // anchor homes = group world positions (centers)
  if(smallLampGrp) seq.smallHome.copy(smallLampGrp.getWorldPosition(new THREE.Vector3())); // [web:29]
  if(bigLampGrp)   seq.bigHome.copy(bigLampGrp.getWorldPosition(new THREE.Vector3()));     // [web:29]

  // big spare ball
  if(ball){
    const bigGeom = new THREE.SphereGeometry(ballRadius * 1.8, 32, 32);
    const bigMat  = new THREE.MeshStandardMaterial({ color: 0xff6b6b, metalness: 0.3, roughness: 0.7 });
    bigBall = new THREE.Mesh(bigGeom, bigMat);
    bigBall.castShadow = true;
    const pos = bigLampGrp ? bigLampGrp.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
    bigBall.position.set(pos.x + 10, ballRadius * 1.8, pos.z);
    bigBall.visible = false;
    scene.add(bigBall);
  }

  animOn = true;
  console.log("✓ Setup complete. Press SPACE to play.");
}

/* loader */
const loader = new GLTFLoader();
loader.load(
  "coloredluxojr.glb",
  gltf => { scene.add(gltf.scene); setupGLTF(gltf); },
  xhr  => { console.log(`Loading ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`); },
  err  => { console.error("GLB load error:", err); }
);

/* look-at by rotating head node around Y */
function headLookAt(group, headNode, target, alpha){
  if(!group || !headNode) return;
  const origin = group.getWorldPosition(new THREE.Vector3()); // [web:29]
  const dir = new THREE.Vector3().subVectors(target, origin);
  const yaw = Math.atan2(dir.x, dir.z);
  headNode.rotation.y = THREE.MathUtils.lerp(headNode.rotation.y, yaw, alpha);
}

/* animation sequence (ringkas) */
function updateSequence(t){
  if(!animOn || !smallLampGrp || !bigLampGrp || !ball) return;

  const elapsed = t - seq.phaseStart;

  if(seq.phase === 0){
    if(bigHead) bigHead.rotation.x = Math.sin(t*2)*0.03;
    if(smallHead) smallHead.rotation.x = Math.sin(t*2)*0.015;
    if(elapsed > 1){ seq.phase = 1; seq.phaseStart = t; }
  }
  else if(seq.phase === 1){
    const d=2, p=Math.min(elapsed/d,1);
    const startX = seq.ballHome.x + 8;
    const targetX = seq.bigHome.x + 2;
    ball.position.x = startX + (targetX - startX)*easeInOutCubic(p);
    ball.rotation.z -= 0.05;
    if(elapsed > d){ seq.phase = 2; seq.phaseStart = t; }
  }
  else if(seq.phase === 2){
    const d=1, p=Math.min(elapsed/d,1);
    headLookAt(bigLampGrp, bigHead, ball.getWorldPosition(new THREE.Vector3()), 0.3*p);
    if(bigHead) bigHead.rotation.x = -0.4*easeInOutCubic(p);
    if(elapsed > d){ seq.phase = 3; seq.phaseStart = t; }
  }
  else if(seq.phase === 3){
    const d=2, p=Math.min(elapsed/d,1);
    if(bigHead){
      if(p<0.3) bigHead.rotation.x = -0.4 - easeInQuad(p/0.3)*0.6;
      else if(p<0.5) bigHead.rotation.x = -1.0 + easeOutCubic((p-0.3)/0.2)*0.8;
      else bigHead.rotation.x = -0.2;
    }
    if(p>0.35){
      const bp=(p-0.35)/0.65;
      const targetX = seq.smallHome.x - 2;
      ball.position.x = seq.bigHome.x + 2 + (targetX - (seq.bigHome.x + 2))*easeInOutCubic(bp);
      ball.position.y = seq.ballHome.y + Math.sin(bp*Math.PI)*1.2;
      ball.rotation.z -= 0.08;
    }
    if(elapsed>d){ seq.phase=4; seq.phaseStart=t; }
  }
  else if(seq.phase === 4){
    const d=2, p=Math.min(elapsed/d,1);
    headLookAt(smallLampGrp, smallHead, ball.getWorldPosition(new THREE.Vector3()), 0.3);
    if(smallHead){
      if(p<0.3) smallHead.rotation.x = -easeInQuad(p/0.3)*0.8;
      else if(p<0.5) smallHead.rotation.x = -0.8 + easeOutCubic((p-0.3)/0.2)*0.6;
      else smallHead.rotation.x = -0.2;
    }
    if(p>0.35){
      const bp=(p-0.35)/0.65;
      const startX = seq.smallHome.x - 2;
      const targetX = seq.bigHome.x + 2;
      ball.position.x = startX + (targetX - startX)*easeInOutCubic(bp);
      ball.position.y = seq.ballHome.y + Math.sin(bp*Math.PI)*1.0;
      ball.rotation.z += 0.08;
    }
    if(elapsed>d){ seq.phase=5; seq.phaseStart=t; }
  }
  else if(seq.phase === 5){
    const d=1, p=Math.min(elapsed/d,1);
    headLookAt(bigLampGrp, bigHead, smallLampGrp.getWorldPosition(new THREE.Vector3()), 0.4*p);
    if(elapsed>d){ seq.phase=6; seq.phaseStart=t; }
  }
  // lanjutkan fase lain sesuai kebutuhan…
}

/* input */
window.addEventListener("keydown", e => {
  if(e.code === "Space" && smallLampGrp && bigLampGrp && ball){
    animOn = true;
    seq.phase = 0;
    seq.phaseStart = clock.getElapsedTime();

    // reset ke anchor world
    const sh = seq.smallHome.clone(), bh = seq.bigHome.clone();
    smallLampGrp.position.add(sh.sub(smallLampGrp.getWorldPosition(new THREE.Vector3())));
    bigLampGrp.position.add(bh.sub(bigLampGrp.getWorldPosition(new THREE.Vector3())));

    ball.position.copy(seq.ballHome);
    ball.scale.copy(seq.ballScale);
    if(bigHead) bigHead.rotation.set(0,0,0);
    if(smallHead) smallHead.rotation.set(0,0,0);
    if(bigBall) bigBall.visible = false;
  }
});

/* loop */
function animate(){
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  updateSequence(t);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});