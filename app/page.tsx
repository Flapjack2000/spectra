"use client"
import { useRef, useEffect, useState } from "react";
import * as THREE from 'three'
import * as presetShaders from "./assets/shaders";
import * as presetGeometries from "./assets/geometry"
export default function Home() {

  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const meshRef = useRef(null);
  const materialRef = useRef(null);
  const geometryRef = useRef(null);
  const loopRef = useRef(null);

  const [vertexCode, setVertex] = useState(presetShaders.v1);
  const [fragmentCode, setFragment] = useState(presetShaders.f1);
  const [geometry, setGeometry] = useState(presetGeometries.icosahedron);

  const [hasError, setHasError] = useState(false);

  // Initialize scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera();
    camera.up = new THREE.Vector3(0, 0, 1); // Z is up

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    });

    geometryRef.current

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: vertexCode,
      fragmentShader: fragmentCode
    });

    const mesh = new THREE.Mesh();

  },
    [])

  const [activeTab, setActiveTab] = useState<'vertex' | 'fragment' | 'geometry'>('vertex');

  return (
    <div className="flex h-screen">

      <div className="w-[50%]">
        <canvas className="w-full h-full" id="canvas" ref={canvasRef}></canvas>
      </div>

      <div className="w-[50%]">

        <div className="h-full ml-10 mr-10 p-2">
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

          <div className="bg-(--editor-background) p-2 min-h-[12em]">
            {activeTab === "vertex" &&
              <>
                <code>
                  {vertexCode}
                </code>
              </>
            }
            {activeTab === "fragment" &&
              <>
                <code >
                  {fragmentCode}
                </code>
              </>}
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
