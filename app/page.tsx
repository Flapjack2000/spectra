"use client"
import { useRef, useEffect, useState } from "react";
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as presetShaders from "./assets/shaders";
import * as presetGeometries from "./assets/geometry";
import { DodecahedronIcon, IcosahedronIcon, CubeIcon, SphereIcon, PlaneIcon, KnotIcon } from "./assets/icons";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import dynamic from "next/dynamic";

const Editor = dynamic(() => import('react-simple-code-editor'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-(--editor-background-secondary) p-4">Loading editor...</div>
});

type GeometryType = THREE.IcosahedronGeometry | THREE.DodecahedronGeometry | THREE.SphereGeometry | THREE.BoxGeometry | THREE.TorusKnotGeometry | THREE.PlaneGeometry
type MeshType = THREE.Mesh<GeometryType, THREE.ShaderMaterial, THREE.Object3DEventMap>

export default function Home() {

  // Manual syntax highlighting patterns
  Prism.languages.glsl = {
    'comment': [
      {
        pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
        lookbehind: true
      },
      {
        pattern: /(^|[^\\:])\/\/.*/,
        lookbehind: true
      }
    ],
    'number': /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?[a-z]*/i,
    'keyword': /\b(?:attribute|const|uniform|varying|break|continue|do|for|while|if|else|in|out|inout|float|int|void|bool|true|false|discard|return|mat2|mat3|mat4|vec2|vec3|vec4|ivec2|ivec3|ivec4|bvec2|bvec3|bvec4|sampler2D|samplerCube|struct|precision|highp|mediump|lowp)\b/,
    'function': /\b(?:radians|degrees|sin|cos|tan|asin|acos|atan|pow|exp|log|exp2|log2|sqrt|inversesqrt|abs|sign|floor|ceil|fract|mod|min|max|clamp|mix|step|smoothstep|length|distance|dot|cross|normalize|faceforward|reflect|refract|matrixCompMult|lessThan|lessThanEqual|greaterThan|greaterThanEqual|equal|notEqual|any|all|not|texture2D|textureCube|texture2DProj|texture2DLod|texture2DProjLod|textureCubeLod|dFdx|dFdy|fwidth)\b/,
    'builtin': /\b(?:gl_FragCoord|gl_FragColor|gl_Position|gl_PointSize|gl_VertexID)\b/,
    'operator': /\+\+|--|[+\-*/%]=?|[&|^]=?|[!=<>]=|<<?=?|>>?=?|&&?|\|\|?/,
    'punctuation': /[{}[\];(),.:]/
  };



  const LIGHT_COLOR = new THREE.Color(1, 1, 1);
  const LIGHT_INTENSITY = 1.2;
  const CODE_UPDATE_TIMEOUT = 500;
  const UTIME_SPEED_MULTIPLIER = 2;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sceneRef = useRef<THREE.Scene>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>(null);
  const meshRef = useRef<MeshType>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const loopRef = useRef<number>(null);
  let errorModelRef = useRef<THREE.Group<THREE.Object3DEventMap>>(null);

  const [vertexCode, setVertexCode] = useState(presetShaders.v0);
  const [fragmentCode, setFragmentCode] = useState(presetShaders.f0);
  const [geometry, setGeometry] = useState<GeometryType>(presetGeometries.icosahedron);

  // Other settings
  const [autoRotate, setAutoRotate] = useState<Boolean>(false);

  const [hasError, setHasError] = useState<Boolean>(false);
  const [errorHistory, setErrorHistory] = useState<string[]>([]);

  const initialMaterial = () => {
    return new THREE.ShaderMaterial({
      wireframe: false,
      side: THREE.DoubleSide,
      lights: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib['lights'], // Built in lighting uniforms
        {
          uTime: { value: 0 },
        }
      ]),
      vertexShader: presetShaders.v0,
      fragmentShader: presetShaders.f0
    });
  }

  const freshMaterial = () => {
    return new THREE.ShaderMaterial({
      wireframe: false,
      side: THREE.DoubleSide,
      lights: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib['lights'], // Built in lighting uniforms
        {
          uTime: { value: 0 },
        }
      ]),
      vertexShader: vertexCode,
      fragmentShader: fragmentCode
    });
  }

  // Initialize scene, camera, orbit controls, lighting, and objects
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Load error model
    const loader = new GLTFLoader();
    loader.load("/error.glb",
      (model) => {
        errorModelRef.current = model.scene
      }
    )

    // Set up camera
    const camera = new THREE.PerspectiveCamera();
    camera.up = new THREE.Vector3(0, 0, 1); // Z is up
    camera.position.set(10, 0, 10)
    camera.lookAt(0, 0, 0);


    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true, // Try without later
      alpha: true, // Transparent bg, shows page bg behind it
    });
    rendererRef.current = renderer;

    // Create orbit controls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.enablePan = false;
    orbitControls.maxDistance = 12;
    orbitControls.minDistance = 1.5;
    orbitControls.update();

    // Initial material
    const material = initialMaterial();
    materialRef.current = material;

    // Create mesh from initial geometry and material
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, 0);
    meshRef.current = mesh;
    scene.add(mesh);

    // Lighting
    const directionalLight = new THREE.DirectionalLight(LIGHT_COLOR, LIGHT_INTENSITY);
    directionalLight.position.set(0, 2, 10);
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
        materialRef.current.uniforms.uTime.value += 0.01 * UTIME_SPEED_MULTIPLIER;
      }

      // Auto rotation (around z axis)
      if (meshRef.current && autoRotate) {
        meshRef.current.rotation.z += 0.01;
      }

      orbitControls.update();
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

  // Update shaders when user's code changes
  useEffect(() => {
    if (!meshRef.current || !rendererRef.current) return;

    // Delay code compilation so the scene is not constantly rerendering as the user types
    const updateTimeout = setTimeout(() => {
      const renderer = rendererRef.current;
      if (!renderer) return;

      // Test out shader compilation so see if they work
      try {
        const testMaterial = new THREE.ShaderMaterial({
          wireframe: false,
          side: THREE.DoubleSide,
          lights: true,
          uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib['lights'], // Built in lighting uniforms
            {
              uTime: { value: materialRef.current?.uniforms.uTime.value || 0 }
            }]),
          vertexShader: vertexCode,
          fragmentShader: fragmentCode
        })

        // Create hidden test scene
        const testScene = new THREE.Scene();
        const testCamera = new THREE.PerspectiveCamera();
        const testGeometry = new THREE.PlaneGeometry();
        const testMesh = new THREE.Mesh(testGeometry, testMaterial);
        testScene.add(testMesh);

        // Force renderer to compile the shader
        const oldTarget = renderer.getRenderTarget();
        const testTarget = new THREE.WebGLRenderTarget();
        renderer.setRenderTarget(testTarget);
        renderer.render(testScene, testCamera);
        renderer.setRenderTarget(oldTarget);

        // Check for errors
        const gl = renderer.getContext();
        const glError = gl.getError();

        // Clean up test objects
        testTarget.dispose();
        testGeometry.dispose();

        // Report error and escape to catch block
        if (glError !== gl.NO_ERROR) {
          throw new Error("WebGL Error: " + glError);
        }

        if (!materialRef.current || !meshRef.current || !sceneRef.current) return

        // Shaders compiled successfully
        materialRef.current.dispose();
        materialRef.current = testMaterial;
        meshRef.current.material = materialRef.current;

        // Show the main mesh and hide error model
        meshRef.current.visible = true;
        if (errorModelRef.current) {
          sceneRef.current.remove(errorModelRef.current);
        }
        setHasError(false);
      }

      catch (e: unknown) {
        // Log error
        console.error("Shader error:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        setErrorHistory([...errorHistory, "Shader error: " + errorMessage])
        if (!meshRef.current || !sceneRef.current || !errorModelRef.current) return;

        // Hide the main mesh and show error model
        meshRef.current.visible = false;
        sceneRef.current.add(errorModelRef.current);
        setHasError(true);
      }

    }, CODE_UPDATE_TIMEOUT);
    return () => clearTimeout(updateTimeout);
  }, [vertexCode, fragmentCode, geometry, hasError])


  // Update geometry change
  useEffect(() => {
    if (!meshRef.current) return;

    const oldGeometry = meshRef.current.geometry;
    meshRef.current.geometry = geometry;
    oldGeometry.dispose();
  }, [geometry]);

  const [activeTab, setActiveTab] = useState<'vertex' | 'fragment' | 'options' | "error log">('vertex');

  return (
    <div className="flex h-screen">

      <div className="w-[50%]">
        <canvas className="w-full h-full" id="canvas" ref={canvasRef}></canvas>
      </div>

      <div className="w-[50%] flex flex-col items-center justify-center">
        <div className="h-[80%] w-[75%]">
          <div className="flex rounded-t [&>*:first-child]:rounded-tl [&>*:last-child]:rounded-tr [&>*:not(:first-child,:last-child)]:border-x border-b w-fit bg-(--editor-background) ">
            <button
              onClick={() => setActiveTab("vertex")}
              className={`px-8 py-2 hover:bg-(--active) ${activeTab === "vertex" ? "bg-(--active)" : ""}`}
            >
              Vertex Shader
            </button>
            <button
              onClick={() => setActiveTab("fragment")}
              className={`px-8 py-2 hover:bg-(--active) ${activeTab === "fragment" ? "bg-(--active)" : ""}`}
            >
              Fragment Shader
            </button>
            <button
              onClick={() => setActiveTab("options")}
              className={`rounded-tr px-8 py-2 hover:bg-(--active) ${activeTab === "options" ? "bg-(--active)" : ""}`}
            >
              Options
            </button>
            <button
              onClick={() => setActiveTab("error log")}
              className={`rounded-tr px-8 py-2 hover:bg-(--active) ${activeTab === "error log" ? "bg-(--active)" : ""}`}
            >
              Error Log
            </button>
          </div>


          <div className="bg-(--editor-background) h-[80%] p-2 rounded rounded-tl-none">
            {activeTab === "vertex" &&
              <Editor
                value={vertexCode}
                onValueChange={setVertexCode}
                highlight={code => Prism.highlight(code, Prism.languages.glsl, 'glsl')} padding={16}
                className="h-full w-full bg-(--editor-background-secondary) font-mono text-xs leading-relaxed"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
              />
            }

            {activeTab === "fragment" &&
              <Editor
                value={fragmentCode}
                onValueChange={setFragmentCode}
                highlight={code => Prism.highlight(code, Prism.languages.glsl, 'glsl')} padding={16}
                className="h-full w-full bg-(--editor-background-secondary) font-mono text-xs leading-relaxed"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
              />
            }

            {activeTab === "options" &&
              <div className="*:*:duration-200 *:*:hover:bg-(--active) *:*:transition-colors h-fit w-full flex-1 flex-col bg-(--editor-background-secondary) text-foreground border-none p-4 font-mono text-xs">
                <div className="flex flex-1 w-full">
                  <button
                    className="flex flex-1 flex-col items-center rounded border p-4 m-1"
                    onClick={() => { setGeometry(presetGeometries.sphere) }}
                  >
                    <p>Sphere</p>
                    <SphereIcon strokeWidth={2} size={24} fill={'var(--foreground)'} />
                  </button>

                  <button
                    className="flex flex-1 flex-col items-center rounded border p-4 m-1"
                    onClick={() => { setGeometry(presetGeometries.cube) }}
                  >
                    <p>Cube</p>
                    <CubeIcon strokeWidth={2} size={24} fill={'var(--foreground)'} />
                  </button>
                </div>

                <div className="flex flex-1 w-full">
                  <button
                    className="flex flex-1 flex-col items-center rounded border p-4 m-1"
                    onClick={() => { setGeometry(presetGeometries.dodecahedron) }}
                  >
                    <p>Dodecahedron</p>
                    <DodecahedronIcon strokeWidth={2} size={24} fill={'var(--foreground)'} />
                  </button>

                  <button
                    className="flex flex-1 flex-col items-center rounded border p-4 m-1"
                    onClick={() => { setGeometry(presetGeometries.icosahedron) }}
                  >
                    <p>Icosahedron</p>
                    <IcosahedronIcon strokeWidth={2} size={24} fill={'var(--foreground)'} />
                  </button>
                </div>

                <div className="flex flex-1 w-full">
                  <button
                    className="flex flex-1 flex-col items-center rounded border p-4 m-1"
                    onClick={() => { setGeometry(presetGeometries.plane) }}
                  >
                    <p>Plane</p>
                    <PlaneIcon strokeWidth={2} size={24} fill={'var(--foreground)'} />
                  </button>

                  <button
                    className="flex flex-1 flex-col items-center rounded border p-4 m-1"
                    onClick={() => { setGeometry(presetGeometries.knot) }}
                  >
                    <p>Torus Knot</p>
                    <KnotIcon strokeWidth={2} size={24} fill={'var(--foreground)'} />
                  </button>
                </div>

                <div className="flex flex-1 w-full">
                  <button
                    className="flex flex-1 justify-center rounded border p-4 m-1"
                    onClick={() => {
                      setVertexCode(presetShaders.v0);
                      setFragmentCode(presetShaders.f0);
                      materialRef.current?.dispose();
                      materialRef.current = initialMaterial();
                    }}
                  >
                    <p>Reset Shaders</p>
                  </button>
                  <button
                    className="flex flex-1 justify-center rounded border p-4 m-1"
                    onClick={() => {
                      if (!meshRef.current || !materialRef.current) return;

                      materialRef.current.dispose();
                      materialRef.current = freshMaterial();
                      meshRef.current.material = materialRef.current;
                    }}
                  >
                    <p>Reset Uniforms</p>
                  </button>
                </div>

                <div className="flex flex-1 w-full">
                  <button
                    className="flex flex-1 justify-center rounded border p-4 m-1"
                    onClick={() => { setVertexCode(presetShaders.v1); setFragmentCode(presetShaders.f1) }}
                  >
                    <p>Example 1 - Twist</p>
                  </button>
                  <button
                    className="flex flex-1 justify-center rounded border p-4 m-1"
                    onClick={() => { setVertexCode(presetShaders.v2); setFragmentCode(presetShaders.f2) }}
                  >
                    <p>Example 2 - Pulse</p>
                  </button>
                </div>

                <div className="flex flex-1 w-full">
                  <button
                    className="flex flex-1 justify-center rounded border p-4 m-1"
                    onClick={() => { setVertexCode(presetShaders.v3); setFragmentCode(presetShaders.f3) }}
                  >
                    <p>Example 3 - Wave</p>
                  </button>
                  <button
                    className="flex flex-1 justify-center rounded border p-4 m-1"
                    onClick={() => { setVertexCode(presetShaders.v4); setFragmentCode(presetShaders.f4) }}
                  >
                    <p>Example 4 - Jitter</p>
                  </button>
                </div>
              </div>
            }

            {activeTab === "error log" &&
              <div className="h-fit w-full flex-1 flex-col bg-(--editor-background-secondary) text-foreground border-none font-mono text-xs">
                {errorHistory.map((log, index) => (
                  <div key={index} className="text-red-500 border-foreground border-b p-1 flex flex-1 w-full">
                    {log}
                  </div>
                ))}
              </div>

            }

          </div>

        </div>
      </div>
    </div>
  );
}
