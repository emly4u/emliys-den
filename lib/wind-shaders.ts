// GLSL for the live wind effect, following create_flowy_gif.py:
//  - hair: crown and roots anchored, motion grows toward the tips and the
//    silhouette edge, while the interior of the hair mass stays calmer
//  - cloth: sleeves and skirt get the gusts, weighted by distance from the body
//    axis, how far the fabric hangs, and the hem
//  - face, body and hands never move
// The hand-drawn polygons of the script are replaced by a per-pixel segmentation
// mask (R hair, G clothes, B skin).
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
uniform sampler2D u_mask;
uniform float u_aspect; /* image height / width */
uniform float u_axis;   /* body axis, 0..1 across the image */
varying vec2 v_uv;

const float AMP_MAX = 15.;

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
  float y = v_uv.y;
  vec3 centre = texture2D(u_mask, v_uv).rgb;

  /* feathered, slightly eroded masks: region borders stay still */
  vec3 soft = (centre + ring(0.004) + ring(0.008) + ring(0.012)) / 4.;
  float hair_mask  = smoothstep(0.6, 0.98, soft.r);
  float cloth_mask = smoothstep(0.6, 0.98, soft.g);

  /* how far we are from any skin (face, neck, hands, body): 0 touching, 1 free */
  float near_skin = (ring(0.03) + ring(0.06) + ring(0.10) + ring(0.15)).b / 4.;
  float reach     = 1. - smoothstep(0., 0.30, near_skin);

  /* ---- hair: anchored roots, free tips, livelier silhouette ---- */
  float tip        = max(reach, 0.08);
  vec3  depth      = (ring(0.005) + ring(0.010) + ring(0.015) + ring(0.020) + ring(0.025)) / 5.;
  float hair_edge  = 1. - smoothstep(0.5, 1., depth.r);
  float hair_a     = hair_mask * pow(tip, 1.2) * (0.35 + 0.65*hair_edge)
                     * (10.5 + 1.5*sin(y*34.25));

  /* ---- cloth: sleeves and skirt, weighted outward and downward ---- */
  float outer   = clamp((abs(v_uv.x - u_axis) - 0.109) / 0.205, 0., 1.);
  float hanging = clamp((y - 0.299) / 0.540, 0., 1.);
  float hem     = clamp((y - 0.569) / 0.431, 0., 1.);
  float sleeve_a = clamp(smoothstep(0.28, 0.50, y) * (1. - smoothstep(0.70, 0.85, y)) * outer, 0., 1.)
                   * (1.2 + 11.*hanging) * (0.40 + 0.60*outer);
  float skirt_a  = smoothstep(0.52, 0.68, y) * (1. + 14.*hem) * (0.20 + 0.80*outer);
  float cloth_a  = cloth_mask * reach * max(sleeve_a, skirt_a);

  gl_FragColor = vec4(clamp(hair_a / AMP_MAX, 0., 1.), clamp(cloth_a / AMP_MAX, 0., 1.), 0., 1.);
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
uniform float u_cx;     /* body axis in pixels */
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
