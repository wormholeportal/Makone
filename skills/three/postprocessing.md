# Three.js Post-Processing

## Setup

```javascript
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Use composer.render() instead of renderer.render()
function animate() { requestAnimationFrame(animate); composer.render(); }

// Resize
function onResize() {
  renderer.setSize(w, h); composer.setSize(w, h);
}
```

## Common Effects

### Bloom

```javascript
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 0.85);
composer.addPass(bloomPass);
```

### FXAA / SMAA

```javascript
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.material.uniforms["resolution"].value.set(1/w, 1/h);
composer.addPass(fxaaPass);

import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
composer.addPass(new SMAAPass(w * dpr, h * dpr));
```

### SSAO

```javascript
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
const ssaoPass = new SSAOPass(scene, camera, w, h);
ssaoPass.kernelRadius = 16;
composer.addPass(ssaoPass);
```

### DOF

```javascript
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
const bokehPass = new BokehPass(scene, camera, { focus: 10.0, aperture: 0.025, maxblur: 0.01 });
composer.addPass(bokehPass);
```

### Film Grain / Vignette / Color Correction

```javascript
import { FilmPass } from "three/addons/postprocessing/FilmPass.js";
composer.addPass(new FilmPass(0.35, 0.5, 648, false));

import { VignetteShader } from "three/addons/shaders/VignetteShader.js";
const vignettePass = new ShaderPass(VignetteShader);
vignettePass.uniforms["offset"].value = 1.0;
vignettePass.uniforms["darkness"].value = 1.0;
composer.addPass(vignettePass);

import { GammaCorrectionShader } from "three/addons/shaders/GammaCorrectionShader.js";
composer.addPass(new ShaderPass(GammaCorrectionShader));
```

### Outline / Glitch / Pixelation / Halftone

```javascript
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
const outlinePass = new OutlinePass(new THREE.Vector2(w, h), scene, camera);
outlinePass.selectedObjects = [mesh1, mesh2];
composer.addPass(outlinePass);

import { GlitchPass } from "three/addons/postprocessing/GlitchPass.js";
composer.addPass(new GlitchPass());

import { RenderPixelatedPass } from "three/addons/postprocessing/RenderPixelatedPass.js";
composer.addPass(new RenderPixelatedPass(6, scene, camera));

import { HalftonePass } from "three/addons/postprocessing/HalftonePass.js";
composer.addPass(new HalftonePass(w, h, { shape: 1, radius: 4 }));
```

## Custom ShaderPass

```javascript
const CustomShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, intensity: { value: 1.0 } },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time, intensity;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      uv.x += sin(uv.y * 10.0 + time) * 0.01 * intensity;
      gl_FragColor = texture2D(tDiffuse, uv);
    }
  `,
};
const customPass = new ShaderPass(CustomShader);
composer.addPass(customPass);
customPass.uniforms.time.value = clock.getElapsedTime();
```

## Combining Effects

```javascript
composer.addPass(new RenderPass(scene, camera));
composer.addPass(bloomPass);
composer.addPass(vignettePass);
composer.addPass(new ShaderPass(GammaCorrectionShader));
composer.addPass(fxaaPass); // AA always last
```

## Performance Tips

1. Limit passes count
2. Lower resolution for blur passes
3. Toggle `pass.enabled = false` when not needed
4. Use FXAA over MSAA
