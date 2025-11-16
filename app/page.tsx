"use client"
import { useRef, useEffect, useState } from "react";
import * as THREE from 'three'
import * as presetShaders from "./assets/shaders";
import * as presetGeometries from "./assets/geometry";

type GeometryType = THREE.IcosahedronGeometry | THREE.DodecahedronGeometry | THREE.SphereGeometry | THREE.BoxGeometry | THREE.TorusKnotGeometry | THREE.PlaneGeometry
type MeshType = THREE.Mesh<GeometryType, THREE.ShaderMaterial, THREE.Object3DEventMap>

export default function Home() {
  const LIGHT_COLOR = new THREE.Color(1, 1, 1);
  const LIGHT_INTENSITY = 1.2;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const rendererRef = useRef<THREE.WebGLRenderer>(null);
  const meshRef = useRef<MeshType>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const loopRef = useRef<number>(null);

  const [vertexCode, setVertexCode] = useState(presetShaders.v1);
  const [fragmentCode, setFragmentCode] = useState(presetShaders.f1);
  const [geometry, setGeometry] = useState<GeometryType>(presetGeometries.icosahedron);

  // Other settings
  const [autoRotate, setAutoRotate] = useState<Boolean>(false);
  const [lightingStyle, setLightingStyle] = useState<'directional' | 'ambient'>();

  const [hasError, setHasError] = useState<Boolean>(false);

  // Initialize scene, camera, orbit controls, lighting, and objects
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera();
    camera.up = new THREE.Vector3(0, 0, 1); // Z is up
    camera.position.x = 10;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true, // Try without later
      alpha: true // Transparent bg, shows page bg behind it
    });
    rendererRef.current = renderer;

    // Initial material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: vertexCode,
      fragmentShader: fragmentCode
    });
    materialRef.current = material;

    // Start with icosahedron
    const mesh = new THREE.Mesh(geometry, material);
    meshRef.current = mesh;
    scene.add(mesh);

    const directionalLight = new THREE.DirectionalLight(LIGHT_COLOR, LIGHT_INTENSITY);
    directionalLight.target = mesh;
    scene.add(directionalLight);

    // Handle window resizing
    const handleResize = () => {
      const canvasContainer = canvasRef.current?.parentElement
      if (!canvasContainer) return;
      const w = canvasContainer.clientWidth;
      const h = canvasContainer.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    handleResize();
    window.addEventListener("resize", handleResize);

    // Main loop
    const loop = () => {
      loopRef.current = requestAnimationFrame(loop);

      if (materialRef.current && materialRef.current.uniforms.uTime) {
        materialRef.current.uniforms.uTime.value += 0.01;
      }

      // Auto rotation (around z axis)
      if (meshRef.current && autoRotate) {
        meshRef.current.rotation.z += 0.01;
      }

      renderer.render(scene, camera);
    };

    // Start main loop
    loop();

    return () => {
      // Dispose of everything
      window.removeEventListener("resize", handleResize);
      if (loopRef.current) {
        cancelAnimationFrame(loopRef.current)
      };

      material.dispose();
      renderer.dispose();
    }
  },
    [])

  const [activeTab, setActiveTab] = useState<'vertex' | 'fragment' | 'geometry'>('vertex');

  return (
    <div className="flex h-screen">

      <div className="w-[50%]">
        <canvas className="w-full h-full" id="canvas" ref={canvasRef}></canvas>
      </div>

      <div className="w-[50%]">
        <div className="h-full p-2">
          <div className="flex gap-2 border-b w-fit bg-(--editor-background) ">
            <button
              onClick={() => setActiveTab("vertex")}
              className={`px-4 py-2 ${activeTab === "vertex" ? "border-b-4" : ""}`}
            >
              Vertex Shader
            </button>
            <button
              onClick={() => setActiveTab("fragment")}
              className={`px-4 py-2 bg-(--editor-background) ${activeTab === "fragment" ? "border-b-4" : ""}`}
            >
              Fragment Shader
            </button>
            <button
              onClick={() => setActiveTab("geometry")}
              className={`px-4 py-2  ${activeTab === "geometry" ? "border-b-4" : ""}`}
            >
              Geometry Options
            </button>
          </div>

          <div className="bg-(--editor-background) h-[80%] p-2 ">
            {activeTab === "vertex" &&
              <textarea
                value={vertexCode}
                onChange={e => { setVertexCode(e.target.value) }}
                spellCheck={false}
                autoCorrect="none"
                className="h-full w-full flex-1 bg-[#1e1e1e] text-[#d4d4d4] border-none p-4 font-mono text-xs leading-relaxed resize-none outline-none"
                id="" />
            }
            {activeTab === "fragment" &&
              <textarea
                value={fragmentCode}
                onChange={e => { setFragmentCode(e.target.value) }}
                spellCheck={false}
                autoCorrect="none"
                className="h-full w-full flex-1 bg-[#1e1e1e] text-[#d4d4d4] border-none p-4 font-mono text-xs leading-relaxed resize-none outline-none"
                id="" />
            }
            {activeTab === "geometry" &&
              <>
              </>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
