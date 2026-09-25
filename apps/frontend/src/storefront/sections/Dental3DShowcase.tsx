import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { 
  Sparkles, 
  RotateCw, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  Zap, 
  Microscope,
  FileCheck,
  Truck
} from 'lucide-react';

interface Dental3DShowcaseProps {
  section?: { variant?: string; [key: string]: unknown };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    toleranceText?: string;
    materialText?: string;
    millingText?: string;
    turnaroundText?: string;
    ctaText?: string;
    ctaLink?: string;
    [key: string]: unknown;
  };
}

interface DentalShade {
  id: string;
  name: string;
  hex: string;
  bodyHex: string;
  cervicalHex: string;
  subsurface: string;
  roughness: number;
  metalness: number;
  description: string;
}

const SHADES: DentalShade[] = [
  { id: 'BL1', name: 'BL1 Hollywood', hex: '#FFFFFF', bodyHex: '#FAFAFA', cervicalHex: '#EDE6DD', subsurface: '#F0F7FF', roughness: 0.12, metalness: 0.02, description: 'أعلى درجات البياض التجميلي الناصع مع بريق لؤلؤي حيوي' },
  { id: 'BL3', name: 'BL3 Natural Bleach', hex: '#FBFBFA', bodyHex: '#F2ECE2', cervicalHex: '#E5D6C3', subsurface: '#F8F6F0', roughness: 0.14, metalness: 0.02, description: 'تبييض طبيعي متناسق ومشرق غير مصطنع' },
  { id: 'A1', name: 'A1 Classic Ivory', hex: '#F7F5EE', bodyHex: '#EBDDCB', cervicalHex: '#D8C3A5', subsurface: '#EFEADB', roughness: 0.15, metalness: 0.02, description: 'عاجي ناصع كلاسيكي يناسب الأسنان الشابة' },
  { id: 'A2', name: 'A2 Natural Standard', hex: '#EFE9DC', bodyHex: '#E2CEB5', cervicalHex: '#CCAFA2', subsurface: '#E6DCC9', roughness: 0.16, metalness: 0.02, description: 'الدرجة الطبيعية الأكثر شيوعاً ومطابقة لـ 80% من المرضى' },
  { id: 'B1', name: 'B1 High Luminosity', hex: '#F9F7F1', bodyHex: '#EDE2D0', cervicalHex: '#DECBB0', subsurface: '#F2ECE0', roughness: 0.13, metalness: 0.02, description: 'درجة صفراء منخفضة مع شفافية وانعكاس ضوئي فائق' },
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'استقبال الـ 3D Scan',
    desc: 'استيراد ملفات STL وPLY مباشرة من أي ماسح فموي (iTero, 3Shape, Medit) خلال ثوانٍ.',
    icon: FileCheck,
    tag: 'Cloud Sync',
  },
  {
    step: '02',
    title: 'هندسة الابتسامة CAD',
    desc: 'تصميم تشريح السن ثلاثي الأبعاد بدقة ميكرونية فائقة وضبط خط الإنهاء والإطباق بدقة ±5µm.',
    icon: Cpu,
    tag: 'Sub-Micron CAD',
  },
  {
    step: '03',
    title: 'تفريز خماسي المحاور 5-Axis',
    desc: 'خراطة دقيقة لأقراص الزيركون متعددة الطبقات (Multilayer) أو حقن زجاج الإيماكس المتطور.',
    icon: Zap,
    tag: '5-Axis Milling',
  },
  {
    step: '04',
    title: 'التشكيل الخزفي والتزجيج',
    desc: 'لمسات فنية يدوية من كبار الخزافين لمحاكاة شفافية حافة السن الطبيعية والانعكاس الخزفي.',
    icon: Microscope,
    tag: 'Artisan Glaze',
  },
  {
    step: '05',
    title: 'الفحص المجهري والتسليم',
    desc: 'معاينة تحت المجهر الإلكتروني للتأكد من انطباق الحواف والتعبئة المعقمة للشحن للعيادة.',
    icon: Truck,
    tag: 'QC & Express',
  },
];

const Dental3DShowcase: React.FC<Dental3DShowcaseProps> = ({ settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeShade, setActiveShade] = useState<DentalShade>(SHADES[0]);
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [materialType] = useState<'zirconia' | 'emax' | 'titanium'>('zirconia');
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [viewAngle, setViewAngle] = useState<'perspective' | 'occlusal' | 'buccal'>('perspective');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [hudStats, setHudStats] = useState({
    microns: 4.8,
    strength: 1250,
    fitScore: 99.8,
  });

  const targetCamPosRef = useRef(new THREE.Vector3(0, 1.8, 16));
  const targetLookRef = useRef(new THREE.Vector3(0, 0.4, 0));

  const changeViewAngle = (angle: 'perspective' | 'occlusal' | 'buccal') => {
    setViewAngle(angle);
    if (angle === 'perspective') {
      targetCamPosRef.current.set(0, 1.8, 16);
      targetLookRef.current.set(0, 0.4, 0);
    } else if (angle === 'occlusal') {
      targetCamPosRef.current.set(0, 16, 0.05);
      targetLookRef.current.set(0, 0.8, 0);
    } else if (angle === 'buccal') {
      targetCamPosRef.current.set(16, 0.4, 0);
      targetLookRef.current.set(0, 0.4, 0);
    }
  };

  const badge = settings?.badge || 'Digital CAD/CAM Laboratory 2026';
  const title = settings?.title || 'معاينة التركيبات ثلاثية الأبعاد بدقة الميكرون';
  const subtitle = settings?.subtitle || 'اختبر دقة محاكاة الخزف الرقمي، وتدرج شفافية الزيركون وتطابق الألوان بدقة هندسية حقيقية قبل بدء التفريز.';

  // Three.js scene setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animId: number;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.copy(targetCamPosRef.current);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.replaceChildren(renderer.domElement);

    // Studio Dental Environment & Lighting
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnv).texture;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(12, 22, 18);
    scene.add(keyLight);

    const cyanRimLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    cyanRimLight.position.set(-18, -8, -14);
    scene.add(cyanRimLight);

    const warmFillLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    warmFillLight.position.set(0, -12, 14);
    scene.add(warmFillLight);

    // Translucent ceramic back-light
    const backLight = new THREE.DirectionalLight(0xffffff, 1.1);
    backLight.position.set(0, 4, -14);
    scene.add(backLight);

    // Create realistic procedural multilayer canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 512, 0, 0);
      grad.addColorStop(0.0, activeShade.cervicalHex);
      grad.addColorStop(0.35, activeShade.bodyHex);
      grad.addColorStop(0.75, activeShade.hex);
      grad.addColorStop(1.0, '#ffffff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 512);
    }
    const multilayerTexture = new THREE.CanvasTexture(canvas);

    // Create high-precision procedural anatomical Molar / Crown model
    const group = new THREE.Group();

    // 1. Tooth Crown Body (High-tessellation sculpted anatomical molar)
    const crownGeometry = new THREE.CylinderGeometry(3.6, 2.7, 5.4, 64, 48);
    const pos = crownGeometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // normY: 0 (cervical margin) to 1 (occlusal table)
      const normY = (y + 2.7) / 5.4;

      // Natural rounded-cuboid molar cross section
      const angle = Math.atan2(z, x);
      const aspect = 1.0 + 0.12 * Math.cos(angle * 2);
      x *= aspect;
      z *= (2.0 - aspect);

      // Cervical waist vs middle third contour bulge
      if (normY < 0.42) {
        const cervicalTaper = 0.88 + Math.sin(normY * Math.PI * 1.1) * 0.18;
        x *= cervicalTaper;
        z *= cervicalTaper;
      } else {
        const middleBulge = 1.0 + Math.sin((normY - 0.42) * Math.PI) * 0.08;
        x *= middleBulge;
        z *= middleBulge;
      }

      // Occlusal Anatomy (Cusps & Fissures)
      if (normY > 0.65) {
        const topWeight = Math.pow((normY - 0.65) / 0.35, 1.6);
        const distFromCenter = Math.sqrt(x * x + z * z);
        
        // 4 Anatomical Cusps
        const dMB = Math.hypot(x - (-1.4), z - 1.2);
        const cuspMB = Math.exp(-dMB * 1.3) * 1.05;

        const dDB = Math.hypot(x - 1.3, z - 1.1);
        const cuspDB = Math.exp(-dDB * 1.4) * 0.9;

        const dML = Math.hypot(x - (-1.3), z - (-1.3));
        const cuspML = Math.exp(-dML * 1.2) * 1.2;

        const dDL = Math.hypot(x - 1.2, z - (-1.2));
        const cuspDL = Math.exp(-dDL * 1.3) * 0.85;

        // Central fossa depression & cross fissures
        const centralFossa = Math.exp(-distFromCenter * 1.35) * 0.7;
        const grooveX = Math.exp(-Math.abs(z) * 2.5) * 0.3;
        const grooveZ = Math.exp(-Math.abs(x) * 2.5) * 0.3;

        const elevation = (cuspMB + cuspDB + cuspML + cuspDL - centralFossa - (grooveX + grooveZ) * 0.5) * topWeight;
        y += elevation;

        // Marginal ridge inward curve
        if (normY > 0.90 && distFromCenter < 2.2) {
          y -= (1 - distFromCenter / 2.2) * 0.4 * topWeight;
        }
      }

      pos.setXYZ(i, x, y, z);
    }
    crownGeometry.computeVertexNormals();

    const crownMaterial = new THREE.MeshPhysicalMaterial({
      map: multilayerTexture,
      roughness: 0.12,
      metalness: 0.02,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transmission: materialType === 'emax' ? 0.35 : 0.20,
      ior: 1.54,
      thickness: 2.2,
      wireframe: wireframeMode,
    });

    const crownMesh = new THREE.Mesh(crownGeometry, crownMaterial);
    crownMesh.position.y = 1.0;
    group.add(crownMesh);

    // 2. Margin Line Indicator Ring (Laser precision line)
    const marginRingGeom = new THREE.TorusGeometry(2.78, 0.045, 16, 64);
    marginRingGeom.rotateX(Math.PI / 2);
    const marginRingMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: false,
    });
    const marginRingMesh = new THREE.Mesh(marginRingGeom, marginRingMat);
    marginRingMesh.position.y = -1.6;
    group.add(marginRingMesh);

    // 3. Dynamic Laser Scanner Ring (Oscillates during CAD scan)
    const scannerRingGeom = new THREE.TorusGeometry(3.68, 0.035, 16, 64);
    scannerRingGeom.rotateX(Math.PI / 2);
    const scannerRingMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const scannerRingMesh = new THREE.Mesh(scannerRingGeom, scannerRingMat);
    scannerRingMesh.position.y = 1.0;
    group.add(scannerRingMesh);

    // 4. Abutment / Base Foundation
    const abutmentGeom = new THREE.CylinderGeometry(2.65, 2.1, 2.6, 32);
    const abutmentMat = new THREE.MeshStandardMaterial({
      color: materialType === 'titanium' ? 0x94a3b8 : 0xd4d4d8,
      metalness: materialType === 'titanium' ? 0.88 : 0.25,
      roughness: 0.25,
    });
    const abutmentMesh = new THREE.Mesh(abutmentGeom, abutmentMat);
    abutmentMesh.position.y = -2.8;
    group.add(abutmentMesh);

    scene.add(group);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = isRotating;
    controls.autoRotateSpeed = 2.0;
    controls.enableZoom = true;
    controls.minDistance = 8;
    controls.maxDistance = 35;
    controls.maxPolarAngle = Math.PI / 2 + 0.3;
    controls.target.copy(targetLookRef.current);

    controls.addEventListener('start', () => {
      targetCamPosRef.current.copy(camera.position);
      targetLookRef.current.copy(controls.target);
    });

    const clock = new THREE.Clock();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Gentle floating animation centered in viewport
      group.position.y = 0.35 + Math.sin(elapsed * 1.5) * 0.2;

      // Laser scanner vertical oscillation
      scannerRingMesh.position.y = 0.8 + Math.sin(elapsed * 2.2) * 2.5;
      scannerRingMat.opacity = wireframeMode ? 0.95 : 0.5 + Math.sin(elapsed * 3) * 0.25;

      // Smooth camera interpolation to target preset
      camera.position.lerp(targetCamPosRef.current, 0.06);
      controls.target.lerp(targetLookRef.current, 0.06);

      controls.autoRotate = isRotating && viewAngle === 'perspective';
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      crownGeometry.dispose();
      crownMaterial.dispose();
      marginRingGeom.dispose();
      marginRingMat.dispose();
      scannerRingGeom.dispose();
      scannerRingMat.dispose();
      abutmentGeom.dispose();
      abutmentMat.dispose();
      multilayerTexture.dispose();
      pmremGenerator.dispose();
    };
  }, [activeShade, wireframeMode, materialType, isRotating, viewAngle]);

  useEffect(() => {
    const timer = setInterval(() => {
      setHudStats({
        microns: +(4.5 + Math.random() * 0.7).toFixed(1),
        strength: materialType === 'emax' ? 530 : materialType === 'titanium' ? 950 : 1250,
        fitScore: +(99.6 + Math.random() * 0.3).toFixed(1),
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [materialType]);

  return (
    <section id="dental-3d" className="relative w-full overflow-hidden bg-gradient-to-b from-[#060913] via-[#0A101E] to-[#060913] py-16 md:py-24 text-white">
      {/* Blueprint Grid Background Pattern */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(circle, #38bdf8 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Dynamic Background Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[150px]" />

      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12 text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-cyan-400 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-cyan-300" />
            <span>{badge}</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-4xl lg:text-[2.65rem] font-bold tracking-tight text-white leading-tight">
            {title}
          </h2>
          <p className="mx-auto max-w-3xl text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Main 3D Showcase Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-center">
          {/* Left / 3D Canvas Stage (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* 3D Canvas Container */}
            <div className="relative w-full aspect-[4/3] max-w-[620px] rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900/90 to-slate-950/90 shadow-[0_20px_60px_-15px_rgba(6,182,212,0.2)] backdrop-blur-xl overflow-hidden">
              
              {/* HUD Header Bar */}
              <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 z-10 flex items-center justify-between gap-1.5 sm:gap-2 pointer-events-none">
                <div className="flex items-center gap-1.5 rounded-lg bg-black/70 px-2 py-1 sm:px-2.5 sm:py-1.5 border border-cyan-500/30 backdrop-blur-md pointer-events-auto">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  <span className="text-[9px] sm:text-[11px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
                    3D CAD Live
                  </span>
                </div>

                {/* Center / Camera Presets */}
                <div className="flex items-center rounded-lg bg-black/70 p-0.5 border border-slate-700/80 backdrop-blur-md pointer-events-auto">
                  <button
                    onClick={() => changeViewAngle('perspective')}
                    title="منظور حر"
                    className={`rounded-md px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-[11px] font-semibold transition-all ${
                      viewAngle === 'perspective'
                        ? 'bg-cyan-500/30 text-cyan-300 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    3D حر
                  </button>
                  <button
                    onClick={() => changeViewAngle('occlusal')}
                    title="عرض إطباقي"
                    className={`rounded-md px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-[11px] font-semibold transition-all ${
                      viewAngle === 'occlusal'
                        ? 'bg-cyan-500/30 text-cyan-300 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    إطباقي
                  </button>
                  <button
                    onClick={() => changeViewAngle('buccal')}
                    title="عرض جانبي"
                    className={`rounded-md px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-[11px] font-semibold transition-all ${
                      viewAngle === 'buccal'
                        ? 'bg-cyan-500/30 text-cyan-300 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    جانبي
                  </button>
                </div>

                {/* Right / Quick Toggles */}
                <div className="flex items-center gap-1 pointer-events-auto">
                  <button
                    onClick={() => setIsRotating(!isRotating)}
                    title="تشغيل/إيقاف الدوران التلقائي"
                    className={`rounded-lg border px-1.5 py-1 sm:px-2 sm:py-1 text-[9px] sm:text-xs font-semibold transition-all ${
                      isRotating
                        ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                        : 'border-slate-700 bg-slate-800/80 text-slate-400'
                    }`}
                  >
                    <RotateCw className={`h-3 w-3 inline ${isRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
                    <span className="hidden sm:inline mr-1">360°</span>
                  </button>
                  <button
                    onClick={() => setWireframeMode(!wireframeMode)}
                    title="فحص شبكة الـ Mesh"
                    className={`rounded-lg border px-1.5 py-1 sm:px-2 sm:py-1 text-[9px] sm:text-xs font-semibold transition-all ${
                      wireframeMode
                        ? 'border-cyan-400 bg-cyan-500/30 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                        : 'border-slate-700 bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <Layers className="h-3 w-3 inline" />
                    <span className="hidden sm:inline mr-1">Mesh</span>
                  </button>
                </div>
              </div>

              {/* 3D WebGL Element */}
              <div 
                ref={containerRef} 
                className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center"
              />

              {/* HUD Telemetry Footer Inside Canvas */}
              <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 right-2.5 sm:right-3 z-10 grid grid-cols-3 gap-1.5 sm:gap-2 pointer-events-none">
                <div className="rounded-lg border border-slate-800 bg-black/75 p-1.5 sm:p-2 text-center backdrop-blur-md">
                  <div className="text-[10px] sm:text-xs text-slate-400 font-medium">دقة التفريز</div>
                  <div className="text-xs sm:text-sm font-bold font-mono text-cyan-400">
                    ±{hudStats.microns} µm
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-black/75 p-1.5 sm:p-2 text-center backdrop-blur-md">
                  <div className="text-[10px] sm:text-xs text-slate-400 font-medium">قوة التحمل</div>
                  <div className="text-xs sm:text-sm font-bold font-mono text-white">
                    {hudStats.strength} MPa
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-black/75 p-1.5 sm:p-2 text-center backdrop-blur-md">
                  <div className="text-[10px] sm:text-xs text-slate-400 font-medium">تطابق فوري</div>
                  <div className="text-xs sm:text-sm font-bold font-mono text-emerald-400">
                    {hudStats.fitScore}%
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Shade Selector Bar */}
            <div className="mt-5 w-full max-w-[620px] rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:p-3.5 backdrop-blur-md">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-[11px] sm:text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  محاكي تدرج الألوان (VITA):
                </span>
                <span className="font-mono text-cyan-400 font-bold text-xs sm:text-sm">{activeShade.name}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {SHADES.map((shade) => (
                  <button
                    key={shade.id}
                    onClick={() => setActiveShade(shade)}
                    className={`group flex flex-col items-center gap-1 rounded-lg border p-1.5 sm:p-2 transition-all ${
                      activeShade.id === shade.id
                        ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                    }`}
                  >
                    <span 
                      className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border border-slate-400 shadow-inner group-hover:scale-110 transition-transform" 
                      style={{ backgroundColor: shade.hex }}
                    />
                    <span className={`text-[10px] sm:text-[11px] font-bold ${activeShade.id === shade.id ? 'text-cyan-300' : 'text-slate-400'}`}>
                      {shade.id}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] sm:text-[11px] text-slate-400 text-center">
                {activeShade.description}
              </p>
            </div>
          </div>

          {/* Right / Digital Workflow & Lab Credentials (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-400" />
                  دورة العمل الرقمية المتكاملة
                </h3>
                <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[11px] font-bold text-cyan-300">
                  Fully Automated
                </span>
              </div>

              {/* Workflow Stepper */}
              <div className="space-y-3">
                {WORKFLOW_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isActive = activeStep === idx;
                  return (
                    <div
                      key={step.step}
                      onClick={() => setActiveStep(idx)}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                        isActive
                          ? 'border-cyan-500/60 bg-gradient-to-r from-cyan-950/50 to-slate-900/80 shadow-md'
                          : 'border-slate-800/80 bg-slate-950/30 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                          isActive 
                            ? 'border-cyan-400 bg-cyan-500 text-slate-950 font-black' 
                            : 'border-slate-800 bg-slate-900 text-slate-400'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-200'}`}>
                              {step.title}
                            </h4>
                            <span className="text-[10px] font-mono text-cyan-400 font-bold">
                              {step.tag}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Doctor CTA Card */}
            <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-blue-950/40 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-right">
                <div className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-cyan-400" />
                  ضمان استبدال وإعادة تصنيع 5 سنوات
                </div>
                <div className="text-xs text-slate-300">
                  شهادات مطابقة بيولوجية معتمدة لكل حالة مع كود تتبع رسمي.
                </div>
              </div>
              <a
                href={settings?.ctaLink || '/contact'}
                className="w-full sm:w-auto shrink-0 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm px-4 py-2.5 text-center transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                {settings?.ctaText || 'طلب كيت عينات للعيادة 📦'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dental3DShowcase;
