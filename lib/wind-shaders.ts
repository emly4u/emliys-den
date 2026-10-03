// GLSL for the live wind effect (derived from live_time_flowy.py).
// UV y=0 is the image top, so no UNPACK_FLIP_Y is needed for the portrait texture.

export const VERTEX_SHADER = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main(){
  v_uv = vec2(a_pos.x*0.5+0.5, 0.5-a_pos.y*0.5);
  gl_Position = vec4(a_pos,0.,1.);
}`

// Pass 1 (runs once into a framebuffer): hair amplitude in R, cloth amplitude in G.
// Driven by the segmentation mask (R hair, G clothes, B skin) so only hair and
// clothes can move:
//   - the mask is eroded so region edges stay put (no tearing against skin or background)
//   - amplitude fades to zero near any skin, so roots and seams stay anchored
//     and only free-hanging ends sway
export const PRECOMPUTE_SHADER = `
precision highp float;
uniform sampler2D u_mask;
uniform float u_aspect; /* image height / width */
varying vec2 v_uv;

const float HAIR_AMP  = 10.5;
const float CLOTH_AMP = 12.;
const float AMP_MAX   = 15.;

/* mean of the mask over 8 directions at a given radius (in image-height units) */
vec3 ring(float radius){
  vec3 sum = vec3(0.);
  for(int i = 0; i < 8; i++){
    float a = float(i) * 0.785398;
    vec2 offset = vec2(cos(a) * u_aspect, sin(a)) * radius;
    sum += texture2D(u_mask, v_uv + offset).rgb;
  }
  return sum / 8.;
}

void main(){
  vec3 centre = texture2D(u_mask, v_uv).rgb;

  /* erosion: only well-inside pixels of a region may move */
  vec3 inner = (centre + ring(0.004) + ring(0.008) + ring(0.012)) / 4.;
  float hair_core  = smoothstep(0.6, 0.98, inner.r);
  float cloth_core = smoothstep(0.6, 0.98, inner.g);

  /* proximity to skin within ~10 % of the image height */
  float near_skin = (ring(0.02) + ring(0.04) + ring(0.07) + ring(0.10)).b / 4.;
  float anchor    = 1. - smoothstep(0., 0.35, near_skin);

  /* cloth sways more toward the bottom of the frame (hems) */
  float hang = 0.35 + 0.65 * smoothstep(0.30, 0.90, v_uv.y);

  float hair_a  = hair_core  * anchor * HAIR_AMP;
  float cloth_a = cloth_core * anchor * hang * CLOTH_AMP;

  gl_FragColor = vec4(hair_a / AMP_MAX, cloth_a / AMP_MAX, 0., 1.);
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
uniform float u_scale;  /* image width / reference width: keeps motion resolution independent */
uniform float u_freq_yc;
uniform float u_freq_xc;
varying vec2 v_uv;

const float PI2     = 6.28318530718;
const float AMP_MAX = 15.;

void main(){
  float xx = v_uv.x * u_w;
  float yy = v_uv.y * u_h;

  /* framebuffer rows are stored bottom-up relative to v_uv, so flip y when sampling */
  vec2  amp     = texture2D(u_motion, vec2(v_uv.x, 1. - v_uv.y)).rg * AMP_MAX * u_scale;
  float hair_a  = amp.r;
  float cloth_a = amp.g;

  float hp = yy*0.022 + xx*0.006;
  float cp = yy*u_freq_yc + abs(xx - 0.5*u_w)*u_freq_xc;

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
