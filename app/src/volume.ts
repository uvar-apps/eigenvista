import * as THREE from "three";
import type { SampledGrid, RenderMode, SurfaceShading } from "./types";
import { volumeBrickRanges, type VolumeBrickRanges } from "./volumeRanges";
import { SURFACE_LIGHTING_GLSL } from "./sceneLighting";

export type VolumeQuality = 1 | 2 | 4;
const rangeCache = new WeakMap<
  Float32Array,
  { shape: string; ranges: VolumeBrickRanges }
>();

export function volumeObject(
  grid: SampledGrid,
  mode: RenderMode,
  iso: number,
  positive: string,
  negative: string,
  opacity: number,
  filtered: boolean,
  shading: SurfaceShading,
  samplesPerVoxel: VolumeQuality = 2,
) {
  if (![1, 2, 4].includes(samplesPerVoxel))
    throw new Error("Unsupported volume sampling quality");
  const shape = grid.dims.join(",");
  let cached = rangeCache.get(grid.values);
  if (cached?.shape !== shape) {
    cached = { shape, ranges: volumeBrickRanges(grid) };
    rangeCache.set(grid.values, cached);
  }
  const ranges = cached.ranges;
  const rangesTexture = new THREE.Data3DTexture(ranges.values, ...ranges.dims);
  rangesTexture.format = THREE.RGFormat;
  rangesTexture.type = THREE.FloatType;
  rangesTexture.minFilter = rangesTexture.magFilter = THREE.NearestFilter;
  rangesTexture.unpackAlignment = 1;
  rangesTexture.needsUpdate = true;
  const [nx, ny, nz] = grid.dims;
  const texture = new THREE.Data3DTexture(grid.values, nx, ny, nz);
  texture.format = THREE.RedFormat;
  texture.type = THREE.FloatType;
  texture.minFilter = texture.magFilter = filtered
    ? THREE.LinearFilter
    : THREE.NearestFilter;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  const a = grid.axes.map((v, i) =>
    new THREE.Vector3(...v).multiplyScalar(grid.dims[i] - 1),
  );
  const transform = new THREE.Matrix4()
    .makeBasis(a[0], a[1], a[2])
    .setPosition(...(grid.origin as [number, number, number]));
  const geometry = new THREE.BoxGeometry(1, 1, 1)
    .translate(0.5, 0.5, 0.5)
    .applyMatrix4(transform);
  // The baked transform bypasses Three.js's object-matrix winding correction.
  if (transform.determinant() < 0) {
    const indices = geometry.getIndex()!;
    for (let i = 0; i < indices.count; i += 3) {
      const second = indices.getX(i + 1);
      indices.setX(i + 1, indices.getX(i + 2));
      indices.setX(i + 2, second);
    }
  }
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: mode === "raycast",
    defines: {
      SKIP_EMPTY_BRICKS: 1,
      ...(filtered ? { FILTERED_FIELD: 1 } : {}),
      ...(shading === "blinn-phong" ? { SURFACE_BLINN_PHONG: 1 } : {}),
    },
    uniforms: {
      field: { value: texture },
      brickRanges: { value: rangesTexture },
      brickSize: { value: ranges.cellSize },
      samplesPerVoxel: { value: samplesPerVoxel },
      gridSize: { value: new THREE.Vector3(nx, ny, nz) },
      worldToGrid: { value: transform.clone().invert() },
      vp: { value: new THREE.Matrix4() },
      positiveColor: { value: new THREE.Color(positive) },
      negativeColor: { value: new THREE.Color(negative) },
      iso: { value: iso },
      opacity: { value: opacity },
      volumeMode: { value: mode === "volume" },
      epsilon: {
        value:
          Math.min(...grid.axes.map((v) => new THREE.Vector3(...v).length())) *
          0.5,
      },
    },
    vertexShader: `out vec3 worldPoint;
      void main() { vec4 p=modelMatrix*vec4(position,1.0);worldPoint=p.xyz;gl_Position=projectionMatrix*viewMatrix*p; }`,
    fragmentShader: `precision highp float; precision highp sampler3D;
      out vec4 outputColor;
      #define gl_FragColor outputColor
      uniform sampler3D field; uniform vec3 gridSize; uniform mat4 worldToGrid; uniform mat4 vp;
      uniform sampler3D brickRanges; uniform float brickSize; uniform float samplesPerVoxel;
      uniform vec3 positiveColor; uniform vec3 negativeColor; uniform float iso; uniform float opacity;
      uniform bool volumeMode; uniform float epsilon; in vec3 worldPoint;
      ${SURFACE_LIGHTING_GLSL}
      const float visibilityAlpha=0.005;
      float scalar(vec3 p) {
        vec3 g=clamp((worldToGrid*vec4(p,1.0)).xyz,0.0,1.0)*(gridSize-1.0);
        #ifdef FILTERED_FIELD
          return texture(field,(g+0.5)/gridSize).r;
        #else
        ivec3 i=ivec3(floor(g)); ivec3 j=min(i+ivec3(1),ivec3(gridSize)-1);vec3 f=fract(g);
        float z0=mix(mix(texelFetch(field,i,0).r,texelFetch(field,ivec3(j.x,i.y,i.z),0).r,f.x),
          mix(texelFetch(field,ivec3(i.x,j.y,i.z),0).r,texelFetch(field,ivec3(j.x,j.y,i.z),0).r,f.x),f.y);
        float z1=mix(mix(texelFetch(field,ivec3(i.x,i.y,j.z),0).r,texelFetch(field,ivec3(j.x,i.y,j.z),0).r,f.x),
          mix(texelFetch(field,ivec3(i.x,j.y,j.z),0).r,texelFetch(field,j,0).r,f.x),f.y);
        return mix(z0,z1,f.z);
        #endif
      }
      vec3 gradient(vec3 p) {return vec3(scalar(p+vec3(epsilon,0,0))-scalar(p-vec3(epsilon,0,0)),
        scalar(p+vec3(0,epsilon,0))-scalar(p-vec3(0,epsilon,0)),scalar(p+vec3(0,0,epsilon))-scalar(p-vec3(0,0,epsilon)));}
      void composite(inout vec4 accum,vec3 color,float alpha) {
        accum.rgb+=(1.0-accum.a)*color*alpha;accum.a+=(1.0-accum.a)*alpha;
      }
      void main() {
        vec3 direction=normalize(worldPoint-cameraPosition);
        vec3 o=(worldToGrid*vec4(cameraPosition,1)).xyz;vec3 d=(worldToGrid*vec4(direction,0)).xyz;
        vec3 safeD=vec3(d.x==0.0?1e-20:d.x,d.y==0.0?1e-20:d.y,d.z==0.0?1e-20:d.z);
        vec3 ta=(vec3(0)-o)/safeD;vec3 tb=(vec3(1)-o)/safeD;
        vec3 low=min(ta,tb);vec3 high=max(ta,tb);
        float start=max(0.0,max(low.x,max(low.y,low.z)));float end=min(high.x,min(high.y,high.z));
        if(end<=start)discard;
        vec3 voxelDirection=d*(gridSize-1.0);
        float stepCount = ceil(length(voxelDirection) * (end-start) * samplesPerVoxel);
        float stepSize=(end-start)/max(stepCount,1.0);
        vec4 accum=vec4(0);float first=-1.0;float prev=scalar(cameraPosition+direction*start);
        float t=start;
        for(int i=0;i<4096;i++) {
          if(t>=end)break;
          #if SKIP_EMPTY_BRICKS
            vec3 voxel=clamp((o+d*t)*(gridSize-1.0),vec3(0),gridSize-1.0);
            ivec3 brick=clamp(ivec3(floor(voxel/brickSize)),ivec3(0),textureSize(brickRanges,0)-1);
            vec2 range=texelFetch(brickRanges,brick,0).rg;
            float pad=max(max(abs(range.x),abs(range.y)),iso)*1e-6+1e-30;
            bool empty=volumeMode
              ? max(abs(range.x),abs(range.y))+pad<iso*0.3
              : !((range.x-pad<=iso&&range.y+pad>=iso)||(range.x-pad<=-iso&&range.y+pad>=-iso));
            if(empty) {
              vec3 lowFace=vec3(brick)*brickSize;
              vec3 highFace=min(lowFace+brickSize,gridSize-1.0);
              vec3 face=vec3(voxelDirection.x<0.0?lowFace.x:highFace.x,
                voxelDirection.y<0.0?lowFace.y:highFace.y,voxelDirection.z<0.0?lowFace.z:highFace.z);
              vec3 distanceToFace=vec3(voxelDirection.x==0.0?1e30:(face.x-voxel.x)/voxelDirection.x,
                voxelDirection.y==0.0?1e30:(face.y-voxel.y)/voxelDirection.y,
                voxelDirection.z==0.0?1e30:(face.z-voxel.z)/voxelDirection.z);
              float nextBrick=min(end,t+min(distanceToFace.x,min(distanceToFace.y,distanceToFace.z)));
              if(nextBrick>t) {
                t=nextBrick;prev=scalar(cameraPosition+direction*t);continue;
              }
            }
          #endif
          // Resume on the global sample lattice after an exact brick-face jump.
          float nextT=min(end,start+(floor((t-start)/stepSize)+1.0)*stepSize);
          if(nextT<=t)nextT=min(end,t+stepSize);
          if(nextT<=t)break;
          float segment=nextT-t;
          vec3 p=cameraPosition+direction*nextT;float value=scalar(p);
          if(volumeMode) {
            float band=smoothstep(iso*0.3,iso,max(abs(value),0.0));
            float alpha=1.0-exp(-band*opacity*segment*1.4);
            float before=accum.a;
            composite(accum,value>=0.0?positiveColor:negativeColor,alpha);
            // Locate the first accumulated-visible depth within this segment.
            float extinction=band*opacity*1.4;
            if(first<0.0&&accum.a>=visibilityAlpha&&extinction>0.0) {
              float offset=log((1.0-before)/(1.0-visibilityAlpha))/extinction;
              first=clamp(t+offset,t,nextT);
            }
          } else {
            bool pos=(prev<iso&&value>=iso)||(prev>iso&&value<=iso)||(t==start&&prev==iso&&value!=prev);
            bool neg=(prev<-iso&&value>=-iso)||(prev>-iso&&value<=-iso)||(t==start&&prev==-iso&&value!=prev);
            if(pos||neg) {
              bool both=pos&&neg;
              float firstLevel=both?(prev<value?-iso:iso):(pos?iso:-iso);
              vec2 levels=vec2(firstLevel,-firstLevel);vec2 hits=vec2(t);
              for(int crossing=0;crossing<2;crossing++) {
                if(crossing==1&&!both)break;
                float level=levels[crossing];float lo=t;float hi=nextT;float vl=prev-level;
                if(vl==0.0)hi=lo;
                for(int j=0;j<9;j++) {float mid=(lo+hi)*0.5;float vm=scalar(cameraPosition+direction*mid)-level;
                  if(vl*vm<=0.0)hi=mid;else{lo=mid;vl=vm;}}
                hits[crossing]=(lo+hi)*0.5;
              }
              if(both&&hits.y<hits.x){hits=hits.yx;levels=levels.yx;}
              for(int crossing=0;crossing<2;crossing++) {
                if(crossing==1&&!both)break;
                float hit=hits[crossing];p=cameraPosition+direction*hit;
                vec3 grad=gradient(p);vec3 n=length(grad)>1e-12?normalize(grad):vec3(0,1,0);
                #ifdef SURFACE_BLINN_PHONG
                  float light=sceneSurfaceLighting(n,cameraPosition-p,true);
                #else
                  float light=sceneSurfaceLighting(n,cameraPosition-p,false);
                #endif
                if(opacity>0.001&&first<0.0)first=hit;
                composite(accum,(levels[crossing]>0.0?positiveColor:negativeColor)*light,opacity);
                if(accum.a>0.99)break;
              }
            }
          }
          if(accum.a>0.99)break;prev=value;t=nextT;
        }
        if(accum.a<visibilityAlpha||first<0.0)discard;
        vec4 clip=vp*vec4(cameraPosition+direction*first,1.0);gl_FragDepth=0.5*(clip.z/clip.w)+0.5;
        gl_FragColor=vec4(accum.rgb/accum.a,accum.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.onBeforeRender = (_r, _s, camera) =>
    material.uniforms.vp.value.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
  mesh.userData.texture = texture;
  mesh.userData.rangesTexture = rangesTexture;
  return mesh;
}
