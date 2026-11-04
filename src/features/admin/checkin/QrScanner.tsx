import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, ShieldAlert } from "lucide-react";

interface QrScannerProps {
  onScan: (code: string) => void;
  disabled?: boolean;
}

export function QrScanner({ onScan, disabled = false }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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

  const startScanner = async () => {
    setErrorMsg(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId);
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDecoded(decodedText);
        },
        () => {
          // Frame parse failure is normal while scanning
        },
      );

      setIsScanning(true);
    } catch (err: unknown) {
      console.error("Camera startup error:", err);
      setIsScanning(false);
      const isHttps = window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (!isHttps) {
        setErrorMsg("Camera access requires HTTPS or localhost. Please ensure a secure context or use manual code entry.");
      } else if (err instanceof Error && err.name === "NotAllowedError") {
        setErrorMsg("Camera permission was denied. Please allow camera access in your browser settings to scan QR tickets.");
      } else if (err instanceof Error && err.name === "NotFoundError") {
        setErrorMsg("No camera detected on this device. You can still check in attendees via manual code entry or search below.");
      } else {
        setErrorMsg("Unable to access camera. Please verify permissions or enter the ticket code manually.");
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setIsScanning(false);
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
        <button
          type="button"
          onClick={isScanning ? stopScanner : startScanner}
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
              Position attendee's QR ticket in front of the rear camera for instant check-in.
            </p>
            <button
              type="button"
              onClick={startScanner}
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
              onClick={startScanner}
              className="px-4 py-2 border border-line bg-ink-2 text-cream text-xs font-medium hover:border-gold transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[10px] text-mute">
        <span>Default: Rear Camera (facingMode: environment)</span>
        <span>Rate limit: 1 scan per 3s</span>
      </div>
    </div>
  );
}
