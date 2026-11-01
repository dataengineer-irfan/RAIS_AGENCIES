import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Plus, Check, ShieldCheck, Flame, Box, RotateCcw, Play, Pause, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../context/StoreContext';
import * as THREE from 'three';

export const Packaging3DViewerModal = ({ product, onClose }) => {
  const { addToCart, language } = useStore();
  const [added, setAdded] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const canvasContainerRef = useRef(null);
  const sceneRef = useRef(null);
  const meshGroupRef = useRef(null);
  const rendererRef = useRef(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  if (!product) return null;

  const isBucket = product.name?.toLowerCase().includes('bucket') || product.sku?.includes('BOX-08');

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || 340;
    const height = 240;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 4.2);
    camera.lookAt(0, 0, 0);

    // 2. WebGL Renderer with Antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Lighting (Studio Key + Fill + Rim)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xff9900, 0.6);
    rimLight.position.set(-5, -2, -4);
    scene.add(rimLight);

    // 4. Create Procedural Texture for realistic cardboard/packaging
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 512;
    texCanvas.height = 512;
    const ctx = texCanvas.getContext('2d');

    if (isBucket) {
      // QSR Fried Chicken Bucket Striped Livery
      ctx.fillStyle = '#C8102E'; // Bold Red
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 512; i += 64) {
        ctx.fillRect(i, 0, 32, 512);
      }

      // Golden Brand Emblem in center
      ctx.fillStyle = '#FC8019';
      ctx.beginPath();
      ctx.arc(256, 256, 110, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CRISPY CHICKEN', 256, 240);
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('RAIS QSR PACK', 256, 280);
    } else {
      // Premium Eco Kraft Pizza Box Texture
      ctx.fillStyle = '#C19A6B'; // Kraft cardboard brown
      ctx.fillRect(0, 0, 512, 512);

      // Subtle Kraft Paper Grain
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      for (let i = 0; i < 500; i++) {
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 4, 1);
      }

      // Pizza Box Top Graphics
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 8;
      ctx.strokeRect(40, 40, 432, 432);

      ctx.fillStyle = '#8B4513';
      ctx.font = 'bold 42px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FRESH HOT PIZZA', 256, 230);
      ctx.font = '22px sans-serif';
      ctx.fillText('STEAM VENT PROTECTED', 256, 275);
    }

    const texture = new THREE.CanvasTexture(texCanvas);

    // 5. Build 3D Mesh Object Group
    const meshGroup = new THREE.Group();
    meshGroupRef.current = meshGroup;

    if (isBucket) {
      // Tapered QSR Paper Bucket (Cylinder)
      const bucketGeo = new THREE.CylinderGeometry(1.15, 0.85, 1.8, 36, 1, false);
      const bucketMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.35,
        metalness: 0.05
      });
      const bucketMesh = new THREE.Mesh(bucketGeo, bucketMat);
      bucketMesh.castShadow = true;
      meshGroup.add(bucketMesh);

      // Golden Top Rolled Rim (Torus)
      const rimGeo = new THREE.TorusGeometry(1.16, 0.04, 16, 40);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xF59E0B, roughness: 0.2 });
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.rotation.x = Math.PI / 2;
      rimMesh.position.y = 0.9;
      meshGroup.add(rimMesh);

      // Translucent Vented Paper Lid
      const lidGeo = new THREE.CylinderGeometry(1.17, 1.17, 0.08, 36);
      const lidMat = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.9,
        roughness: 0.2
      });
      const lidMesh = new THREE.Mesh(lidGeo, lidMat);
      lidMesh.position.y = 0.94;
      meshGroup.add(lidMesh);
    } else {
      // Folded Corrugated Pizza / Burger Box
      const boxGeo = new THREE.BoxGeometry(2.2, 0.38, 2.2);
      const boxMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.5,
        metalness: 0.05
      });
      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.castShadow = true;
      meshGroup.add(boxMesh);
    }

    // Floor Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.12
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = isBucket ? -1.0 : -0.3;
    scene.add(shadowMesh);

    scene.add(meshGroup);

    // Initial slight angle tilt for studio presentation
    meshGroup.rotation.x = 0.35;
    meshGroup.rotation.y = 0.45;

    // 6. Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (isAutoRotating && !isDraggingRef.current && meshGroupRef.current) {
        meshGroupRef.current.rotation.y += 0.012;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container && renderer.domElement) {
        container.innerHTML = '';
      }
    };
  }, [isBucket, isAutoRotating]);

  // Touch & Mouse 360 Drag Handlers
  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = {
      x: e.clientX || (e.touches && e.touches[0].clientX) || 0,
      y: e.clientY || (e.touches && e.touches[0].clientY) || 0
    };
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || !meshGroupRef.current) return;

    const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const currentY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    const deltaX = currentX - previousMousePositionRef.current.x;
    const deltaY = currentY - previousMousePositionRef.current.y;

    meshGroupRef.current.rotation.y += deltaX * 0.015;
    meshGroupRef.current.rotation.x += deltaY * 0.01;

    // Clamp X rotation to prevent flipping upside down
    meshGroupRef.current.rotation.x = Math.max(-0.6, Math.min(0.8, meshGroupRef.current.rotation.x));

    previousMousePositionRef.current = { x: currentX, y: currentY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleAddCase = () => {
    addToCart(product, 1, false);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col border border-slate-100"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 font-mono flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Three.js 3D WebGL Studio
              </span>
              <h3 className="text-sm font-black text-slate-900 truncate max-w-[240px]">
                {product.name}
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Visualizer Canvas (Interactive Three.js WebGL) */}
        <div className="p-4 bg-gradient-to-b from-slate-50 via-slate-100 to-white flex flex-col items-center justify-center relative select-none">
          
          {/* Top Controls Bar */}
          <div className="w-full flex items-center justify-between mb-1 z-10 px-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              360° Touch Orbit Active
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsAutoRotating(!isAutoRotating)}
                className="px-2.5 py-1 rounded-full bg-white text-slate-700 text-[10px] font-bold border border-slate-200 shadow-2xs flex items-center gap-1 hover:bg-slate-50"
              >
                {isAutoRotating ? <Pause className="w-2.5 h-2.5 text-indigo-600" /> : <Play className="w-2.5 h-2.5 text-emerald-600" />}
                <span>{isAutoRotating ? 'Pause Spin' : 'Auto Spin'}</span>
              </button>

              <button
                onClick={() => {
                  if (meshGroupRef.current) {
                    meshGroupRef.current.rotation.set(0.35, 0.45, 0);
                  }
                }}
                className="p-1 rounded-full bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-2xs"
                title="Reset Angle"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Three.js Canvas Container */}
          <div 
            ref={canvasContainerRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className="w-full h-[240px] cursor-grab active:cursor-grabbing flex items-center justify-center touch-none"
          />

          <span className="text-[11px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
            <span>👆 Drag with finger or mouse to inspect 360° angles</span>
          </span>
        </div>

        {/* Commercial Specifications List */}
        <div className="p-4 space-y-2 bg-white text-xs border-t border-slate-100">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-emerald-900 block font-black uppercase">Steam-Vented Lids</span>
                <span className="text-[11px] text-emerald-700 font-medium">Zero soggy crusts on van or bike delivery</span>
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-start gap-2">
              <Flame className="w-4 h-4 text-[#FC8019] shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-amber-900 block font-black uppercase">Heavy-Gauge Kraft</span>
                <span className="text-[11px] text-amber-800 font-medium">100% oil & greaseproof barrier certified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Depot Case Pack Price</span>
            <span className="text-lg font-black text-slate-900 font-mono">
              ₹{parseFloat(product.base_price).toFixed(0)} <span className="text-xs text-slate-500 font-sans font-medium">({product.packaging_unit})</span>
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAddCase}
            disabled={added}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md ${
              added 
                ? 'bg-emerald-600 text-white' 
                : 'bg-[#FC8019] hover:bg-orange-600 text-white shadow-orange-500/25 active:scale-95'
            }`}
          >
            {added ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Added to Booking!</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Case to Cart</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
