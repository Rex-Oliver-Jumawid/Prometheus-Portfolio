export type CloudField = {
  // Conservative opaque viewport coverage of the rising bank, before its exit fade.
  draw: (progress: number) => number;
  resize: (width: number, height: number) => void;
  dispose: () => void;
};

const vertexSource = `
  attribute vec2 aPosition;
  void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

const fragmentSource = `
  precision highp float;
  uniform sampler2D uNoise;
  uniform vec2 uResolution;
  uniform float uProgress;
  uniform float uLift;
  uniform vec3 uGold;
  uniform vec3 uDeepGold;

  float noise(vec3 point) {
    vec3 cell = floor(point);
    vec3 fraction = fract(point);
    fraction = fraction * fraction * (3.0 - 2.0 * fraction);
    vec2 uv = cell.xy + vec2(37.0, 17.0) * cell.z + fraction.xy;
    vec2 slices = texture2D(uNoise, (uv + 0.5) / 256.0).rg;
    return mix(slices.r, slices.g, fraction.z);
  }

  float turbulence(vec3 point) {
    return noise(point) * 0.57
      + noise(point * 2.03 + 7.1) * 0.28
      + noise(point * 4.11 + 13.7) * 0.15;
  }

  float density(vec3 point) {
    // A broad lower body with an irregular crown, rounded in depth. No tiled
    // spheres: their cell boundaries read as stones once the bank fills a view.
    float crown = -4.15 + sin(point.x * 0.95) * 0.24
      + noise(vec3(point.x * 0.8, 2.7, point.z * 0.6)) * 0.55;
    float height = max(0.0, point.y - crown);
    float macro = 1.0 - length(vec2(height / 1.15, point.z / 2.5));
    // Medium noise folds the entire surface into overlapping billows. Finer
    // octaves erode those folds, with substantially less amplitude at each scale.
    float meso = noise(point * 1.55) * 0.58
      + noise(point * 3.15 + 8.2) * 0.27;
    float detail = noise(point * 6.4 + 17.1) * 0.11
      + noise(point * 12.8 + 3.4) * 0.04;
    float shape = macro - (1.0 - meso - detail) * 0.95;
    return smoothstep(-0.04, 0.22, shape) * 1.65;
  }

  void main() {
    float visibility = smoothstep(0.0, 0.025, uProgress)
      * (1.0 - smoothstep(0.80, 1.0, uProgress));
    if (visibility <= 0.0) {
      gl_FragColor = vec4(0.0);
      return;
    }
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution) / uResolution.y;
    uv.y -= uLift;
    float drift = uProgress * 0.45;
    vec3 sun = normalize(vec3(-0.6, 0.85, -0.5));
    vec3 accumulated = vec3(0.0);
    float transmittance = 1.0;

    // A shallow orthographic volume preserves small billows across wide and
    // narrow screens. Light is integrated locally, including warm undersides.
    for (int i = 0; i < 40; i++) {
      vec3 point = vec3(uv * 4.5 + vec2(drift, 0.0), -3.2 + (float(i) + 0.5) * 0.16);
      float cloud = density(point);
      if (cloud > 0.005) {
        float nearSun = density(point + sun * 0.22);
        float shadow = nearSun * 0.55 + density(point + sun * 0.85) * 1.1;
        float sunlight = exp(-shadow * 1.65);
        float rim = clamp((cloud - nearSun) * 1.8, 0.0, 1.0);
        vec3 underside = mix(uDeepGold * 0.67, uGold * 0.65,
          turbulence(point * 1.8) * 0.35);
        vec3 color = mix(underside, uGold * 1.05, clamp(sunlight + rim * 0.32, 0.0, 1.0));
        float opacity = 1.0 - exp(-cloud * 0.16 * 3.6);
        accumulated += transmittance * opacity * color;
        transmittance *= 1.0 - opacity;
      }
    }
    // Only the bottom few percent get a soft continuity aid. Actual volume
    // supplies the bank, its irregular silhouette and the opaque handoff.
    float floorAlpha = (1.0 - smoothstep(-1.02, -0.89, uv.y)) * 0.32;
    float volumeAlpha = 1.0 - transmittance;
    float outputAlpha = volumeAlpha + floorAlpha * transmittance;
    vec3 outputColor = accumulated + uDeepGold * floorAlpha * transmittance;
    gl_FragColor = vec4(outputColor, outputAlpha) * visibility;
  }

`;

function noiseTexture() {
  const size = 256;
  const values = new Uint8Array(size * size);
  let seed = 8129;
  for (let i = 0; i < values.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    values[i] = seed >>> 24;
  }
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      pixels[index] = values[y * size + x];
      pixels[index + 1] = values[((y + 17) % size) * size + ((x + 37) % size)];
      pixels[index + 3] = 255;
    }
  }
  return pixels;
}

function color(style: CSSStyleDeclaration, token: string) {
  const hex = style.getPropertyValue(token).trim().slice(1);
  return new Float32Array(
    [0, 2, 4].map(
      (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
    ),
  );
}

export function createCloudField(
  canvas: HTMLCanvasElement,
): CloudField | undefined {
  // A small raw-WebGL boundary avoids loading the gallery's Three.js bundle.
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl || gl.isContextLost()) return;
  const vertex = gl.createShader(gl.VERTEX_SHADER);
  const fragment = gl.createShader(gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  const dispose = () => {
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    canvas.width = canvas.height = 1;
  };
  if (!vertex || !fragment || !program || !buffer || !texture) {
    dispose();
    return;
  }
  gl.shaderSource(vertex, vertexSource);
  gl.shaderSource(fragment, fragmentSource);
  gl.compileShader(vertex);
  gl.compileShader(fragment);
  if (
    !gl.getShaderParameter(vertex, gl.COMPILE_STATUS) ||
    !gl.getShaderParameter(fragment, gl.COMPILE_STATUS)
  ) {
    dispose();
    return;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, "aPosition");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    dispose();
    return;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    256,
    256,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    noiseTexture(),
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.uniform1i(gl.getUniformLocation(program, "uNoise"), 0);
  const style = getComputedStyle(document.documentElement);
  gl.uniform3fv(
    gl.getUniformLocation(program, "uGold"),
    color(style, "--cloud-gold"),
  );
  gl.uniform3fv(
    gl.getUniformLocation(program, "uDeepGold"),
    color(style, "--cloud-deep-gold"),
  );
  const resolution = gl.getUniformLocation(program, "uResolution");
  const progress = gl.getUniformLocation(program, "uProgress");
  const lift = gl.getUniformLocation(program, "uLift");
  const smooth = (from: number, to: number, value: number) => {
    const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
    return t * t * (3 - 2 * t);
  };

  return {
    resize(width, height) {
      // Volumetric softness allows a capped framebuffer, including on Retina.
      const scale = Math.min(
        0.75,
        1080 / Math.max(1, width),
        680 / Math.max(1, height),
      );
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
    },
    draw(value) {
      if (gl.isContextLost()) return 0;
      const position = Math.max(0, Math.min(1, value));
      const bankLift =
        smooth(0.03, 0.5, position) * 2.14 + smooth(0.52, 1, position) * 0.65;
      gl.uniform1f(progress, position);
      gl.uniform1f(lift, bankLift);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // Below y=-5.1 even the deepest eroded body is optically thick across X.
      // Keep the existing scene exchange gated until that volume covers the top.
      return Math.max(0, Math.min(1, (bankLift - 5.1 / 4.5 + 1) / 2));
    },
    dispose,
  };
}
