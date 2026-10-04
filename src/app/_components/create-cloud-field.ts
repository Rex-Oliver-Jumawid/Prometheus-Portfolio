export type CloudField = {
  draw: (progress: number) => void;
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
    // Overlapping rounded volumes form a sea of cumulus. Small-scale noise
    // erodes the silhouettes; it never acts as a flat surface normal map.
    vec3 q = vec3(point.xy, mod(point.z, 8.0) - 4.0);
    // Build a wide lower cloud shelf first so the transition enters across the
    // complete viewport instead of forming one obvious mound in the center.
    float shelf = length(
      (q - vec3(0.0, -3.25, -0.4)) / vec3(9.4, 1.15, 5.2)
    );
    float farLeft = length(
      (q - vec3(-6.1, -2.35, 0.5)) / vec3(5.0, 1.55, 4.5)
    );
    float farRight = length(
      (q - vec3(6.2, -2.25, -0.2)) / vec3(5.1, 1.5, 4.7)
    );
    float left = length((q - vec3(-3.2, -2.3, 0.0)) / vec3(4.4, 1.55, 4.5));
    float right = length((q - vec3(3.6, -2.2, 0.8)) / vec3(4.7, 1.55, 4.4));
    float middle = length((q - vec3(0.0, -3.4, -0.8)) / vec3(5.0, 1.2, 4.8));
    float crownLeft = length((q - vec3(-3.2, -1.1, -0.5)) / vec3(2.4, 2.5, 3.0));
    float crownInner = length((q - vec3(-1.7, -0.6, 1.1)) / vec3(1.9, 1.7, 2.2));
    float crownRight = length((q - vec3(2.1, -0.4, -0.5)) / vec3(2.2, 2.0, 2.7));
    float crownOuter = length((q - vec3(4.0, -1.1, 1.1)) / vec3(2.6, 2.6, 2.9));
    float crownMiddle = length((q - vec3(0.25, -0.9, -1.1)) / vec3(2.1, 2.0, 2.6));
    float crowns = min(min(crownLeft, crownInner), min(crownRight, min(crownMiddle, crownOuter)));
    float lowerBank = min(shelf, min(farLeft, min(farRight, min(left, min(right, middle)))));
    float body = 1.0 - min(lowerBank, crowns);
    float billows = turbulence(point * 0.85) - 0.5;
    float cloud = smoothstep(-0.02, 0.10, body + billows * 0.85) * 1.4;
    // Original crossing density from 0609a4a.
    float mist = smoothstep(0.16, 0.22, uProgress)
      * (1.0 - smoothstep(0.3, 0.55, uProgress)) * 0.22;
    return cloud + mist;
  }

  void main() {
    // Make the bank clearly visible as soon as the transition begins.
    float visibility = smoothstep(0.0, 0.035, uProgress)
      * (1.0 - smoothstep(0.5, 0.75, uProgress));
    if (visibility <= 0.0) {
      gl_FragColor = vec4(0.0);
      return;
    }
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution) / uResolution.y;

    // At first, keep the clouds low and subtle like a shallow horizon-wide
    // bank. As scrolling continues, release the mask so the viewer dives into
    // the full volume.
    float lowBand = 1.0 - smoothstep(-0.82, 0.38, uv.y);
    float expansion = smoothstep(0.07, 0.26, uProgress);
    float coverage = mix(lowBand, 1.0, expansion);
    float entryStrength = mix(
      0.82,
      1.0,
      smoothstep(0.02, 0.16, uProgress)
    );

    // Original fly-through from 0609a4a; scrolling controls its pace.
    // Stop forward and sideways travel when the gallery reveal begins.
    float travel = min(uProgress, 0.45);
    float entry = smoothstep(0.0, 0.25, travel);
    // Keep vertical travel downward; rising here made the exit reverse direction.
    vec3 origin = vec3(sin(travel * 2.0) * 0.28, 4.2 - entry * 5.8, travel * 9.0);
    // Clear beneath the bank in the same direction as the entry.
    origin.y = mix(origin.y, -5.3, smoothstep(0.45, 0.62, uProgress));
    vec3 ray = normalize(vec3(uv * 0.68, 1.55));
    vec3 sun = normalize(vec3(-0.65, 0.75, -0.25));
    float rayDistance = 0.08;
    vec3 accumulated = vec3(0.0);
    float transmittance = 1.0;
    float mood = smoothstep(0.2, 1.0, uProgress);

    // Integrate scattering through the volume, front to back. Dense clouds
    // terminate early, keeping the full-screen portion inexpensive.
    for (int i = 0; i < 48; i++) {
      float stepLength = 0.18 + float(i) * 0.004;
      vec3 point = origin + ray * rayDistance;
      rayDistance += stepLength;
      float cloud = density(point);
      if (cloud > 0.01) {
        float nearSunDensity = density(point + sun * 0.4);
        float sunDensity = nearSunDensity
          + density(point + sun * 1.3) * 0.65;
        float sunlight = exp(-sunDensity * 1.6);
        float rim = clamp(0.5 + (cloud - nearSunDensity) * 0.8, 0.0, 1.0);
        vec3 gold = mix(uGold, uDeepGold, mood);
        vec3 color = mix(gold * 0.32, gold * (1.0 + rim * 0.1), sunlight);
        color *= mix(0.72, 1.0, exp(-cloud * 0.55));
        float opacity = 1.0 - exp(-cloud * stepLength * 1.65);
        accumulated += transmittance * opacity * color;
        transmittance *= 1.0 - opacity;
        if (transmittance < 0.008) break;
      }
    }
    float finalVisibility = visibility * coverage * entryStrength;
    gl_FragColor = vec4(
      accumulated * finalVisibility,
      (1.0 - transmittance) * finalVisibility
    );
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

  return {
    resize(width, height) {
      // Volumetric softness allows a capped framebuffer, including on Retina.
      const scale = Math.min(
        0.65,
        960 / Math.max(1, width),
        640 / Math.max(1, height),
      );
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
    },
    draw(value) {
      if (gl.isContextLost()) return;
      gl.uniform1f(progress, Math.max(0, Math.min(1, value)));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose,
  };
}
