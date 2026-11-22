uniform sampler2D uStageTex;
uniform vec2 uResolution;
uniform float uAspect;
uniform float uTime;
uniform vec2 uLensPos;
uniform vec2 uLensVel;
uniform float uMassBoost;
uniform float uEinsteinRadius;
uniform float uDeflectionGain;
uniform float uDispersion;
uniform float uFilmIOR;
uniform float uFilmThicknessNm;
uniform float uLightTilt;
uniform float uCausticIntensity;
uniform float uReducedMotion;

in vec2 vUv;
out vec4 fragColor;

// Smooth 2D gradient noise for procedural refraction caustics
vec2 hash22(vec2 p) {
  p = vec2(
    dot(p, vec2(127.1, 311.7)),
    dot(p, vec2(269.5, 183.3))
  );
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float gradNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = dot(hash22(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
  float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

mat2 rot2(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float causticPattern(vec2 p, float tilt, float t) {
  vec2 warped = p;
  float n1 = gradNoise(p * 1.35 + vec2(t * 0.08, -tilt * 0.65));
  float n2 = gradNoise(p * 2.45 - vec2(tilt * 0.45, t * 0.06));
  warped += vec2(n1, n2) * 0.42;

  vec2 pA = rot2(0.42 + tilt * 0.38) * warped * 3.1;
  vec2 pB = rot2(-0.68 + tilt * 0.24) * warped * 3.7 + vec2(1.7, -0.9);
  vec2 pC = rot2(1.28 - tilt * 0.31) * warped * 2.6 - vec2(0.8, 1.4);

  float w1 = abs(sin(pA.x + sin(pA.y * 0.85 + t * 0.22) * 0.9));
  float w2 = abs(sin(pB.x + cos(pB.y * 0.92 - t * 0.18) * 0.85));
  float w3 = abs(sin(pC.y + sin(pC.x * 0.78 + tilt * 1.6) * 0.8));

  float field = 1.0 - clamp((w1 * 0.42 + w2 * 0.36 + w3 * 0.22), 0.0, 1.0);
  return pow(field, 5.5);
}

void main() {
  // Obsidian laboratory base (#050507)
  vec3 obsidianBase = vec3(0.0196, 0.0196, 0.0275);

  // 1. Regularized point-mass Einstein-ring gravitational deflection
  vec2 d = (vUv - uLensPos) * vec2(uAspect, 1.0);
  float r = length(d);

  float rE = max(uEinsteinRadius * uMassBoost, 0.005);
  float env = smoothstep(rE * 3.6, rE * 0.35, r);
  float bend = (rE * rE) / (r + 0.018);
  vec2 dir = d / max(r, 1e-4);

  // Subtle relativistic velocity shear aligned to pointer motion
  float velMag = min(length(uLensVel), 1.5);
  vec2 shear = uLensVel * 0.004 * env * (1.0 - uReducedMotion);
  vec2 baseOffset = (dir * bend * env * uDeflectionGain + shear) / vec2(uAspect, 1.0);

  // 2. Strict grazing-rim chromatic dispersion (narrow Gaussian at r = rE)
  float ringMask = exp(-pow((r - rE) / max(rE * 0.26, 0.001), 2.0));
  float dispWeight = ringMask * uDispersion;

  vec2 uvR = clamp(vUv - baseOffset * (1.0 - 0.045 * dispWeight), vec2(0.001), vec2(0.999));
  vec2 uvG = clamp(vUv - baseOffset, vec2(0.001), vec2(0.999));
  vec2 uvB = clamp(vUv - baseOffset * (1.0 + 0.052 * dispWeight), vec2(0.001), vec2(0.999));

  vec4 sampleR = texture(uStageTex, uvR);
  vec4 sampleG = texture(uStageTex, uvG);
  vec4 sampleB = texture(uStageTex, uvB);

  vec3 stageColor = vec3(sampleR.r, sampleG.g, sampleB.b);
  float stageAlpha = max(sampleG.a, max(sampleR.a, sampleB.a) * 0.9);

  // 3. Scroll-tilted procedural refraction caustics (clamped <= 0.13 peak brightness)
  float motionTime = uTime * (1.0 - uReducedMotion);
  vec2 causticCoord = (vUv - vec2(0.5)) * vec2(uAspect, 1.0) * 1.45;
  causticCoord -= baseOffset * 1.15;

  float cWarm = causticPattern(causticCoord + vec2(0.012, 0.006) * uLightTilt, uLightTilt, motionTime);
  float cMid = causticPattern(causticCoord, uLightTilt, motionTime);
  float cCool = causticPattern(causticCoord - vec2(0.014, 0.008) * uLightTilt, uLightTilt, motionTime);

  vec3 causticTint = vec3(
    cWarm * 0.94 + cMid * 0.08,
    cMid * 0.97 + cCool * 0.05,
    cCool * 1.08 + cMid * 0.06
  );

  // Spatial falloff keeps peripheral edges calm and typographic contrast crisp
  float vignette = smoothstep(1.38, 0.22, length((vUv - vec2(0.5, 0.45)) * vec2(uAspect * 0.72, 1.0)));
  vec3 causticContrib = min(causticTint * 0.115 * uCausticIntensity * (0.45 + 0.55 * vignette), vec3(0.13));

  // Subtle architectural radial gradient depth in the obsidian chamber
  vec3 bg = obsidianBase + causticContrib;

  // Composite offscreen mirrored specimen stage over obsidian + caustics
  vec3 color = mix(bg, stageColor + causticContrib * 0.35, clamp(stageAlpha, 0.0, 1.0));

  // 4. Thin-film interference (Airy OPD) & anti-reflective Schlick Fresnel rim
  float cosTheta = clamp(sqrt(max(0.0, 1.0 - pow(r / max(rE * 1.45, 0.001), 2.0))), 0.0, 1.0);
  float opd = 2.0 * uFilmIOR * uFilmThicknessNm * cosTheta;

  vec3 interference = 0.5 + 0.5 * cos(
    6.2831853 * (opd / vec3(650.0, 510.0, 475.0)) + vec3(0.0, 2.094, 4.188)
  );

  float fresnel = 0.04 + 0.96 * pow(1.0 - cosTheta, 5.0);

  // Hairline precision optical ring edge + subtle internal caustic glint
  float rimSharp = exp(-pow((r - rE) / max(rE * 0.075, 0.0008), 2.0));
  float outerHalo = ringMask * fresnel;
  float velocityBoost = 1.0 + velMag * 0.12;

  vec3 thinFilmRim = interference * clamp((outerHalo * 0.34 + rimSharp * 0.14) * velocityBoost, 0.0, 0.38);
  vec3 silverEdge = vec3(0.84, 0.88, 0.95) * rimSharp * 0.11;

  // Subtle internal lens glass shadow ring for physical borosilicate depth
  float apertureBody = smoothstep(rE * 1.04, rE * 0.92, r);
  float innerRimShadow = smoothstep(rE * 0.72, rE * 0.99, r) * apertureBody;
  color = mix(color, color * 0.92, innerRimShadow * 0.45);

  color += thinFilmRim + silverEdge;

  // Micro-crosshair fiduciary tick at exact gravitational focal point (subtle optical instrument mark)
  vec2 absD = abs(d);
  float crossH = smoothstep(0.0014, 0.0004, absD.y) * smoothstep(0.011, 0.003, absD.x) * smoothstep(0.002, 0.004, absD.x);
  float crossV = smoothstep(0.0014, 0.0004, absD.x) * smoothstep(0.011, 0.003, absD.y) * smoothstep(0.002, 0.004, absD.y);
  color += vec3(0.75, 0.82, 0.92) * max(crossH, crossV) * 0.24 * (1.0 - uReducedMotion * 0.5);

  fragColor = vec4(color, 1.0);
}
