"use client"
import { useRef, useEffect, useState } from "react";
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as presetShaders from "./assets/shaders";
import * as presetGeometries from "./assets/geometry";
import { DodecahedronIcon, IcosahedronIcon, CubeIcon, SphereIcon, PlaneIcon, KnotIcon } from "./assets/icons";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import Prism from 'prismjs';
import 'prismjs/themes/prism-funky.css';
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

  const [autoRotate, setAutoRotate] = useState(false);
  const [wireframe, setWireframe] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sceneRef = useRef<THREE.Scene>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>(null);
  const meshRef = useRef<MeshType>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const loopRef = useRef<number>(null);
  const errorModelRef = useRef<THREE.Group<THREE.Object3DEventMap>>(null);
  const autoRotateRef = useRef(autoRotate);

  const [vertexCode, setVertexCode] = useState(presetShaders.v0);
  const [fragmentCode, setFragmentCode] = useState(presetShaders.f0);
  const [geometry, setGeometry] = useState<GeometryType>(presetGeometries.icosahedron);

  const [hasError, setHasError] = useState<boolean>(false);
  const [errorHistory, setErrorHistory] = useState<string[]>([]);

  const mousePositionRef = useRef(new THREE.Vector2(0, 0));
  const lastMousePositionRef = useRef(new THREE.Vector2(0, 0));
  const mouseSpeedRef = useRef(0);

  const createMaterial = (vertex: string, fragment: string, time: number = 0) => {
    return new THREE.ShaderMaterial({
      wireframe: wireframe,
      side: THREE.DoubleSide,
      lights: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib['lights'], // Built in lighting uniforms
        {
          uTime: { value: time },
          uMousePosition: { value: new THREE.Vector2(0, 0) },
          uMouseSpeed: { value: 0 }
        }
      ]),
      vertexShader: vertex,
      fragmentShader: fragment
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
    const material = createMaterial(presetShaders.v0, presetShaders.f0);
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

    // Handle mouse movement
    const canvas = canvasRef.current;
    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      // Normalize mouse position to -1 to 1 range
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      lastMousePositionRef.current.copy(mousePositionRef.current);
      mousePositionRef.current.set(x, y);

      // Calculate speed
      const dx = mousePositionRef.current.x - lastMousePositionRef.current.x;
      const dy = mousePositionRef.current.y - lastMousePositionRef.current.y;
      mouseSpeedRef.current = Math.sqrt(dx * dx + dy * dy);
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    // Main loop
    const loop = () => {
      loopRef.current = requestAnimationFrame(loop);

      if (materialRef.current && materialRef.current.uniforms.uTime) {
        materialRef.current.uniforms.uTime.value += 0.01;
      }

      // Update mouse uniforms
      if (materialRef.current) {
        if (materialRef.current.uniforms.uMousePosition) {
          materialRef.current.uniforms.uMousePosition.value.copy(mousePositionRef.current);
        }
        if (materialRef.current.uniforms.uMouseSpeed) {
          materialRef.current.uniforms.uMouseSpeed.value = mouseSpeedRef.current;
          // Decay speed over time
          mouseSpeedRef.current *= 0.95;
        }
      }

      // Auto rotation (around z axis)
      if (meshRef.current && autoRotateRef.current) {
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
      canvas.removeEventListener("mousemove", handleMouseMove);
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

      // Capture console errors to get detailed shader compilation messages
      let capturedError = '';
      const originalError = console.error;
      const originalWarn = console.warn;

      console.error = (...args) => {
        capturedError += args.join(' ') + '\n';
        // Don't call originalError to prevent double logging
      };

      console.warn = (...args) => {
        capturedError += args.join(' ') + '\n';
        // Don't call originalWarn to prevent double logging
      };

      // Test out shader compilation so see if they work
      try {
        const testMaterial = createMaterial(vertexCode, fragmentCode, materialRef.current?.uniforms.uTime.value || 0);

        // Create hidden test scene
        const testScene = new THREE.Scene();
        const testCamera = new THREE.PerspectiveCamera();
        const testGeometry = new THREE.PlaneGeometry();
        const testMesh = new THREE.Mesh(testGeometry, testMaterial);
        testScene.add(testMesh);

        // Force renderer to compile the shader and check for compilation errors
        const oldTarget = renderer.getRenderTarget();
        const testTarget = new THREE.WebGLRenderTarget(1, 1);
        renderer.setRenderTarget(testTarget);
        renderer.render(testScene, testCamera);
        renderer.setRenderTarget(oldTarget);

        // Clean up test objects
        testTarget.dispose();
        testGeometry.dispose();

        // Restore console methods
        console.error = originalError;
        console.warn = originalWarn;

        // If we captured any errors during compilation, throw them
        if (capturedError) {
          testMaterial.dispose();
          throw new Error(capturedError);
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
        // Restore console methods in case of error
        console.error = originalError;
        console.warn = originalWarn;

        // Use captured error if available, otherwise use the basic error message
        const errorMessage = e instanceof Error ? e.message : String(e);
        const detailedError = capturedError || errorMessage;

        // Only update error history if it's a new error
        setErrorHistory(prev => {
          const trimmedError = detailedError.trim();
          // Don't add duplicate consecutive errors
          if (prev.length > 0 && prev[prev.length - 1] === trimmedError) {
            return prev;
          }
          return [...prev, trimmedError];
        });

        if (!meshRef.current || !sceneRef.current || !errorModelRef.current) return;

        // Hide the main mesh and show error model
        meshRef.current.visible = false;
        sceneRef.current.add(errorModelRef.current);
        setHasError(true);
      }

    }, CODE_UPDATE_TIMEOUT);
    return () => clearTimeout(updateTimeout);
  }, [vertexCode, fragmentCode, geometry, wireframe])

  // Update geometry change
  useEffect(() => {
    if (!meshRef.current) return;

    const oldGeometry = meshRef.current.geometry;
    meshRef.current.geometry = geometry;
    oldGeometry.dispose();
  }, [geometry]);

  // Update wireframe when toggled
  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.wireframe = wireframe;
  }, [wireframe]);

  // Update autoRotate ref when state changes
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  const [activeTab, setActiveTab] = useState<'vertex' | 'fragment' | 'options' | "error log">('vertex');

  const UniformQuickAddRemove = () => {
    // DON"T FORGET GLSL TYPES FOR THE UNIFORMS
    const uniforms: string[] = ['float uTime', 'vec2 uMousePosition', 'float uMouseSpeed']
    return (
      <div className="flex items-baseline px-4 py-2 bg-(--editor-background) border-t text-xs opacity-75">
        <span className="shrink-0 mr-2">Add / Remove Uniforms:</span>
        <div className="flex justify-start overflow-x-auto p-1 pl-3 gap-1">
          {uniforms.map(
            (uniform, index) => (
              <button
                onClick={() => {
                  const definition = "uniform " + uniform;
                  const fullDefinition = definition + ';\n';
                  if (!vertexCode.includes(definition)) { setVertexCode(fullDefinition + vertexCode) }
                  else { setVertexCode(vertexCode.replace(fullDefinition, "")) }
                  if (!fragmentCode.includes(definition)) { setFragmentCode(fullDefinition + fragmentCode) }
                  else { setFragmentCode(fragmentCode.replace(fullDefinition, "")) }
                }}
                key={index}
                className="cursor-pointer border-transparent bg-(--active) inline-flex items-center justify-center rounded-full border px-2 py-0.5 w-fit whitespace-nowrap shrink-0 gap-1 overflow-hidden">

                {/* "float uTime", for example */}
                <span className="font-bold italic">{uniform.split(' ')[0]}</span>{uniform.split(' ')[1]}
              </button>
            )
          )}
          <BuyMeCoffee />
        </div>
      </div>)
  }

  const BuyMeCoffee = () => {
    return (
      <a
        href="https://buymeacoffee.com/zachwilliams"
        target="_blank"
        className="cursor-pointer border-transparent bg-(--coffee-btn) text-(--editor-background) inline-flex items-center justify-center rounded-full border px-2 py-0.5 w-fit whitespace-nowrap shrink-0 gap-1 overflow-hidden">
        <span>{"☕ Buy me a coffee :)"}</span>
      </a>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden">
      {/* Canvas Section */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-full">
        <canvas className="w-full h-full" id="canvas" ref={canvasRef}></canvas>
      </div>

      {/* Editor Section */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-full flex flex-col p-2 lg:p-6">
        <div className="flex flex-col h-full max-w-full lg:max-w-4xl mx-auto w-full">

          {/* Tab Navigation */}
          <div className="flex rounded-t overflow-x-auto scrollbar-hide bg-(--editor-background) border-b">
            <button
              onClick={() => setActiveTab("vertex")}
              className={`px-3 lg:px-8 py-2 whitespace-nowrap hover:bg-(--active) transition-colors ${activeTab === "vertex" ? "bg-(--active)" : ""}`}
            >
              Vertex Shader
            </button>
            <button
              onClick={() => setActiveTab("fragment")}
              className={`px-3 lg:px-8 py-2 whitespace-nowrap hover:bg-(--active) transition-colors border-x ${activeTab === "fragment" ? "bg-(--active)" : ""}`}
            >
              Fragment Shader
            </button>
            <button
              onClick={() => setActiveTab("options")}
              className={`px-3 lg:px-8 py-2 whitespace-nowrap hover:bg-(--active) transition-colors ${activeTab === "options" ? "bg-(--active)" : ""}`}
            >
              Options & Examples
            </button>
            <button
              onClick={() => setActiveTab("error log")}
              className={`px-3 lg:px-8 py-2 whitespace-nowrap hover:bg-(--active) transition-colors border-l ${activeTab === "error log" ? "bg-(--active)" : ""}`}
            >
              Error Log
            </button>
          </div>

          {/* Content Area */}
          <div className="bg-(--editor-background) flex-1 rounded-b overflow-hidden flex flex-col min-h-0">
            {activeTab === "vertex" && (
              <div className="h-full flex flex-col">
                <UniformQuickAddRemove />
                <div className="flex-1 overflow-auto overscroll-contain">
                  <Editor
                    value={vertexCode}
                    onValueChange={setVertexCode}
                    highlight={code => Prism.highlight(code, Prism.languages.glsl, 'glsl')}
                    padding={16}
                    className="min-h-full w-full bg-(--editor-background-secondary) font-mono text-xs leading-relaxed"
                  />
                </div>
              </div>
            )}

            {activeTab === "fragment" && (
              <div className="h-full flex flex-col">
                <UniformQuickAddRemove />
                <div className="flex-1 overflow-auto overscroll-contain">
                  <Editor
                    value={fragmentCode}
                    onValueChange={setFragmentCode}
                    highlight={code => Prism.highlight(code, Prism.languages.glsl, 'glsl')}
                    padding={16}
                    className="min-h-full w-full bg-(--editor-background-secondary) font-mono text-xs leading-relaxed"
                  />
                </div>
              </div>
            )}

            {activeTab === "options" && (
              <div className="h-full overflow-auto p-2 lg:p-4 bg-(--editor-background-secondary)">
                <div className="grid grid-cols-2 gap-2 lg:gap-3 max-w-2xl mx-auto">
                  {/* Geometry buttons */}
                  <button
                    className="flex flex-col items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors"
                    onClick={() => setGeometry(presetGeometries.sphere)}
                  >
                    <SphereIcon strokeWidth={2} size={24} fill={'var(--foreground)'} />
                    <p className="text-xs lg:text-sm mt-2">Sphere</p>
                  </button>

                  <button
                    className="flex flex-col items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors"
                    onClick={() => setGeometry(presetGeometries.cube)}
                  >
                    <CubeIcon strokeWidth={2} size={24} fill={'var(--foreground)'} />
                    <p className="text-xs lg:text-sm mt-2">Cube</p>
                  </button>

                  <button
                    className="flex flex-col items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors"
                    onClick={() => setGeometry(presetGeometries.dodecahedron)}
                  >
                    <DodecahedronIcon strokeWidth={2} size={24} fill={'var(--foreground)'} />
                    <p className="text-xs lg:text-sm mt-2">Dodecahedron</p>
                  </button>

                  <button
                    className="flex flex-col items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors"
                    onClick={() => setGeometry(presetGeometries.icosahedron)}
                  >
                    <IcosahedronIcon strokeWidth={2} size={24} fill={'var(--foreground)'} />
                    <p className="text-xs lg:text-sm mt-2">Icosahedron</p>
                  </button>

                  <button
                    className="flex flex-col items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors"
                    onClick={() => setGeometry(presetGeometries.plane)}
                  >
                    <PlaneIcon strokeWidth={2} size={24} fill={'var(--foreground)'} />
                    <p className="text-xs lg:text-sm mt-2">Plane</p>
                  </button>

                  <button
                    className="flex flex-col items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors"
                    onClick={() => setGeometry(presetGeometries.knot)}
                  >
                    <KnotIcon strokeWidth={2} size={24} fill={'var(--foreground)'} />
                    <p className="text-xs lg:text-sm mt-2">Torus Knot</p>
                  </button>

                  {/* Control buttons */}
                  <button
                    className={`flex items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors ${autoRotate ? 'bg-(--active)' : ''}`}
                    onClick={() => setAutoRotate(!autoRotate)}
                  >
                    <p className="text-xs lg:text-sm">{autoRotate ? 'Stop' : 'Start'} Auto Rotate</p>
                  </button>

                  <button
                    className={`flex items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors ${wireframe ? 'bg-(--active)' : ''}`}
                    onClick={() => setWireframe(!wireframe)}
                  >
                    <p className="text-xs lg:text-sm">Wireframe: {wireframe ? 'On' : 'Off'}</p>
                  </button>

                  {/* Reset buttons */}
                  <button
                    className="flex items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors col-span-2"
                    onClick={() => {
                      setVertexCode(presetShaders.v0);
                      setFragmentCode(presetShaders.f0);
                      materialRef.current?.dispose();
                      materialRef.current = createMaterial(presetShaders.v0, presetShaders.f0);
                    }}
                  >
                    <p className="text-xs lg:text-sm">Reset Shaders</p>
                  </button>

                  <button
                    className="flex items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors col-span-2"
                    onClick={() => {
                      if (!meshRef.current || !materialRef.current) return;
                      materialRef.current.dispose();
                      materialRef.current = createMaterial(vertexCode, fragmentCode);
                      meshRef.current.material = materialRef.current;
                    }}
                  >
                    <p className="text-xs lg:text-sm">Reset Uniforms</p>
                  </button>

                  {/* Example buttons */}
                  <button
                    className="flex items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors"
                    onClick={() => { setVertexCode(presetShaders.v1); setFragmentCode(presetShaders.f1) }}
                  >
                    <p className="text-xs lg:text-sm">Example 1 - Twist</p>
                  </button>

                  <button
                    className="flex items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors"
                    onClick={() => { setVertexCode(presetShaders.v2); setFragmentCode(presetShaders.f2) }}
                  >
                    <p className="text-xs lg:text-sm">Example 2 - Pulse</p>
                  </button>

                  <button
                    className="flex items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors"
                    onClick={() => { setVertexCode(presetShaders.v3); setFragmentCode(presetShaders.f3) }}
                  >
                    <p className="text-xs lg:text-sm">Example 3 - Wave</p>
                  </button>

                  <button
                    className="flex items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors"
                    onClick={() => { setVertexCode(presetShaders.v4); setFragmentCode(presetShaders.f4) }}
                  >
                    <p className="text-xs lg:text-sm">Example 4 - Jitter</p>
                  </button>

                  <button
                    className="flex items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors"
                    onClick={() => { setVertexCode(presetShaders.v5); setFragmentCode(presetShaders.f5) }}
                  >
                    <p className="text-xs lg:text-sm">Example 5 - Spikes</p>
                  </button>

                  <button
                    className="flex items-center justify-center rounded border p-3 lg:p-4 hover:bg-(--active) transition-colors"
                    onClick={() => { setVertexCode(presetShaders.v6); setFragmentCode(presetShaders.f6) }}
                  >
                    <p className="text-xs lg:text-sm">Example 6 - Fresnel </p>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "error log" && (
              <div className="h-full overflow-auto bg-(--editor-background-secondary) font-mono text-xs">
                {errorHistory.length === 0 ? (
                  <div className="p-4 text-gray-500">No errors yet</div>
                ) : (
                  errorHistory.map((log, index) => (
                    <div key={index} className="text-red-500 border-b border-foreground/20 p-3 lg:p-4">
                      {log}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}