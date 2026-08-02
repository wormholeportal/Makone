# Three.js Textures

## Loading

```javascript
const loader = new THREE.TextureLoader();
const texture = loader.load("texture.jpg");
material.map = texture;

// Promise wrapper
function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, reject);
  });
}
```

## Configuration

```javascript
// Color space
colorTexture.colorSpace = THREE.SRGBColorSpace; // for color maps
// Data textures (normal, roughness) - leave default

// Wrapping
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;

// Repeat/offset/rotation
texture.repeat.set(4, 4);
texture.offset.set(0.5, 0.5);
texture.rotation = Math.PI / 4;
texture.center.set(0.5, 0.5);

// Filtering
texture.minFilter = THREE.LinearMipmapLinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
```

## Texture Types

```javascript
// Data Texture
const data = new Uint8Array(size * size * 4);
const texture = new THREE.DataTexture(data, size, size);
texture.needsUpdate = true;

// Canvas Texture
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const texture = new THREE.CanvasTexture(canvas);

// Video Texture
const video = document.createElement("video");
video.src = "video.mp4"; video.loop = true; video.muted = true; video.play();
const texture = new THREE.VideoTexture(video);
texture.colorSpace = THREE.SRGBColorSpace;
```

## Cube & HDR Textures

```javascript
// CubeTexture
const cubeTexture = new THREE.CubeTextureLoader().load(["px.jpg","nx.jpg","py.jpg","ny.jpg","pz.jpg","nz.jpg"]);
scene.background = cubeTexture;
scene.environment = cubeTexture;

// HDR
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
new RGBELoader().load("environment.hdr", (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.background = texture;
});

scene.backgroundBlurriness = 0.5;
scene.backgroundIntensity = 1.0;
```

## Render Targets

```javascript
const renderTarget = new THREE.WebGLRenderTarget(512, 512, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
renderer.setRenderTarget(renderTarget);
renderer.render(scene, camera);
renderer.setRenderTarget(null);
material.map = renderTarget.texture;
```

## PBR Texture Set

```javascript
const material = new THREE.MeshStandardMaterial({
  map: colorTexture,                    // sRGB
  normalMap: normalTexture,             // Linear
  roughnessMap: roughnessTexture,       // Linear
  metalnessMap: metalnessTexture,       // Linear
  aoMap: aoTexture,                     // Linear, uses uv2
  emissiveMap: emissiveTexture,         // sRGB
  displacementMap: displacementTexture, // Linear
  alphaMap: alphaTexture, transparent: true,
});
geometry.setAttribute("uv2", geometry.attributes.uv);
```

## Memory Management

```javascript
texture.dispose();

function disposeMaterial(material) {
  ["map","normalMap","roughnessMap","metalnessMap","aoMap","emissiveMap","displacementMap","alphaMap","envMap"].forEach((name) => {
    if (material[name]) material[name].dispose();
  });
  material.dispose();
}
```

## Performance Tips

1. **Power-of-2 dimensions**: 256, 512, 1024, 2048
2. **Compress textures**: KTX2/Basis
3. **Use texture atlases**
4. **Enable mipmaps**
5. **Limit texture size**: 2048 usually sufficient for web
