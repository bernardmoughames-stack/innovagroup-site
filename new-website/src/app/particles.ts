import * as THREE from 'three';

/**
 * Loader sequence: thousands of gold particles fly in from a scattered cloud
 * and assemble onto the diamond's facet surfaces (targets sampled from the
 * Diamond geometry). Driven by a single 0..1 progress uniform.
 */
export class AssemblyParticles {
  readonly points: THREE.Points;
  private material: THREE.ShaderMaterial;

  constructor(targets: Float32Array) {
    const count = targets.length / 3;
    const starts = new Float32Array(count * 3);
    const delays = new Float32Array(count);
    const sizes = new Float32Array(count);

    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      v.randomDirection().multiplyScalar(5 + Math.random() * 6);
      starts[i * 3] = v.x;
      starts[i * 3 + 1] = v.y * 0.7;
      starts[i * 3 + 2] = v.z;
      delays[i] = Math.random() * 0.55;
      sizes[i] = 0.5 + Math.random() * 1.6;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(starts.slice(), 3));
    geo.setAttribute('aStart', new THREE.BufferAttribute(starts, 3));
    geo.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3));
    geo.setAttribute('aDelay', new THREE.BufferAttribute(delays, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uProgress: { value: 0 },
        uOpacity: { value: 1 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aStart;
        attribute vec3 aTarget;
        attribute float aDelay;
        attribute float aSize;
        uniform float uProgress;
        uniform float uTime;
        varying float vTwinkle;

        void main() {
          float p = clamp((uProgress - aDelay) / (1.0 - aDelay), 0.0, 1.0);
          p = p * p * (3.0 - 2.0 * p);
          vec3 pos = mix(aStart, aTarget, p);
          float wob = (1.0 - p) * 0.35;
          pos += vec3(
            sin(uTime * 1.7 + aDelay * 40.0),
            cos(uTime * 1.3 + aDelay * 31.0),
            sin(uTime * 2.1 + aDelay * 17.0)
          ) * wob;
          vTwinkle = 0.65 + 0.35 * sin(uTime * 3.0 + aDelay * 80.0);
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * vTwinkle * (140.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vTwinkle;

        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d);
          vec3 gold = mix(vec3(0.79, 0.64, 0.15), vec3(0.95, 0.84, 0.49), vTwinkle);
          gl_FragColor = vec4(gold, a * uOpacity);
        }
      `,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
  }

  setProgress(p: number): void {
    this.material.uniforms.uProgress.value = p;
  }

  setOpacity(o: number): void {
    this.material.uniforms.uOpacity.value = o;
    this.points.visible = o > 0.001;
  }

  update(t: number): void {
    this.material.uniforms.uTime.value = t;
  }
}
