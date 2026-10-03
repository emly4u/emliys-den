// GLSL for the live wind effect (ported from live_time_flowy.py).
// UV y=0 is the image top, so no UNPACK_FLIP_Y is needed for the portrait texture.

export const VERTEX_SHADER = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main(){
  v_uv = vec2(a_pos.x*0.5+0.5, 0.5-a_pos.y*0.5);
  gl_Position = vec4(a_pos,0.,1.);
}`

// Pass 1 (runs once into a framebuffer): hair amplitude in R, cloth amplitude in G.
export const PRECOMPUTE_SHADER = `
precision highp float;
uniform sampler2D u_portrait;
uniform float u_w;
uniform float u_h;
uniform float u_cx;
varying vec2 v_uv;

void main(){
  float yy = v_uv.y * u_h;
  vec4  c  = texture2D(u_portrait, v_uv);

  float skin    = clamp((c.r - c.b - 0.025)*12., 0., 1.);
  float no_skin = 1. - skin*0.9;

  float above   = 1. - smoothstep(0.15, 0.38, v_uv.y);
  float tip_fac = clamp((yy - u_h*0.04) / (u_h*0.22), 0.08, 1.);
  float hair_a  = above * (1. - skin) * tip_fac * 10.5;

  float cx_n    = u_cx > 0. ? u_cx / u_w : 0.5;
  float outer   = clamp((abs(v_uv.x - cx_n) - 0.11) / 0.22, 0., 1.);
  float hanging = clamp((v_uv.y - 0.30) / 0.60, 0., 1.);
  float hem     = clamp((v_uv.y - 0.57) / 0.43, 0., 1.);

  float sleeve_a = clamp(smoothstep(0.28,0.50,v_uv.y)
                         * (1.-smoothstep(0.70,0.85,v_uv.y))
                         * outer, 0., 1.)
                   * (1.2 + 11.*hanging) * (0.40 + 0.60*outer) * no_skin;
  float skirt_a  = smoothstep(0.52, 0.68, v_uv.y)
                   * (1.0 + 14.*hem) * (0.20 + 0.80*outer) * no_skin;
  float cloth_a  = max(sleeve_a, skirt_a);

  const float AMP_MAX = 15.;
  gl_FragColor = vec4(clamp(hair_a/AMP_MAX,0.,1.),
                      clamp(cloth_a/AMP_MAX,0.,1.),
                      0., 1.);
}`

// Pass 2 (every frame): displace the portrait by the animated wind field.
export const ANIMATE_SHADER = `
precision highp float;
uniform sampler2D u_portrait;
uniform sampler2D u_motion;
uniform float u_time;
uniform float u_wind;
uniform float u_duration;
uniform float u_w;
uniform float u_h;
uniform float u_cx;
uniform float u_freq_yc;
uniform float u_freq_xc;
varying vec2 v_uv;

const float PI2     = 6.28318530718;
const float AMP_MAX = 15.;

void main(){
  float xx = v_uv.x * u_w;
  float yy = v_uv.y * u_h;

  // Framebuffer rows are stored bottom-up relative to v_uv, so flip y when sampling.
  vec2  amp     = texture2D(u_motion, vec2(v_uv.x, 1. - v_uv.y)).rg * AMP_MAX;
  float hair_a  = amp.r;
  float cloth_a = amp.g;

  float hp = yy*0.022 + xx*0.006;
  float cp = yy*u_freq_yc + abs(xx - u_cx)*u_freq_xc;

  float phase = PI2 * mod(u_time, u_duration) / u_duration;
  float gust  = 0.65 + 0.35*sin(phase+0.45);
  float hw    = 3.*phase - hp;
  float cw    = 2.*phase - cp;

  float dx  = hair_a  * gust*(0.70*sin(hw) + 0.09*sin(5.*phase - hp*1.4));
  float dy  = hair_a  * 0.20*cos(hw+0.8);
        dx += cloth_a * gust*(0.70*sin(cw) + 0.11*sin(4.*phase - cp*1.5));
        dy += cloth_a * 0.22*cos(cw+0.9);
  dx *= u_wind;
  dy *= u_wind;

  gl_FragColor = texture2D(u_portrait, v_uv - vec2(dx/u_w, dy/u_h));
}`
