"use client"
import { PerspectiveCamera } from "@react-three/drei";
import { useRef, useEffect, useState } from "react";
import * as THREE from 'three'
export default function Home() {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometryRef = useRef(null);
  const loopRef = useRef(null);



  return (
    <div>

      <canvas></canvas>


    </div>
  );
}
