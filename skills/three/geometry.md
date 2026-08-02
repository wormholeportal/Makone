# Three.js Geometry

## Built-in Geometries

```javascript
new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
new THREE.SphereGeometry(1, 32, 32);
new THREE.PlaneGeometry(10, 10, 1, 1);
new THREE.CircleGeometry(1, 32);
new THREE.CylinderGeometry(1, 1, 2, 32, 1, false);
new THREE.ConeGeometry(1, 2, 32, 1, false);
new THREE.TorusGeometry(1, 0.4, 16, 100);
new THREE.TorusKnotGeometry(1, 0.4, 100, 16, 2, 3);
new THREE.RingGeometry(0.5, 1, 32, 1);
new THREE.CapsuleGeometry(0.5, 1, 4, 8);
new THREE.DodecahedronGeometry(1, 0);
new THREE.IcosahedronGeometry(1, 0);
new THREE.OctahedronGeometry(1, 0);
new THREE.TetrahedronGeometry(1, 0);
```

## Path-Based Shapes

```javascript
// Lathe
const points = [new THREE.Vector2(0, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0.5, 1), new THREE.Vector2(0, 1)];
new THREE.LatheGeometry(points, 32);

// Extrude
const shape = new THREE.Shape();
shape.moveTo(0, 0); shape.lineTo(1, 0); shape.lineTo(1, 1); shape.lineTo(0, 1); shape.lineTo(0, 0);
new THREE.ExtrudeGeometry(shape, { steps: 2, depth: 1, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3 });

// Tube
const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)]);
new THREE.TubeGeometry(curve, 64, 0.2, 8, false);
```

## Text Geometry

```javascript
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

const loader = new FontLoader();
loader.load("fonts/helvetiker_regular.typeface.json", (font) => {
  const geometry = new TextGeometry("Hello", {
    font, size: 1, depth: 0.2, curveSegments: 12,
    bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 5,
  });
  geometry.center();
});
```

## Custom BufferGeometry

```javascript
const geometry = new THREE.BufferGeometry();
const vertices = new Float32Array([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0]);
geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
const indices = new Uint16Array([0,1,2, 0,2,3]);
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
const normals = new Float32Array([0,0,1, 0,0,1, 0,0,1, 0,0,1]);
geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
const uvs = new Float32Array([0,0, 1,0, 1,1, 0,1]);
geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
```

## Modifying BufferGeometry

```javascript
const positions = geometry.attributes.position;
positions.setXYZ(index, x, y, z);
positions.needsUpdate = true;
geometry.computeVertexNormals();
geometry.computeBoundingBox();
geometry.computeBoundingSphere();
```

## EdgesGeometry & WireframeGeometry

```javascript
const edges = new THREE.EdgesGeometry(boxGeometry, 15);
const edgeMesh = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));

const wireframe = new THREE.WireframeGeometry(boxGeometry);
const wireMesh = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ color: 0xffffff }));
```

## Points & Lines

```javascript
// Points
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(1000 * 3);
for (let i = 0; i < 1000 * 3; i++) positions[i] = (Math.random() - 0.5) * 10;
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const points = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.1, sizeAttenuation: true }));

// Lines
const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1,0,0), new THREE.Vector3(0,1,0), new THREE.Vector3(1,0,0)]);
const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xff0000 }));
```

## InstancedMesh

```javascript
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const count = 1000;
const instancedMesh = new THREE.InstancedMesh(geometry, material, count);

const dummy = new THREE.Object3D();
for (let i = 0; i < count; i++) {
  dummy.position.set((Math.random()-0.5)*20, (Math.random()-0.5)*20, (Math.random()-0.5)*20);
  dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
  dummy.scale.setScalar(0.5 + Math.random());
  dummy.updateMatrix();
  instancedMesh.setMatrixAt(i, dummy.matrix);
}
instancedMesh.instanceMatrix.needsUpdate = true;
scene.add(instancedMesh);
```

## Geometry Utilities

```javascript
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
const merged = BufferGeometryUtils.mergeGeometries([geo1, geo2, geo3]);
const merged = BufferGeometryUtils.mergeGeometries([geo1, geo2], true); // with groups
BufferGeometryUtils.computeTangents(geometry);
```

## Morph Targets

```javascript
const geometry = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
const morphPositions = geometry.attributes.position.array.slice();
for (let i = 0; i < morphPositions.length; i += 3) {
  morphPositions[i] *= 2;
  morphPositions[i + 1] *= 0.5;
}
geometry.morphAttributes.position = [new THREE.BufferAttribute(new Float32Array(morphPositions), 3)];
const mesh = new THREE.Mesh(geometry, material);
mesh.morphTargetInfluences[0] = 0.5;
```

## Performance Tips

1. **Use indexed geometry**: Reuse vertices with indices
2. **Merge static meshes**: Reduce draw calls
3. **Use InstancedMesh**: For many identical objects
4. **Choose appropriate segment counts**: More = smoother but slower
5. **Dispose unused geometry**: `geometry.dispose()`
