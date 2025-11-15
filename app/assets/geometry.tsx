import {
    IcosahedronGeometry,
    TorusKnotGeometry,
    BoxGeometry,
    SphereGeometry,
    DodecahedronGeometry,
    PlaneGeometry
} from "three"

export const icosahedron = new IcosahedronGeometry(1);
export const sphere = new SphereGeometry(1);
export const knot = new TorusKnotGeometry(1);
export const cube = new BoxGeometry(2, 2, 2);
export const dodecahedron = new DodecahedronGeometry(1);
export const plane = new PlaneGeometry(2, 2);