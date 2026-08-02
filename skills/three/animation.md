# Three.js Animation

## Animation System: AnimationClip + AnimationMixer + AnimationAction

```javascript
const mixer = new THREE.AnimationMixer(model);
const action = mixer.clipAction(clip);
action.play();

// Update in loop
function animate() {
  mixer.update(clock.getDelta());
}
```

## KeyframeTrack Types

```javascript
new THREE.VectorKeyframeTrack(".position", [0, 1, 2], [0,0,0, 1,2,0, 0,0,0]);
new THREE.QuaternionKeyframeTrack(".quaternion", [0, 1], [...q1, ...q2]);
new THREE.ColorKeyframeTrack(".material.color", [0, 1], [1,0,0, 0,1,0]);
new THREE.NumberKeyframeTrack(".material.opacity", [0, 1], [1, 0]);
new THREE.BooleanKeyframeTrack(".visible", [0, 0.5], [true, false]);

const clip = new THREE.AnimationClip("name", duration, [track1, track2]);
```

## AnimationAction Control

```javascript
const action = mixer.clipAction(clip);
action.play(); action.stop(); action.reset();
action.time = 0.5;
action.timeScale = 1; // negative = reverse
action.paused = false;
action.weight = 1;
action.loop = THREE.LoopRepeat; // LoopOnce, LoopPingPong
action.repetitions = 3;
action.clampWhenFinished = true;

// Crossfade
action1.crossFadeTo(action2, 0.5, true);
action2.play();

// Fade
action.reset().fadeIn(0.5).play();
action.fadeOut(0.5);
```

## GLTF Animations

```javascript
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

new GLTFLoader().load("model.glb", (gltf) => {
  scene.add(gltf.scene);
  const mixer = new THREE.AnimationMixer(gltf.scene);
  gltf.animations.forEach((clip) => mixer.clipAction(clip).play());

  // Or by name
  const walk = THREE.AnimationClip.findByName(gltf.animations, "Walk");
  if (walk) mixer.clipAction(walk).play();
});
```

## Skeletal Animation

```javascript
const skinnedMesh = model.getObjectByProperty("type", "SkinnedMesh");
const skeleton = skinnedMesh.skeleton;
const headBone = skeleton.bones.find((b) => b.name === "Head");
headBone.rotation.y = Math.sin(time) * 0.3;

// Attach to bone
const weapon = new THREE.Mesh(weaponGeo, weaponMat);
handBone.add(weapon);

// Helper
scene.add(new THREE.SkeletonHelper(model));
```

## Morph Targets

```javascript
mesh.morphTargetInfluences[0] = 0.5;
const idx = mesh.morphTargetDictionary["smile"];
mesh.morphTargetInfluences[idx] = 1;
```

## Animation Blending

```javascript
idleAction.play(); walkAction.play(); runAction.play();
idleAction.setEffectiveWeight(1);
walkAction.setEffectiveWeight(0);
runAction.setEffectiveWeight(0);

function updateAnimations(speed) {
  if (speed < 0.1) { idleAction.setEffectiveWeight(1); walkAction.setEffectiveWeight(0); }
  else if (speed < 5) { const t = speed/5; idleAction.setEffectiveWeight(1-t); walkAction.setEffectiveWeight(t); }
  else { const t = Math.min((speed-5)/5,1); walkAction.setEffectiveWeight(1-t); runAction.setEffectiveWeight(t); }
}

// Additive
THREE.AnimationUtils.makeClipAdditive(additiveClip);
additiveAction.blendMode = THREE.AdditiveAnimationBlendMode;
```

## Procedural Animation

```javascript
// Spring
class Spring {
  constructor(stiffness = 100, damping = 10) {
    this.stiffness = stiffness; this.damping = damping;
    this.position = 0; this.velocity = 0; this.target = 0;
  }
  update(dt) {
    const force = -this.stiffness * (this.position - this.target);
    this.velocity += (force - this.damping * this.velocity) * dt;
    this.position += this.velocity * dt;
    return this.position;
  }
}

// Oscillation
mesh.position.y = Math.sin(t * 2) * 0.5;
mesh.position.x = Math.cos(t) * 2;
mesh.position.z = Math.sin(t) * 2;
```
