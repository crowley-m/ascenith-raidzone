"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { rzState } from "./state";

const VERT = /* glsl */ `
uniform float uTime; uniform float uTurb; uniform float uPulse;
varying vec3 vNr; varying vec3 vV; varying float vNz;

vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 nr=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=nr.x;p1*=nr.y;p2*=nr.z;p3*=nr.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main(){
  vec3 pos = position;
  float t = uTime * 0.15;
  float n = snoise(normalize(position) * 1.4 + vec3(0.0, t, 0.0));
  n += 0.5 * snoise(normalize(position) * 3.0 + vec3(t));
  n += 0.25 * snoise(normalize(position) * 5.6 + vec3(0.0, t * 1.6, 0.0));
  pos += normal * n * (0.10 + uTurb * 0.26 + uPulse * 0.45);
  vNz = n;
  vNr = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform float uTime; uniform float uGlow; uniform float uPulse;
varying vec3 vNr; varying vec3 vV; varying float vNz;
void main(){
  float f = pow(1.0 - clamp(dot(vNr, vV), 0.0, 1.0), 2.6);
  float crack = smoothstep(0.17, -0.10, vNz);
  vec3 base = vec3(0.035, 0.010, 0.018);
  vec3 crim = vec3(1.0, 0.24, 0.32);
  vec3 col = base + crim * crack * (0.55 + uPulse * 1.4) + crim * f * 0.7;
  col += crim * 0.10 * (0.5 + 0.5 * sin(uTime * 0.5 + vNz * 4.0));
  float a = 0.30 + f * 0.55 + crack * 0.26 + uPulse * 0.3;
  gl_FragColor = vec4(col, a);
}`;

function Crystal() {
  const mesh = useRef<THREE.Mesh>(null);
  const { size } = useThree();

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uTurb: { value: 0.2 },
          uGlow: { value: 0.3 },
          uPulse: { value: 0 },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
      }),
    [],
  );

  const detail = size.width < 760 ? 26 : 48;
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1.5, detail), [detail]);

  const smx = useRef(0);
  const smy = useRef(0);
  const epulse = useRef(0);
  const erot = useRef(0);
  const ez = useRef(6.2);
  const placed = useRef(false);

  useFrame((st, dt) => {
    const S = rzState;
    const d = Math.min(dt, 0.05);
    smx.current += (S.mx - smx.current) * 0.05;
    smy.current += (S.my - smy.current) * 0.05;
    S.down *= 0.9;
    epulse.current += (S.down - epulse.current) * 0.2;

    const wide = size.width > 1000;
    const baseX = wide ? 2.5 : size.width > 700 ? 1.4 : 0;
    const baseS = wide ? 0.85 : size.width > 700 ? 0.7 : 0.52;
    const hp = S.hero;
    const pg = S.page;

    (mat.uniforms.uTime.value as number) = st.clock.elapsedTime;
    mat.uniforms.uPulse.value = epulse.current;
    mat.uniforms.uTurb.value = 0.18 + hp * 0.9 + Math.min(S.scrollVel * 0.4, 0.5);
    mat.uniforms.uGlow.value = 0.26 + hp * 1.4;

    if (mesh.current) {
      const m = mesh.current;
      const driftX = baseX - pg * 1.5 + Math.sin(pg * 7.0) * 1.2 + smx.current * 0.4;
      const driftY = -pg * 1.2 + Math.cos(pg * 5.0) * 0.8 + smy.current * 0.35;
      if (!placed.current) {
        m.position.set(driftX, driftY, 0);
        placed.current = true;
      }
      m.position.x += (driftX - m.position.x) * 0.05;
      m.position.y += (driftY - m.position.y) * 0.05;
      m.scale.setScalar(baseS + hp * 0.5 + epulse.current * 0.05);
      erot.current += d * 0.12;
      m.rotation.set(
        0.12 + hp * 0.8 + smy.current * 0.4,
        erot.current + hp * 2.2 + smx.current * 0.6,
        hp * 0.4,
      );
    }

    // fly toward / into the crystal across the hero
    const tz = 6.2 - hp * 4.6;
    ez.current += (tz - ez.current) * 0.08;
    st.camera.position.z = ez.current;
    st.camera.position.x += (smx.current * 0.35 - st.camera.position.x) * 0.04;
    st.camera.position.y += (smy.current * 0.25 - st.camera.position.y) * 0.04;
    st.camera.lookAt(
      (mesh.current?.position.x ?? 0) * 0.35,
      (mesh.current?.position.y ?? 0) * 0.3,
      0,
    );
  });

  return (
    <mesh ref={mesh} geometry={geo}>
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function Post() {
  const bloom = useRef<{ intensity: number }>(null);
  useFrame(() => {
    if (bloom.current) {
      // scroll velocity + hero fly-in push the bloom
      bloom.current.intensity =
        0.9 + rzState.hero * 0.9 + Math.min(rzState.scrollVel * 0.5, 0.7);
    }
  });
  return (
    <EffectComposer>
      <Bloom
        ref={bloom as never}
        intensity={1.0}
        luminanceThreshold={0.12}
        luminanceSmoothing={0.5}
        mipmapBlur
        radius={0.75}
      />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.3} />
      <Vignette offset={0.2} darkness={0.92} />
    </EffectComposer>
  );
}

export default function Scene() {
  return (
    <Canvas
      className="rz-canvas"
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      dpr={[1, 1.75]}
      camera={{ fov: 42, position: [0, 0, 6.2] }}
      style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }}
    >
      <Crystal />
      <Post />
    </Canvas>
  );
}
