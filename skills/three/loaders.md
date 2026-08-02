# Three.js Loaders

## LoadingManager

```javascript
const manager = new THREE.LoadingManager();
manager.onStart = (url, loaded, total) => console.log(`Started: ${url}`);
manager.onLoad = () => console.log("All loaded!");
manager.onProgress = (url, loaded, total) => console.log(`${loaded}/${total}`);
manager.onError = (url) => console.error(`Error: ${url}`);

const textureLoader = new THREE.TextureLoader(manager);
const gltfLoader = new GLTFLoader(manager);
```

## GLTF/GLB Loading

```javascript
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
loader.load("model.glb", (gltf) => {
  const model = gltf.scene;
  scene.add(model);

  // Animations
  if (gltf.animations.length > 0) {
    const mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
  }

  // Enable shadows
  model.traverse((child) => {
    if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
  });

  // Center and scale
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  model.position.sub(center);
  model.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
});
```

## GLTF with Draco Compression

```javascript
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
dracoLoader.preload();
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
```

## GLTF with KTX2

```javascript
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/");
ktx2Loader.detectSupport(renderer);
gltfLoader.setKTX2Loader(ktx2Loader);
```

## HDR Loading

```javascript
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
new RGBELoader().load("environment.hdr", (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.background = texture;
});
```

## Other Formats

```javascript
// OBJ + MTL
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";

// FBX
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

// STL
import { STLLoader } from "three/addons/loaders/STLLoader.js";
```

## Async/Promise Patterns

```javascript
function loadModel(url) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(url, resolve, undefined, reject);
  });
}

async function loadAssets() {
  const [model, env, texture] = await Promise.all([
    loadModel("model.glb"),
    loadRGBE("environment.hdr"),
    loadTexture("color.jpg"),
  ]);
}
```

## Caching

```javascript
THREE.Cache.enabled = true;
```

## Error Handling

```javascript
async function loadWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try { return await loadModel(url); }
    catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```
