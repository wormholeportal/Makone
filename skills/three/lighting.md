# Three.js Lighting

## Light Types

| Light | Description | Shadow | Cost |
|---|---|---|---|
| AmbientLight | Uniform everywhere | No | Very Low |
| HemisphereLight | Sky/ground gradient | No | Very Low |
| DirectionalLight | Parallel rays (sun) | Yes | Low |
| PointLight | Omnidirectional (bulb) | Yes | Medium |
| SpotLight | Cone-shaped | Yes | Medium |
| RectAreaLight | Area light (window) | No* | High |

## AmbientLight & HemisphereLight

```javascript
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0x87ceeb, 0x8b4513, 0.6);
hemi.position.set(0, 50, 0);
scene.add(hemi);
```

## DirectionalLight

```javascript
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
dirLight.target.position.set(0, 0, 0);
scene.add(dirLight.target);
scene.add(dirLight);

// Shadows
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
dirLight.shadow.radius = 4;
dirLight.shadow.bias = -0.0001;
dirLight.shadow.normalBias = 0.02;
```

## PointLight & SpotLight

```javascript
const pointLight = new THREE.PointLight(0xffffff, 1, 100, 2);
pointLight.position.set(0, 5, 0);
pointLight.castShadow = true;

const spotLight = new THREE.SpotLight(0xffffff, 1, 100, Math.PI / 6, 0.5, 2);
spotLight.position.set(0, 10, 0);
spotLight.target.position.set(0, 0, 0);
spotLight.castShadow = true;
```

## RectAreaLight

```javascript
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
RectAreaLightUniformsLib.init();
const rectLight = new THREE.RectAreaLight(0xffffff, 5, 4, 2);
rectLight.position.set(0, 5, 0);
rectLight.lookAt(0, 0, 0);
scene.add(rectLight);
```

## Shadow Setup

```javascript
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
light.castShadow = true;
mesh.castShadow = true;
mesh.receiveShadow = true;
```

## Environment Lighting (IBL)

```javascript
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
new RGBELoader().load("environment.hdr", (texture) => {
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  scene.environment = envMap;
  scene.background = envMap;
  texture.dispose();
  pmremGenerator.dispose();
});
```

## Common Setups

### Three-Point Lighting

```javascript
const keyLight = new THREE.DirectionalLight(0xffffff, 1);
keyLight.position.set(5, 5, 5);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-5, 3, 5);
const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
backLight.position.set(0, 5, -5);
const ambient = new THREE.AmbientLight(0x404040, 0.3);
scene.add(keyLight, fillLight, backLight, ambient);
```

## Light Helpers

```javascript
scene.add(new THREE.DirectionalLightHelper(dirLight, 5));
scene.add(new THREE.PointLightHelper(pointLight, 1));
scene.add(new THREE.SpotLightHelper(spotLight));
scene.add(new THREE.CameraHelper(dirLight.shadow.camera));
```

## Performance Tips

1. **Limit light count**: Each light adds shader complexity
2. **Use baked lighting**: For static scenes
3. **Smaller shadow maps**: 512-1024 often sufficient
4. **Tight shadow frustums**: Only cover needed area
5. **Use light layers**: Exclude objects from certain lights
