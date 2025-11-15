export const vertex1 = `
varying vec3 vPosition;

void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const fragment1 = `
varying vec3 vPosition;

void main() {
    gl_FragColor = vec4(vPosition * 0.5 + 0.5, 1.0);
}
`