# Three.js Materials

## Material Types Overview

| Material | Use Case | Lighting |
|---|---|---|
| MeshBasicMaterial | Unlit, flat colors, wireframes | No |
| MeshLambertMaterial | Matte surfaces, performance | Yes (diffuse only) |
| MeshPhongMaterial | Shiny surfaces, specular highlights | Yes |
| MeshStandardMaterial | PBR, realistic materials | Yes (PBR) |
| MeshPhysicalMaterial | Advanced PBR, clearcoat, transmission | Yes (PBR+) |
| MeshToonMaterial | Cel-shaded, cartoon look | Yes (toon) |
| ShaderMaterial | Custom GLSL shaders | Custom |

## MeshBasicMaterial

```javascript
new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5, side: THREE.DoubleSide, wireframe: false, map: texture });
```

## MeshStandardMaterial (PBR)

```javascript
const material = new THREE.MeshStandardMaterial({
  color: 0xffffff, roughness: 0.5, metalness: 0.0,
  map: colorTexture, roughnessMap: roughTexture, metalnessMap: metalTexture,
  normalMap: normalTexture, normalScale: new THREE.Vector2(1, 1),
  aoMap: aoTexture, aoMapIntensity: 1,
  displacementMap: dispTexture, displacementScale: 0.1,
  emissive: 0x000000, emissiveIntensity: 1, emissiveMap: emissiveTexture,
  envMap: envTexture, envMapIntensity: 1,
});
geometry.setAttribute("uv2", geometry.attributes.uv); // for aoMap
```

## MeshPhysicalMaterial (Advanced PBR)

```javascript
// Glass
new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0, transmission: 1, thickness: 0.5, ior: 1.5 });

// Car Paint
new THREE.MeshPhysicalMaterial({ color: 0xff0000, metalness: 0.9, roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.1 });

// Fabric
new THREE.MeshPhysicalMaterial({ sheen: 1.0, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffffff) });

// Iridescence
new THREE.MeshPhysicalMaterial({ iridescence: 1.0, iridescenceIOR: 1.3, iridescenceThicknessRange: [100, 400] });
```

## MeshToonMaterial

```javascript
const colors = new Uint8Array([0, 128, 255]);
const gradientMap = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
gradientMap.minFilter = THREE.NearestFilter;
gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;
new THREE.MeshToonMaterial({ color: 0x00ff00, gradientMap });
```

## ShaderMaterial

```javascript
const material = new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 }, color: { value: new THREE.Color(0xff0000) }, texture1: { value: texture } },
  vertexShader: `
    varying vec2 vUv;
    uniform float time;
    void main() {
      vUv = uv;
      vec3 pos = position;
      pos.z += sin(pos.x * 10.0 + time) * 0.1;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform vec3 color;
    uniform sampler2D texture1;
    void main() {
      vec4 texColor = texture2D(texture1, vUv);
      gl_FragColor = vec4(color * texColor.rgb, 1.0);
    }
  `,
});
material.uniforms.time.value = clock.getElapsedTime();
```

## Common Properties

```javascript
material.visible = true;
material.transparent = false;
material.opacity = 1.0;
material.alphaTest = 0;
material.side = THREE.FrontSide; // FrontSide, BackSide, DoubleSide
material.depthTest = true;
material.depthWrite = true;
material.blending = THREE.NormalBlending;
```

## Multiple Materials

```javascript
const materials = [mat1, mat2, mat3, mat4, mat5, mat6]; // one per face for BoxGeometry
const mesh = new THREE.Mesh(geometry, materials);
```

## Environment Maps

```javascript
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
new RGBELoader().load("environment.hdr", (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.background = texture;
});
```

## Performance Tips

1. **Reuse materials**: Same material = batched draw calls
2. **Use alphaTest instead of transparency** when applicable
3. **Choose simpler materials**: Basic > Lambert > Phong > Standard > Physical
4. **Material pooling**: Cache and reuse materials
5. **Dispose when done**: `material.dispose()`
