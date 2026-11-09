import React, { useState, useEffect, useRef } from 'react';
import {
  XMarkIcon,
  CameraIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface CourierBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipments: any[];
  onShipmentScanned: (shipment: any) => void;
}

export const CourierBarcodeScannerModal: React.FC<CourierBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  shipments,
  onShipmentScanned,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [supportsBarcodeDetector, setSupportsBarcodeDetector] = useState<boolean>(true);

  // Play subtle beep sound on scan success
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio not permitted or supported
    }

    // Trigger haptic vibration if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const handleMatchShipment = (code: string) => {
    // Clean code: remove invisible characters, spaces, and leading '#'
    const clean = code.trim().replace(/^#+/, '').toLowerCase();
    if (!clean) return;

    const matched = shipments.find((s) => {
      const orderNum = (s.order?.orderNumber || '').replace(/^#+/, '').toLowerCase();
      const tracking = (s.trackingNumber || '').replace(/^#+/, '').toLowerCase();
      const barcode = (s.barcode || '').replace(/^#+/, '').toLowerCase();
      const id = (s.id || '').toLowerCase();
      return orderNum === clean || tracking === clean || barcode === clean || id === clean;
    });

    if (matched) {
      playBeep();
      toast.success(`تم مطابقة الشحنة: ${matched.trackingNumber || matched.order?.orderNumber || 'الطلب'}`);
      onShipmentScanned(matched);
      handleClose();
    } else {
      toast.error(`الشحنة رقم (${code}) غير موجودة في مأمورية اليوم`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleMatchShipment(manualCode.trim());
      setManualCode('');
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setCameraError('المتصفح لا يدعم الوصول المباشر للكاميرا');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      // Race condition protection: if modal closed while awaiting getUserMedia
      if (!isMountedRef.current || !isOpen) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {
          // Play was prevented or aborted safely
        });
      }

      // Check BarcodeDetector availability
      if ('BarcodeDetector' in window) {
        setSupportsBarcodeDetector(true);
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'qr_code', 'upc_a'],
        });

        scanIntervalRef.current = setInterval(async () => {
          if (!isMountedRef.current) return;
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const detectedVal = barcodes[0].rawValue;
                if (detectedVal) {
                  clearInterval(scanIntervalRef.current);
                  handleMatchShipment(detectedVal);
                }
              }
            } catch (err) {
              // Frame scan error handled gracefully
            }
          }
        }, 300);
      } else {
        setSupportsBarcodeDetector(false);
      }
    } catch (err: any) {
      console.warn('Camera access denied or failed:', err);
      if (isMountedRef.current) {
        setHasCamera(false);
        setCameraError('يرجى منح إذن استخدام الكاميرا لمسح بوالص الشحن');
      }
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track.getCapabilities as any)?.()?.torch) {
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: !torchOn }],
        });
        setTorchOn(!torchOn);
      } catch (e) {
        // Torch not supported
      }
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-between p-4" dir="rtl">
      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between text-white pt-2 px-2">
        <div className="flex items-center gap-2">
          <CameraIcon className="w-6 h-6 text-sky-400" />
          <h2 className="text-sm font-bold">ماسح بوالص الشحن السريع</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTorch}
            aria-label="الفلاش"
            className={`p-2 rounded-full border transition ${
              torchOn ? 'bg-amber-400 text-slate-900 border-amber-300' : 'bg-white/10 text-white border-white/20'
            }`}
          >
            <BoltIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleClose}
            aria-label="إغلاق"
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Viewfinder Target */}
      <div className="relative w-full max-w-xs aspect-square my-auto rounded-3xl overflow-hidden border-2 border-sky-400/80 shadow-2xl bg-slate-950 flex items-center justify-center">
        {hasCamera ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-6 text-slate-400 flex flex-col items-center">
            <ExclamationCircleIcon className="w-12 h-12 text-amber-400 mb-2" />
            <p className="text-xs">{cameraError || 'الكاميرا غير متوفرة'}</p>
          </div>
        )}

        {/* Animated Scan Line */}
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-pulse pointer-events-none" />

        {/* Corner Guides */}
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-sky-400 rounded-tr-lg" />
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-sky-400 rounded-tl-lg" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-sky-400 rounded-br-lg" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-sky-400 rounded-bl-lg" />
      </div>

      {/* Manual Input Footer */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        {!supportsBarcodeDetector && (
          <p className="text-center text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/40 rounded-lg p-1.5">
            المسح الآلي غير مدعوم في هذا المتصفح، يرجى كتابة الرقم يدوياً بالأسفل.
          </p>
        )}
        <p className="text-center text-[11px] text-slate-400">
          وجّه كاميرا الهاتف نحو باركود الشحنة للتعرف التلقائي، أو أدخل الرقم يدوياً:
        </p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="رقم البوليصة أو كود الطلب..."
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
          >
            <CheckCircleIcon className="w-4 h-4" />
            تأكيد
          </button>
        </form>
      </div>
    </div>
  );
};

export default CourierBarcodeScannerModal;
