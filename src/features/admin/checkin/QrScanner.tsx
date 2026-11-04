import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, type CameraDevice } from "html5-qrcode";
import { Camera, CameraOff, ShieldAlert, SwitchCamera } from "lucide-react";

interface QrScannerProps {
  onScan: (code: string) => void;
  disabled?: boolean;
}

export function QrScanner({ onScan, disabled = false }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [currentCameraLabel, setCurrentCameraLabel] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });
  const containerId = "qr-reader-target";

  // Throttled scan handler: prevents repeated submits of the same code within 3 seconds
  const handleDecoded = (decodedText: string) => {
    if (disabled) return;
    const clean = decodedText.trim();
    const now = Date.now();

    if (lastScannedRef.current.code === clean && now - lastScannedRef.current.time < 3000) {
      return;
    }

    lastScannedRef.current = { code: clean, time: now };
    onScan(clean);
  };

  const getCandidateConfigs = async (
    targetCameraId?: string
  ): Promise<Array<string | MediaTrackConstraints>> => {
    if (targetCameraId) {
      return [targetCameraId];
    }

    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setAvailableCameras(devices);

        // Find rear camera by label if available
        const backCamera = devices.find((d) =>
          /back|rear|environment|trás|hinten|arriere/i.test(d.label)
        );

        if (backCamera) {
          return [
            backCamera.id,
            { facingMode: "environment" },
            devices[devices.length - 1].id,
            devices[0].id,
            { facingMode: "user" },
          ];
        }

        // If labels are empty/unhelpful (pre-permission), try facingMode, then device IDs
        return [
          { facingMode: "environment" },
          devices[devices.length - 1].id,
          devices[0].id,
          { facingMode: "user" },
        ];
      }
    } catch (e) {
      console.warn("Html5Qrcode.getCameras failed, falling back to facingMode constraints:", e);
    }

    return [{ facingMode: "environment" }, { facingMode: "user" }];
  };

  const startScanner = async (targetCameraId?: string) => {
    setErrorMsg(null);

    const isHttps =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!isHttps) {
      setErrorMsg("Camera access requires HTTPS or localhost. Please ensure a secure context or use manual code entry.");
      return;
    }

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId);
      }

      // If already scanning, stop cleanly first
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      const candidates = await getCandidateConfigs(targetCameraId);
      let started = false;
      let lastErr: unknown = null;

      const scanConfig = {
        fps: 10,
        // Responsive qrbox based on actual viewfinder dimensions to avoid OverconstrainedError
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(minEdge * 0.7);
          return {
            width: Math.max(160, size),
            height: Math.max(160, size),
          };
        },
      };

      for (const config of candidates) {
        try {
          await scannerRef.current.start(
            config,
            scanConfig,
            (decodedText) => handleDecoded(decodedText),
            () => {
              // Frame parse failure is normal while scanning
            }
          );
          started = true;

          // Track the active camera ID/label
          if (typeof config === "string") {
            setCurrentCameraId(config);
          }
          break;
        } catch (err) {
          lastErr = err;
          console.warn("Failed to start camera with config:", config, err);
        }
      }

      if (started) {
        setIsScanning(true);

        // Refresh camera list now that permissions are granted to get real labels
        try {
          const refreshed = await Html5Qrcode.getCameras();
          if (refreshed && refreshed.length > 0) {
            setAvailableCameras(refreshed);
            const active = refreshed.find((c) => c.id === currentCameraId);
            if (active && active.label) {
              setCurrentCameraLabel(active.label);
            }
          }
        } catch {
          // ignore
        }
      } else {
        throw lastErr || new Error("Failed to start any available camera");
      }
    } catch (err: unknown) {
      console.error("Camera startup error:", err);
      setIsScanning(false);

      if (err instanceof Error && err.name === "NotAllowedError") {
        setErrorMsg("Camera permission was denied. Please allow camera access in your browser settings to scan QR tickets.");
      } else if (err instanceof Error && err.name === "NotFoundError") {
        setErrorMsg("No camera detected on this device. You can still check in attendees via manual code entry or search below.");
      } else if (err instanceof Error && (err.name === "NotReadableError" || err.name === "TrackStartError")) {
        setErrorMsg("Camera is in use by another app or tab. Please close other camera apps and try again.");
      } else if (err instanceof Error && err.name === "OverconstrainedError") {
        setErrorMsg("Camera hardware constraints could not be satisfied on this device. Please try again or enter the ticket code manually.");
      } else {
        setErrorMsg("Unable to access camera. Please verify permissions or enter the ticket code manually.");
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setIsScanning(false);
  };

  const switchCamera = async () => {
    if (availableCameras.length <= 1) return;

    const currentIndex = availableCameras.findIndex((c) => c.id === currentCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];

    await stopScanner();
    setCurrentCameraId(nextCamera.id);
    setCurrentCameraLabel(nextCamera.label);
    await startScanner(nextCamera.id);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((e) => console.error("Unmount scanner stop error:", e));
      }
    };
  }, []);

  return (
    <div className="border border-line bg-ink-2/60 p-4 rounded-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera size={16} className="text-gold" />
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-cream">
            Camera QR Scanner
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isScanning && availableCameras.length > 1 && (
            <button
              type="button"
              onClick={switchCamera}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] border border-line bg-ink text-cream hover:border-gold transition-colors cursor-pointer"
              title="Switch Camera Lens"
            >
              <SwitchCamera size={14} />
              <span className="hidden sm:inline">Flip</span>
            </button>
          )}
          <button
            type="button"
            onClick={isScanning ? stopScanner : () => startScanner()}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] border transition-colors cursor-pointer ${
              isScanning
                ? "border-rose/40 bg-rose/10 text-rose hover:bg-rose/20"
                : "border-gold/40 bg-gold/15 text-gold hover:bg-gold/25"
            }`}
          >
            {isScanning ? (
              <>
                <CameraOff size={14} />
                <span>Stop Camera</span>
              </>
            ) : (
              <>
                <Camera size={14} />
                <span>Start Camera</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Camera Viewport or Placeholder */}
      <div className="relative aspect-square max-h-[300px] sm:max-h-[340px] w-full mx-auto overflow-hidden bg-ink border border-line flex items-center justify-center">
        <div id={containerId} className="w-full h-full" />

        {!isScanning && !errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-ink/90">
            <div className="w-12 h-12 mb-3 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center text-gold">
              <Camera size={24} />
            </div>
            <p className="text-xs font-medium text-cream mb-1">Camera is currently inactive</p>
            <p className="text-[11px] text-mute mb-4 max-w-xs">
              Position attendee's QR ticket in front of the camera for instant check-in.
            </p>
            <button
              type="button"
              onClick={() => startScanner()}
              className="px-4 py-2 border border-gold/50 bg-gold/15 text-gold text-xs font-semibold uppercase tracking-[0.12em] hover:bg-gold/25 transition-colors cursor-pointer"
            >
              Enable Scanner
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-ink/95">
            <div className="w-12 h-12 mb-3 rounded-full border border-rose/30 bg-rose/10 flex items-center justify-center text-rose">
              <ShieldAlert size={24} />
            </div>
            <p className="text-xs font-semibold text-rose mb-1">Camera Unavailable</p>
            <p className="text-[11px] text-mute mb-4 max-w-xs">{errorMsg}</p>
            <button
              type="button"
              onClick={() => startScanner()}
              className="px-4 py-2 border border-line bg-ink-2 text-cream text-xs font-medium hover:border-gold transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[10px] text-mute">
        <span className="truncate max-w-[200px] sm:max-w-none">
          {currentCameraLabel
            ? `Lens: ${currentCameraLabel}`
            : "Default: Rear Camera (auto-detected)"}
        </span>
        <span>Rate limit: 1 scan per 3s</span>
      </div>
    </div>
  );
}
