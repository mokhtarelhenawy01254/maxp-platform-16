import { useEffect, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// model-viewer (4.x) dropped STL/PLY loaders, so dental scan files (the most
// common lab formats) are rendered with three.js directly.
export default function DentalModelViewer({ url, ext }: { url: string; ext: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100000);
    camera.position.set(80, 80, 140);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(120, 160, 140);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-100, 40, -80);
    scene.add(fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.5;

    let cancelled = false;
    const disposables: Array<() => void> = [];

    const fitToObject = (obj: THREE.Object3D | THREE.BufferGeometry) => {
      const box = new THREE.Box3().setFromObject(obj as THREE.Object3D);
      if (box.isEmpty()) {
        const geom = (obj as THREE.Object3D).geometry as THREE.BufferGeometry | undefined;
        if (geom && geom.boundingBox) box.copy(geom.boundingBox);
      }
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const r = Math.max(sphere.radius, 1);
      camera.position.set(sphere.center.x + r * 2.2, sphere.center.y + r * 1.6, sphere.center.z + r * 2.6);
      camera.near = r / 100;
      camera.far = r * 100;
      camera.updateProjectionMatrix();
      controls.target.copy(sphere.center);
      controls.update();
    };

    const animate = () => {
      if (cancelled) return;
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const disposeMesh = (obj: THREE.Object3D) => {
      obj.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          (mesh.material as THREE.Material | THREE.Material[] | undefined)?.dispose?.();
        }
      });
    };

    if (ext === "obj") {
      const loader = new OBJLoader();
      loader.load(
        url,
        (obj) => {
          if (cancelled) return;
          obj.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh) {
              mesh.material = new THREE.MeshStandardMaterial({ color: 0xcfd6e3, metalness: 0.05, roughness: 0.5, flatShading: false });
            }
          });
          scene.add(obj);
          disposables.push(() => disposeMesh(obj));
          fitToObject(obj);
        },
        undefined,
        () => {
          if (!cancelled) {
            const err = document.createElement("div");
            err.className = "absolute inset-0 flex items-center justify-center text-red-500 text-sm p-4 text-center";
            err.textContent = "فشل تحميل النموذج. تأكد إن الملف صالح.";
            container.appendChild(err);
          }
        }
      );
    } else {
      const loader = ext === "ply" ? new PLYLoader() : new STLLoader();
      loader.load(
        url,
        (geometry) => {
          if (cancelled) return;
          const mat = new THREE.MeshStandardMaterial({ color: 0xd6dde8, metalness: 0.05, roughness: 0.45 });
          const mesh = new THREE.Mesh(geometry, mat);
          scene.add(mesh);
          disposables.push(() => { geometry.dispose(); mat.dispose(); });
          fitToObject(mesh);
        },
        undefined,
        () => {
          if (!cancelled) {
            const err = document.createElement("div");
            err.className = "absolute inset-0 flex items-center justify-center text-red-500 text-sm p-4 text-center";
            err.textContent = "فشل تحميل النموذج. تأكد إن الملف STL/PLY صالح.";
            container.appendChild(err);
          }
        }
      );
    }

    const onResize = () => {
      const w = container.clientWidth || width;
      const h = container.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      disposables.forEach((d) => d());
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
    };
  }, [url, ext]);

  return <div ref={containerRef} className="relative w-full h-full min-h-[500px]" />;
}