export const v1 = `
varying vec3 vPosition;

void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`.trim();

export const f1 = `
varying vec3 vPosition;

void main() {
    gl_FragColor = vec4(vPosition * 0.5 + 0.5, 1.0);
}
`.trim();

export const v2 = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`.trim();

export const f2 = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 light = normalize(vec3(1.0, 1.0, 1.0));
  float dProd = max(0.0, dot(vNormal, light));
  
  vec3 color = vec3(0.5 + 0.5 * sin(uTime + vPosition.x * 2.0),
                    0.5 + 0.5 * sin(uTime + vPosition.y * 2.0 + 2.0),
                    0.5 + 0.5 * sin(uTime + vPosition.z * 2.0 + 4.0));
  
  gl_FragColor = vec4(color * dProd, 1.0);
}`.trim();