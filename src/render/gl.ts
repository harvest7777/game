import type { FrameSections } from "./frame";
import { DECODE_DISTANCE } from "./distance";
import { FLOATS_PER_QUAD, QUAD_LAYOUT, type QuadBuffer } from "./quads";

const VERTEX_SHADER = `#version 300 es
in vec4 a_corners01;
in vec4 a_corners23;
in vec4 a_region;
in vec2 a_flipMargin;
in vec4 a_outline;
in vec2 a_glow;
in float a_depth;
in float a_ring;
in float a_fill;
in vec4 a_tint;

uniform vec2 u_screen;

out vec2 v_texel;
out vec2 v_uv;
flat out float v_ring;
flat out float v_fill;
flat out vec4 v_tint;
flat out vec4 v_region;
flat out vec2 v_flipMargin;
flat out vec4 v_outline;
flat out vec2 v_glow;

void main() {
  // Triangle strip order: top-left, top-right, bottom-left, bottom-right.
  vec2 position;
  vec2 uv;
  if (gl_VertexID == 0) { position = a_corners01.xy; uv = vec2(0.0, 0.0); }
  else if (gl_VertexID == 1) { position = a_corners01.zw; uv = vec2(1.0, 0.0); }
  else if (gl_VertexID == 2) { position = a_corners23.zw; uv = vec2(0.0, 1.0); }
  else { position = a_corners23.xy; uv = vec2(1.0, 1.0); }

  // Atlas texel coordinates, reaching \`margin\` texels past the region so
  // the outline and glow have room.
  float margin = a_flipMargin.y;
  v_texel = a_region.xy - margin + uv * (a_region.zw + 2.0 * margin);
  v_region = a_region;
  v_flipMargin = a_flipMargin;
  v_outline = a_outline;
  v_glow = a_glow;
  v_uv = uv;
  v_ring = a_ring;
  v_fill = a_fill;
  v_tint = a_tint;

  vec2 clip = position / u_screen * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, a_depth * 2.0 - 1.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

const float OUTLINE = 0.2;
const float TAU = 6.2831853;

uniform sampler2D u_atlas;
// One byte per atlas texel: how far it is from its sprite's art.
uniform sampler2D u_distances;
uniform float u_time;

in vec2 v_texel;
in vec2 v_uv;
flat in float v_ring;
flat in float v_fill;
flat in vec4 v_tint;
flat in vec4 v_region;
flat in vec2 v_flipMargin;
flat in vec4 v_outline;
flat in vec2 v_glow;

out vec4 color;

bool inRegion(ivec2 t) {
  ivec2 lo = ivec2(v_region.xy);
  ivec2 hi = lo + ivec2(v_region.zw);
  return t.x >= lo.x && t.y >= lo.y && t.x < hi.x && t.y < hi.y;
}

// The atlas texel to read for texel t of the (possibly mirrored) sprite.
vec4 fetch(ivec2 t) {
  if (v_flipMargin.x > 0.5) {
    int left = int(v_region.x);
    t.x = 2 * left + int(v_region.z) - 1 - t.x;
  }
  return texelFetch(u_atlas, t, 0);
}

// The baked distance byte (0-1) for texel t of the (possibly mirrored)
// sprite.
float fetchDistance(ivec2 t) {
  if (v_flipMargin.x > 0.5) {
    int left = int(v_region.x);
    t.x = 2 * left + int(v_region.z) - 1 - t.x;
  }
  return texelFetch(u_distances, t, 0).r;
}

// A thin anti-aliased circle at v_ring of the quad's half-size, for debug
// overlays like hitboxes.
void drawRing() {
  float d = length(v_uv * 2.0 - 1.0);
  float pixel = fwidth(d);
  float line = 1.0 - smoothstep(0.75 * pixel, 1.5 * pixel, abs(d - v_ring));
  if (line <= 0.0) discard;
  color = vec4(v_outline.rgb, v_outline.a * line);
}

void main() {
  // Solid quads (health bars) are just their color.
  if (v_fill > 0.5) {
    color = v_outline;
    return;
  }
  if (v_ring > 0.0) {
    drawRing();
    return;
  }

  ivec2 here = ivec2(floor(v_texel));
  float margin = v_flipMargin.y;

  // Without a margin (tiles, walls) clamp to the region so edges never show
  // a seam from landing just outside it.
  if (margin == 0.0) {
    ivec2 lo = ivec2(v_region.xy);
    here = clamp(here, lo, lo + ivec2(v_region.zw) - 1);
  }

  if (inRegion(here)) {
    vec4 texel = fetch(here);
    if (texel.a > 0.5) {
      color = texel * v_tint;
      return;
    }
  }
  if (v_outline.a == 0.0) discard;

  // Distance from this point to the art. Smoothly sampled from the baked
  // map (mirrored the same way as the art when flipped), which is close
  // enough for glows but rounds off pixel corners.
  vec2 p = v_texel;
  if (v_flipMargin.x > 0.5) p.x = 2.0 * v_region.x + v_region.z - p.x;
  float v = texture(u_distances, p / vec2(textureSize(u_distances, 0))).r;
  float nearest = max(0.0, ${DECODE_DISTANCE});

  // Within a texel of the art, where crisp outlines are drawn, measure
  // exactly instead: any opaque texel that close is one of the 3x3 around
  // this one. Skipped when even this texel's corners are further than that
  // (its center is at most 0.71 from them).
  v = fetchDistance(here);
  if (${DECODE_DISTANCE} <= 1.75) {
    float exact = 1e9;
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        ivec2 t = here + ivec2(dx, dy);
        if (!inRegion(t) || fetch(t).a <= 0.5) continue;
        vec2 lo = vec2(t);
        vec2 gap = max(vec2(0.0), max(lo - v_texel, v_texel - (lo + 1.0)));
        exact = min(exact, length(gap));
      }
    }
    if (exact <= 1.0) nearest = exact;
  }

  if (nearest <= OUTLINE) {
    color = vec4(v_outline.rgb, v_outline.a * v_tint.a);
    return;
  }

  float radius = v_glow.x;
  if (radius > 0.0 && nearest <= radius) {
    float falloff = 1.0 - (nearest - OUTLINE) / max(radius - OUTLINE, 1e-4);
    float pulse = v_glow.y > 0.0 ? 0.75 + 0.25 * sin(TAU * v_glow.y * u_time) : 1.0;
    color = vec4(v_outline.rgb, v_outline.a * falloff * pulse * v_tint.a);
    return;
  }
  discard;
}
`;

export type Renderer = {
  // Draws a frame from one upload in up to three instanced calls (see
  // buildFrame): terrain writes depth, the sprite section tests against it,
  // and the overlay and debug renders ignore it. Width/height are the canvas's pixel size; time
  // is seconds, for glow pulsing.
  draw(
    quads: QuadBuffer,
    sections: FrameSections,
    width: number,
    height: number,
    time: number,
  ): void;
};

export function createRenderer(
  gl: WebGL2RenderingContext,
  atlas: TexImageSource,
  distances: { data: Uint8Array; width: number; height: number },
): Renderer {
  const program = link(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  const uScreen = gl.getUniformLocation(program, "u_screen");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uAtlas = gl.getUniformLocation(program, "u_atlas");
  const uDistances = gl.getUniformLocation(program, "u_distances");

  // Uploaded once; every frame samples this one texture.
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Sampled smoothly, so distances between texel centers blend.
  const distanceTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, distanceTexture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.R8,
    distances.width,
    distances.height,
    0,
    gl.RED,
    gl.UNSIGNED_BYTE,
    distances.data,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const instances = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instances);

  const stride = FLOATS_PER_QUAD * 4;
  const attributes: [string, number, number][] = [
    ["a_corners01", 4, QUAD_LAYOUT.corners],
    ["a_corners23", 4, QUAD_LAYOUT.corners + 4],
    ["a_region", 4, QUAD_LAYOUT.region],
    ["a_flipMargin", 2, QUAD_LAYOUT.flipX],
    ["a_outline", 4, QUAD_LAYOUT.outline],
    ["a_glow", 2, QUAD_LAYOUT.glow],
    ["a_depth", 1, QUAD_LAYOUT.depth],
    ["a_ring", 1, QUAD_LAYOUT.ring],
    ["a_fill", 1, QUAD_LAYOUT.fill],
    ["a_tint", 4, QUAD_LAYOUT.tint],
  ];
  const locations = attributes.map(([name]) => {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribDivisor(location, 1);
    return location;
  });
  // Points every attribute at the instance `first` in the buffer, so one
  // upload can be drawn in several ranges.
  const startAt = (first: number) => {
    attributes.forEach(([, size, offset], i) => {
      gl.vertexAttribPointer(
        locations[i],
        size,
        gl.FLOAT,
        false,
        stride,
        first * stride + offset * 4,
      );
    });
  };
  gl.bindVertexArray(null);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  return {
    draw(quads, sections, width, height, time) {
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 1);
      gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (quads.count === 0) return;

      gl.useProgram(program);
      gl.uniform2f(uScreen, width, height);
      gl.uniform1f(uTime, time);
      gl.uniform1i(uAtlas, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uDistances, 1);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, distanceTexture);

      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, instances);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        quads.data.subarray(0, quads.count * FLOATS_PER_QUAD),
        gl.DYNAMIC_DRAW,
      );

      const { terrain, sprites, overlay, debug } = sections;

      // Ground and walls, back to front, recording how near each pixel is.
      gl.enable(gl.DEPTH_TEST);
      startAt(0);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, terrain);

      // Health bars then sprites in layer order, hidden only where a nearer
      // wall covers them. They don't write depth so they never hide each
      // other that way.
      if (sprites > 0) {
        gl.depthMask(false);
        startAt(terrain);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, sprites);
      }

      // Floating text and debug renders over everything, in one call since
      // they follow each other in the buffer.
      if (overlay + debug > 0) {
        gl.disable(gl.DEPTH_TEST);
        startAt(terrain + sprites);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, overlay + debug);
      }
      gl.bindVertexArray(null);
    },
  };
}

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`shader failed to compile: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function link(
  gl: WebGL2RenderingContext,
  vertex: string,
  fragment: string,
): WebGLProgram {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`shader failed to link: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}
