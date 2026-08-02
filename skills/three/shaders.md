# Three.js Shaders

## ShaderMaterial (with built-in uniforms)

```javascript
const material = new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 }, color: { value: new THREE.Color(0xff0000) } },
  vertexShader: `
    // Built-in: modelMatrix, modelViewMatrix, projectionMatrix, viewMatrix, normalMatrix, cameraPosition
    // Built-in attributes: position, normal, uv
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    void main() { gl_FragColor = vec4(color, 1.0); }
  `,
});
```

## Uniform Types

```javascript
uniforms: {
  floatValue: { value: 1.5 },
  vec2Value: { value: new THREE.Vector2(1, 2) },
  vec3Value: { value: new THREE.Vector3(1, 2, 3) },
  colorValue: { value: new THREE.Color(0xff0000) },
  mat4Value: { value: new THREE.Matrix4() },
  textureValue: { value: texture },
  floatArray: { value: [1.0, 2.0, 3.0] },
}
```

## Varyings

```javascript
vertexShader: `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,
```

## Common Patterns

### Vertex Displacement

```glsl
uniform float time;
void main() {
  vec3 pos = position;
  pos.z += sin(pos.x * 5.0 + time) * 0.5;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

### Fresnel Effect

```glsl
vec3 viewDir = normalize(cameraPosition - vWorldPosition);
float fresnel = pow(1.0 - dot(viewDir, vNormal), 3.0);
gl_FragColor = vec4(mix(baseColor, fresnelColor, fresnel), 1.0);
```

### Noise

```glsl
float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 st) {
  vec2 i = floor(st); vec2 f = fract(st);
  float a = random(i); float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
```

### Dissolve

```glsl
uniform float progress;
uniform sampler2D noiseMap;
void main() {
  float noise = texture2D(noiseMap, vUv).r;
  if (noise < progress) discard;
  float edge = smoothstep(progress, progress + 0.1, noise);
  gl_FragColor = vec4(mix(vec3(1.0,0.5,0.0), vec3(0.5), edge), 1.0);
}
```

## Extending Built-in Materials (onBeforeCompile)

```javascript
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
material.onBeforeCompile = (shader) => {
  shader.uniforms.time = { value: 0 };
  material.userData.shader = shader;
  shader.vertexShader = "uniform float time;\n" + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    "#include <begin_vertex>",
    `#include <begin_vertex>
    transformed.y += sin(position.x * 10.0 + time) * 0.1;`
  );
};
```

## GLSL Built-in Functions

```glsl
// Math: abs, sign, floor, ceil, fract, mod, min, max, clamp, mix, step, smoothstep
// Trig: sin, cos, tan, asin, acos, atan, radians, degrees
// Exp: pow, exp, log, sqrt, inversesqrt
// Vector: length, distance, dot, cross, normalize, reflect, refract
// Texture: texture2D(sampler, coord), textureCube(sampler, coord)
```

## Material Properties

```javascript
new THREE.ShaderMaterial({
  transparent: true, side: THREE.DoubleSide,
  depthTest: true, depthWrite: true,
  blending: THREE.AdditiveBlending,
  extensions: { derivatives: true },
  glslVersion: THREE.GLSL3, // for WebGL2
});
```
