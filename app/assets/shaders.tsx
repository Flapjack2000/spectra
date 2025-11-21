
// Plain, just white lighting
export const v0 = `
// Welcome to Spectra! Have fun!
uniform float uTime;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vNormal = normal;
  vPosition = position;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`.trim();

export const f0 = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // Simple white with basic lighting
  vec3 lightDir = normalize(vec3(0.0, 0.0, 1.0));
  float brightness = dot(normalize(vNormal), lightDir) * 0.5 + 0.5;
  
  vec3 color = vec3(1.0, 1.0, 1.0) * brightness;
  gl_FragColor = vec4(color, 1.0);
}`.trim();

// Twist
export const v1 = `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vNormal = normal;
  vPosition = position;
  
  // Oscillating twist along Z axis
  float twistAmount = sin(uTime) * 2.0;
  float angle = position.z * twistAmount;
  float c = cos(angle) / 1.5;
  float s = sin(angle);
  
  vec3 newPosition = position;
  newPosition.x = position.x * c - position.y * s;
  newPosition.y = position.x * s + position.y * c;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}`.trim();

export const f1 = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 baseColor = vec3(0.2, 0.6, 0.9);
  
  // Simple directional lighting
  vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
  float brightness = dot(normalize(vNormal), lightDir) * 0.5 + 0.5;
  
  vec3 color = baseColor * brightness;
  gl_FragColor = vec4(color, 1.0);
}`.trim()


// Pulsing
export const v2 = `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vNormal = normal;
  vPosition = position;
  
  // Pulsing effect
  float pulse = sin(uTime * 2.0) * 0.2 + 1.0;
  vec3 newPosition = position * pulse;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}`.trim();

export const f2 = `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // Pulse value from 0 to 1
  float pulse = sin(uTime * 2.0) * 0.5 + 0.5;
  
  vec3 color1 = vec3(0.5, 0.3, 0.8);
  vec3 color2 = vec3(0.2, 0.8, 0.9);
  
  // Smoothly transition between the two colors
  vec3 color = mix(color1, color2, pulse);
  
  // Add some brightness variation based on normal
  float brightness = dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)) * 0.3 + 0.7;
  color *= brightness;
  
  gl_FragColor = vec4(color, 1.0);
}`.trim();


// Wave
export const v3 = `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vNormal = normal;
  vPosition = position;
  
  // Create wave displacement
  vec3 newPosition = position;
  float wave = sin(position.x * 2.0 + uTime * log(uTime)) * 0.3;
  newPosition.z += wave;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}`.trim();

export const f3 = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // Simple colored output based on normal
  vec3 color = normalize(vNormal) * 0.5 + 0.5;
  gl_FragColor = vec4(color, 1.0);
}`.trim()


// Jitter
export const v4 = `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vPattern;

void main() {
  vNormal = normal;
  vPosition = position;
  
  // Jittery motion based on normal direction
  vPattern = sin(position.x * 5.0 + uTime * 2.0) * 
                sin(position.y * 5.0 + uTime * 2.0) * 
                sin(position.z * 5.0 + uTime * 2.0);
  vec3 newPosition = position + normal * vPattern * 0.3;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}`.trim();

export const f4 = `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vPattern;

void main() {
  // Base colors
  vec3 color1 = vec3(0.9, 0.2, 0.4);
  vec3 color2 = vec3(0.4, 0.1, 0.6);
  
  // Color variation based on spike pattern
  float mixFactor = vPattern * 0.5 + 0.5;
  
  vec3 color = mix(color1, color2, mixFactor);
  
  // Add lighting for depth
  vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
  float brightness = dot(normalize(vNormal), lightDir) * 0.4 + 0.6;
  
  // Add rim lighting effect
  vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
  float rim = 1.0 - max(dot(viewDir, normalize(vNormal)), 0.0);
  rim = pow(rim, 3.0);
  
  color = color * brightness + vec3(1.0, 0.5, 0.7) * rim * 0.3;
  
  gl_FragColor = vec4(color, 1.0);
}`.trim()