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
  uniform vec3 uSkyBounce;

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

  float hash(vec2 cell) {
    return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
  }

  float density(vec3 point) {
    // Overlapping ellipsoids continue beyond both screen edges. Rows below
    // the crowns give the bank depth even once it fills the viewport.
    vec2 cell = floor(point.xy / vec2(1.65, 1.35));
    float body = -10.0;
    for (int row = -1; row <= 1; row++) {
      for (int column = -1; column <= 1; column++) {
        vec2 id = cell + vec2(float(column), float(row));
        id.y = min(id.y, 0.0);
        float seed = hash(id);
        vec3 center = vec3(
          (id.x + 0.5) * 1.65 + sin(seed * 31.0) * 0.26,
          id.y * 1.35 + seed * 0.55,
          sin(seed * 17.0) * 0.7
        );
        vec3 radius = vec3(1.12 + seed * 0.3, 0.95 + seed * 0.38, 1.2);
        body = max(body, (1.0 - length((point - center) / radius)) * 0.95);
      }
    }
    float billows = turbulence(point * 2.1) - 0.5;
    float detail = noise(point * 8.5) - 0.5;
    return smoothstep(-0.06, 0.14, body + billows * 0.48 + detail * 0.12);
  }

  void main() {
    float entrance = smoothstep(0.0, 0.025, uProgress);
    float dissolve = clamp((uProgress - 0.5) / 0.38, 0.0, 1.0);
    if (entrance <= 0.0 || dissolve >= 1.0) {
      gl_FragColor = vec4(0.0);
      return;
    }
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution) / uResolution.y;
    // Translate the entire cloud field, including its lighting, rather than
    // raising an unrelated opaque screen bank in front of stationary volumes.
    float rise = smoothstep(0.03, 0.46, uProgress);
    float drift = uProgress * 0.65;
    vec2 cloudUV = uv * 3.2 + vec2(drift, mix(3.0, -3.65, rise * rise));
    cloudUV.y -= smoothstep(0.5, 0.9, uProgress) * 0.8;
    vec3 origin = vec3(cloudUV, -3.4);
    vec3 sun = normalize(vec3(-0.6, 0.8, -0.7));
    vec3 accumulated = vec3(0.0);
    float transmittance = 1.0;
    // Warm highlights retain the palette; neutral sky bounce prevents dense
    // interiors from multiplying down into the old deep-gold/brown veil.
    vec3 highlight = mix(uGold, vec3(1.0), 0.4);
    vec3 shadow = mix(uDeepGold, uSkyBounce, 0.72);
    float erosion = turbulence(vec3(cloudUV * 1.4, 4.0));
    float localFade = 1.0 - smoothstep(max(0.02, erosion * 0.45 - 0.1), erosion * 0.45 + 0.25, dissolve);

    for (int i = 0; i < 40; i++) {
      vec3 point = origin + vec3(0.0, 0.0, float(i) * 0.16);
      float cloud = density(point);
      if (cloud > 0.01) {
        float nearSunDensity = density(point + sun * 0.24);
        float sunDensity = nearSunDensity * 0.6
          + density(point + sun * 0.65) * 0.45
          + density(point + sun * 1.3) * 0.3;
        float sunlight = exp(-sunDensity * 1.8);
        float rim = clamp((cloud - nearSunDensity) * 1.8, 0.0, 1.0);
        vec3 lit = mix(shadow, highlight, sunlight) + highlight * rim * 0.18;
        float alpha = 1.0 - exp(-cloud * 0.16 * 5.5);
        accumulated += transmittance * alpha * lit;
        transmittance *= 1.0 - alpha;
        if (transmittance < 0.004) break;
      }
    }
    // A screen-space floor closes tiny gaps behind the SAME lit volume. It
    // never rises above the ellipsoid crowns and has no separate fog color.
    float bankDepth = 0.05 - cloudUV.y;
    float bankAlpha = smoothstep(0.0, 0.3, bankDepth);
    float volumeAlpha = 1.0 - transmittance;
    vec3 bankColor = accumulated / max(volumeAlpha, 0.001);
    float outputAlpha = volumeAlpha + bankAlpha * (1.0 - volumeAlpha);
    gl_FragColor = vec4(bankColor * outputAlpha, outputAlpha) * entrance * localFade;
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
  gl.uniform3fv(
    gl.getUniformLocation(program, "uSkyBounce"),
    color(style, "--cloud-sky-bounce"),
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
