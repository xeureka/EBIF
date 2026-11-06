import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Html5Qrcode, type CameraDevice } from "html5-qrcode";
import { Camera, CameraOff, Copy, ShieldAlert, SwitchCamera } from "lucide-react";

interface QrScannerProps {
  onScan: (code: string) => void;
  disabled?: boolean;
}

interface CameraErrorInfo {
  name: string;
  message: string;
}

const CAMERA_CONSTRAINTS: MediaTrackConstraints[] = [
  { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
  { facingMode: "environment" },
  {},
];

function errorInfo(error: unknown): CameraErrorInfo {
  if (error instanceof DOMException)
    return { name: error.name || "DOMException", message: error.message || "" };
  if (error instanceof Error) return { name: error.name || "Error", message: error.message || "" };
  return { name: "UnknownError", message: String(error || "") };
}

function isInAppBrowser(userAgent: string): boolean {
  return (
    /FBAN|FBAV|Instagram|WhatsApp|Telegram|Line\/|TikTok|; wv\)/i.test(userAgent) ||
    (/(iPhone|iPad|iPod)/i.test(userAgent) && !/Safari/i.test(userAgent))
  );
}

function userAgentSummary(userAgent: string): string {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS browser";
  if (/SamsungBrowser/i.test(userAgent)) return "Samsung Internet";
  if (/EdgA|EdgiOS|Edge/i.test(userAgent)) return "Microsoft Edge";
  if (/Chrome|CriOS/i.test(userAgent)) return "Chrome";
  if (/Firefox|FxiOS/i.test(userAgent)) return "Firefox";
  if (/Safari/i.test(userAgent)) return "Safari";
  return "Other browser";
}

function cameraMessage(info: CameraErrorInfo): string {
  switch (info.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera permission was denied. Allow camera access for this site in your browser settings, then tap Try again. iPhone: Settings > Safari > Camera. Android: lock icon > Permissions > Camera.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera found on this device.";
    case "NotReadableError":
    case "TrackStartError":
      return "The camera is in use by another app or tab. Close it and try again.";
    case "SecurityError":
      return "Camera access was blocked by the browser security policy. Use an HTTPS connection and allow camera access for this site.";
    case "AbortError":
      return "Camera start was cancelled. Tap Try again.";
    default:
      return "Could not start the camera";
  }
}

export function QrScanner({ onScan, disabled = false }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastError, setLastError] = useState<CameraErrorInfo | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [currentCameraLabel, setCurrentCameraLabel] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScannedRef = useRef({ code: "", time: 0 });
  const startingRef = useRef(false);
  const containerId = "qr-reader-target";

  const inAppBrowser = useMemo(
    () => typeof navigator !== "undefined" && isInAppBrowser(navigator.userAgent),
    [],
  );

  const handleDecoded = useCallback(
    (decodedText: string) => {
      if (disabled) return;
      const clean = decodedText.trim();
      if (!clean) return;
      const now = Date.now();
      if (lastScannedRef.current.code === clean && now - lastScannedRef.current.time < 3000) return;
      lastScannedRef.current = { code: clean, time: now };
      onScan(clean);
    },
    [disabled, onScan],
  );

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current?.isScanning) await scannerRef.current.stop();
    } catch (error) {
      console.error("QR scanner stop error", error);
    } finally {
      stopTracks();
      setIsScanning(false);
    }
  }, [stopTracks]);

  const collectDiagnostics = useCallback(async (error: CameraErrorInfo | null = null) => {
    const mediaDevices = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    let permission = "unsupported";
    let videoInputs = "unavailable";
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      try {
        permission = (await navigator.permissions.query({ name: "camera" as PermissionName }))
          .state;
      } catch {
        permission = "unsupported";
      }
    }
    if (mediaDevices?.enumerateDevices) {
      try {
        videoInputs = String(
          (await mediaDevices.enumerateDevices()).filter((device) => device.kind === "videoinput")
            .length,
        );
      } catch {
        videoInputs = "unavailable";
      }
    }
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
    setDiagnostics([
      `Protocol: ${window.location.protocol}`,
      `Secure context: ${window.isSecureContext}`,
      `getUserMedia: ${typeof mediaDevices?.getUserMedia === "function"}`,
      `Camera permission: ${permission}`,
      `Video inputs: ${videoInputs}`,
      `Last error: ${error?.name || "none"}`,
      `Last error message: ${error?.message || "none"}`,
      `Browser: ${userAgentSummary(ua)}`,
    ]);
  }, []);

  const startScanner = useCallback(async () => {
    if (startingRef.current || disabled) return;
    startingRef.current = true;
    setErrorMsg(null);
    setLastError(null);
    if (!window.isSecureContext || typeof navigator.mediaDevices?.getUserMedia !== "function") {
      const info = { name: "SecurityError", message: "Secure context or mediaDevices unavailable" };
      setLastError(info);
      setErrorMsg("Camera needs a secure (https) connection.");
      await collectDiagnostics(info);
      startingRef.current = false;
      return;
    }
    try {
      await stopScanner();
      if (!scannerRef.current) scannerRef.current = new Html5Qrcode(containerId);
      let lastCameraError: CameraErrorInfo | null = null;
      for (const constraints of CAMERA_CONSTRAINTS) {
        try {
          await scannerRef.current.start(
            { facingMode: "environment" },
            {
              fps: 10,
              videoConstraints: constraints,
              qrbox: (width, height) => {
                const size = Math.max(160, Math.floor(Math.min(width, height) * 0.7));
                return { width: Math.min(size, width), height: Math.min(size, height) };
              },
            },
            handleDecoded,
            () => undefined,
          );
          const video = document.querySelector(`#${containerId} video`);
          if (video instanceof HTMLVideoElement) {
            video.playsInline = true;
            video.muted = true;
            video.autoplay = true;
            if (video.srcObject instanceof MediaStream) streamRef.current = video.srcObject;
          }
          setIsScanning(true);
          const cameras = await Html5Qrcode.getCameras().catch(() => []);
          setAvailableCameras(cameras);
          setCurrentCameraId(null);
          setCurrentCameraLabel(null);
          await collectDiagnostics();
          return;
        } catch (error) {
          lastCameraError = errorInfo(error);
          console.warn(
            "QR camera start attempt failed",
            lastCameraError.name,
            lastCameraError.message,
          );
          await stopScanner();
          if (lastCameraError.name !== "OverconstrainedError") break;
        }
      }
      if (!lastCameraError)
        lastCameraError = { name: "UnknownError", message: "No camera constraint succeeded" };
      console.error("QR camera unavailable", lastCameraError.name, lastCameraError.message);
      setLastError(lastCameraError);
      setErrorMsg(cameraMessage(lastCameraError));
      await collectDiagnostics(lastCameraError);
    } finally {
      startingRef.current = false;
    }
  }, [collectDiagnostics, disabled, handleDecoded, stopScanner]);

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || disabled) return;
    setErrorMsg(null);
    try {
      await stopScanner();
      if (!scannerRef.current) scannerRef.current = new Html5Qrcode(containerId);
      const decoded = await scannerRef.current.scanFile(file, false);
      handleDecoded(decoded);
    } catch (error) {
      const info = errorInfo(error);
      console.warn("QR photo decode failed", info.name, info.message);
      setLastError(info);
      setErrorMsg(
        "No QR code was found in that image. Try a clearer photo or enter the ticket code manually.",
      );
      await collectDiagnostics(info);
    }
  };

  const switchCamera = async () => {
    if (availableCameras.length <= 1 || startingRef.current) return;
    const currentIndex = availableCameras.findIndex((camera) => camera.id === currentCameraId);
    const nextCamera = availableCameras[(currentIndex + 1) % availableCameras.length];
    await stopScanner();
    try {
      if (!scannerRef.current) scannerRef.current = new Html5Qrcode(containerId);
      await scannerRef.current.start(
        nextCamera.id,
        { fps: 10, qrbox: 250 },
        handleDecoded,
        () => undefined,
      );
      setCurrentCameraId(nextCamera.id);
      setCurrentCameraLabel(nextCamera.label || "Selected camera");
      setIsScanning(true);
    } catch (error) {
      const info = errorInfo(error);
      console.error("QR camera switch error", info.name, info.message);
      setLastError(info);
      setErrorMsg(cameraMessage(info));
      await collectDiagnostics(info);
    }
  };

  const copyDiagnostics = async () => {
    await navigator.clipboard?.writeText(diagnostics.join("\n"));
  };

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) void stopScanner();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    void collectDiagnostics();
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void stopScanner();
    };
  }, [collectDiagnostics, stopScanner]);

  return (
    <div className="border border-line bg-ink-2/60 p-4 rounded-none">
      {inAppBrowser && (
        <div className="mb-3 border border-gold/40 bg-gold/10 p-3 text-xs text-cream">
          <p className="font-semibold text-gold">This in-app browser blocks the camera.</p>
          <p className="mt-1">Open this page in Safari (iPhone) or Chrome (Android).</p>
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(window.location.href)}
            className="mt-2 inline-flex min-h-11 items-center gap-2 border border-line px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-cream"
          >
            <Copy size={14} /> Copy link
          </button>
        </div>
      )}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Camera size={16} className="text-gold" />
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-cream">
            Camera QR Scanner
          </h3>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {isScanning && availableCameras.length > 1 && (
            <button
              type="button"
              onClick={() => void switchCamera()}
              className="inline-flex min-h-11 items-center gap-1 border border-line bg-ink px-3 text-xs font-semibold uppercase tracking-[0.12em] text-cream hover:border-gold"
            >
              <SwitchCamera size={14} />
              <span>Switch camera</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void (isScanning ? stopScanner() : startScanner())}
            className={`inline-flex min-h-11 items-center gap-2 border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${isScanning ? "border-rose/40 bg-rose/10 text-rose" : "border-gold/40 bg-gold/15 text-gold"}`}
          >
            {isScanning ? (
              <>
                <CameraOff size={14} /> Stop camera
              </>
            ) : (
              <>
                <Camera size={14} /> Start camera
              </>
            )}
          </button>
        </div>
      </div>
      <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden border border-line bg-ink">
        <div id={containerId} className="h-full w-full" />
        {!isScanning && !errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/90 p-6 text-center">
            <Camera size={24} className="mb-3 text-gold" />
            <p className="mb-1 text-xs font-medium text-cream">Camera is currently inactive</p>
            <p className="mb-4 max-w-xs text-[11px] text-mute">
              Tap Start camera, then position the attendee&apos;s QR ticket in the viewfinder.
            </p>
            <button
              type="button"
              onClick={() => void startScanner()}
              className="min-h-11 border border-gold/50 bg-gold/15 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-gold"
            >
              Start camera
            </button>
          </div>
        )}
        {errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/95 p-5 text-center">
            <ShieldAlert size={24} className="mb-3 text-rose" />
            <p className="mb-1 text-xs font-semibold text-rose">Camera unavailable</p>
            <p className="mb-1 max-w-sm text-[11px] text-mute">{errorMsg}</p>
            {lastError && (
              <p className="mb-3 max-w-sm text-[10px] text-mute/70">
                {lastError.name}
                {lastError.message ? `: ${lastError.message}` : ""}
              </p>
            )}
            <button
              type="button"
              onClick={() => void startScanner()}
              className="min-h-11 border border-line bg-ink-2 px-4 text-xs font-medium text-cream hover:border-gold"
            >
              Try again
            </button>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="truncate text-[10px] text-mute">
          {currentCameraLabel
            ? `Lens: ${currentCameraLabel}`
            : "Default: Rear Camera (auto-detected)"}
        </span>
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center border border-line bg-ink px-3 text-xs font-semibold uppercase tracking-[0.12em] text-cream hover:border-gold">
          Scan from photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => void handlePhoto(event)}
            className="sr-only"
          />
        </label>
      </div>
      <details
        className="mt-3 border-t border-line/60 pt-2"
        open={isDiagnosticsOpen}
        onToggle={(event) => setIsDiagnosticsOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">
          Camera diagnostics
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <pre className="overflow-x-auto whitespace-pre-wrap text-[10px] leading-5 text-mute">
            {diagnostics.join("\n") || "Collecting diagnostics…"}
          </pre>
          <button
            type="button"
            onClick={() => void copyDiagnostics()}
            className="inline-flex min-h-11 w-fit items-center gap-2 border border-line px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-cream hover:border-gold"
          >
            <Copy size={14} /> Copy diagnostics
          </button>
        </div>
      </details>
    </div>
  );
}
