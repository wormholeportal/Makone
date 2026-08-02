# Three.js Interaction

## Raycasting

```javascript
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children);
  if (intersects.length > 0) console.log("Clicked:", intersects[0].object);
}
window.addEventListener("click", onClick);

// For canvas element
function updateMouseCanvas(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

// Touch
renderer.domElement.addEventListener("touchstart", (e) => {
  const touch = e.touches[0];
  mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
});

// Options
raycaster.near = 0; raycaster.far = 100;
raycaster.layers.set(1);
```

## Camera Controls

### OrbitControls

```javascript
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI / 2;
controls.minDistance = 2;
controls.maxDistance = 50;
controls.autoRotate = true;
controls.target.set(0, 1, 0);
// Update in loop: controls.update();
```

### Other Controls

```javascript
import { FlyControls } from "three/addons/controls/FlyControls.js";
import { FirstPersonControls } from "three/addons/controls/FirstPersonControls.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import { MapControls } from "three/addons/controls/MapControls.js";
```

## TransformControls

```javascript
import { TransformControls } from "three/addons/controls/TransformControls.js";
const tc = new TransformControls(camera, renderer.domElement);
scene.add(tc);
tc.attach(mesh);
tc.setMode("translate"); // 'translate', 'rotate', 'scale'
tc.addEventListener("dragging-changed", (e) => { orbitControls.enabled = !e.value; });
```

## DragControls

```javascript
import { DragControls } from "three/addons/controls/DragControls.js";
const dc = new DragControls([mesh1, mesh2], camera, renderer.domElement);
dc.addEventListener("dragstart", (e) => { orbitControls.enabled = false; });
dc.addEventListener("dragend", (e) => { orbitControls.enabled = true; });
```

## Hover Effects

```javascript
let hoveredObject = null;
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(hoverables);

  if (hoveredObject) {
    hoveredObject.material.color.set(hoveredObject.userData.originalColor);
    document.body.style.cursor = "default";
  }
  if (intersects.length > 0) {
    hoveredObject = intersects[0].object;
    if (!hoveredObject.userData.originalColor)
      hoveredObject.userData.originalColor = hoveredObject.material.color.getHex();
    hoveredObject.material.color.set(0xff6600);
    document.body.style.cursor = "pointer";
  } else hoveredObject = null;
}
```

## Coordinate Conversion

```javascript
// World to Screen
function worldToScreen(position, camera) {
  const v = position.clone().project(camera);
  return { x: ((v.x+1)/2)*window.innerWidth, y: (-(v.y-1)/2)*window.innerHeight };
}

// Screen to World (on plane)
function screenToWorld(sx, sy, camera, targetZ = 0) {
  const v = new THREE.Vector3((sx/window.innerWidth)*2-1, -(sy/window.innerHeight)*2+1, 0.5);
  v.unproject(camera);
  const dir = v.sub(camera.position).normalize();
  const dist = (targetZ - camera.position.z) / dir.z;
  return camera.position.clone().add(dir.multiplyScalar(dist));
}

// Ray-Plane
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const intersection = new THREE.Vector3();
raycaster.ray.intersectPlane(plane, intersection);
```

## Keyboard Input

```javascript
const keys = {};
document.addEventListener("keydown", (e) => { keys[e.code] = true; });
document.addEventListener("keyup", (e) => { keys[e.code] = false; });
function update() {
  if (keys["KeyW"]) player.position.z -= 0.1;
  if (keys["KeyS"]) player.position.z += 0.1;
  if (keys["KeyA"]) player.position.x -= 0.1;
  if (keys["KeyD"]) player.position.x += 0.1;
}
```

## Performance Tips

1. Throttle mousemove raycasts
2. Use layers to filter targets
3. Use simpler collision meshes
4. Disable controls when not needed
