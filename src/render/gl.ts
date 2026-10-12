import { FLOATS_PER_QUAD, QUAD_LAYOUT, type QuadBuffer } from "./quads";

// Largest outline/glow reach the shader searches, in sprite pixels. Glow
// radii above this are cut off.
const MAX_REACH = 4;

const VERTEX_SHADER = `#version 300 es
in vec4 a_corners01;
in vec4 a_corners23;
in vec4 a_region;
in vec2 a_flipMargin;
in vec4 a_outline;
in vec2 a_glow;

uniform vec2 u_screen;

out vec2 v_texel;
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

  vec2 clip = position / u_screen * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

const int MAX_REACH = ${MAX_REACH};
const float OUTLINE = 0.2;
const float TAU = 6.2831853;

uniform sampler2D u_atlas;
uniform float u_time;

in vec2 v_texel;
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

void main() {
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
      color = texel;
      return;
    }
  }
  if (v_outline.a == 0.0) discard;

  // Distance from this point to the nearest opaque texel's square.
  float nearest = 1e9;
  for (int dy = -MAX_REACH; dy <= MAX_REACH; dy++) {
    for (int dx = -MAX_REACH; dx <= MAX_REACH; dx++) {
      ivec2 t = here + ivec2(dx, dy);
      if (!inRegion(t) || fetch(t).a <= 0.5) continue;
      vec2 lo = vec2(t);
      vec2 gap = max(vec2(0.0), max(lo - v_texel, v_texel - (lo + 1.0)));
      nearest = min(nearest, length(gap));
    }
  }

  if (nearest <= OUTLINE) {
    color = v_outline;
    return;
  }

  float radius = v_glow.x;
  if (radius > 0.0 && nearest <= radius) {
    float falloff = 1.0 - (nearest - OUTLINE) / max(radius - OUTLINE, 1e-4);
    float pulse = v_glow.y > 0.0 ? 0.75 + 0.25 * sin(TAU * v_glow.y * u_time) : 1.0;
    color = vec4(v_outline.rgb, v_outline.a * falloff * pulse);
    return;
  }
  discard;
}
`;

export type Renderer = {
  // Draws every quad in one instanced call. Width/height are the canvas's
  // pixel size; time is seconds, for glow pulsing.
  draw(quads: QuadBuffer, width: number, height: number, time: number): void;
};

export function createRenderer(
  gl: WebGL2RenderingContext,
  atlas: TexImageSource,
): Renderer {
  const program = link(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  const uScreen = gl.getUniformLocation(program, "u_screen");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uAtlas = gl.getUniformLocation(program, "u_atlas");

  // Uploaded once; every frame samples this one texture.
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const instances = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instances);

  const stride = FLOATS_PER_QUAD * 4;
  const attribute = (name: string, size: number, offset: number) => {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset * 4);
    gl.vertexAttribDivisor(location, 1);
  };
  attribute("a_corners01", 4, QUAD_LAYOUT.corners);
  attribute("a_corners23", 4, QUAD_LAYOUT.corners + 4);
  attribute("a_region", 4, QUAD_LAYOUT.region);
  attribute("a_flipMargin", 2, QUAD_LAYOUT.flipX);
  attribute("a_outline", 4, QUAD_LAYOUT.outline);
  attribute("a_glow", 2, QUAD_LAYOUT.glow);
  gl.bindVertexArray(null);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return {
    draw(quads, width, height, time) {
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (quads.count === 0) return;

      gl.useProgram(program);
      gl.uniform2f(uScreen, width, height);
      gl.uniform1f(uTime, time);
      gl.uniform1i(uAtlas, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, instances);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        quads.data.subarray(0, quads.count * FLOATS_PER_QUAD),
        gl.DYNAMIC_DRAW,
      );
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, quads.count);
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
