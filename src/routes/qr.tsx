import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer, QrCode } from "lucide-react";
import { event } from "@/data/event";

const REGISTER_URL = "https://ebif.nexabusinessgroup.com/?register=1";

export const Route = createFileRoute("/qr")({
  head: () => ({
    meta: [
      { title: "Registration QR — Ethiopian Business & Investment Forum" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QrPosterPage,
});

function QrPosterPage() {
  return (
    <div className="min-h-screen bg-paper text-cream print:bg-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-5 py-10 print:py-0">
        <div className="flex w-full flex-wrap items-center justify-center gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-ink transition-opacity hover:opacity-90"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print poster
          </button>
          <a
            href="/qr/registration-qr.png"
            download="ebif-registration-qr.png"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-5 py-2.5 text-sm font-medium transition-colors hover:border-gold hover:text-gold"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download PNG
          </a>
          <a
            href="/qr/registration-qr.svg"
            download="ebif-registration-qr.svg"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-5 py-2.5 text-sm font-medium transition-colors hover:border-gold hover:text-gold"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download SVG
          </a>
        </div>

        <article className="w-full overflow-hidden rounded-3xl border border-line bg-panel shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="flex flex-col items-center gap-8 px-8 py-12 text-center sm:px-14 sm:py-16 print:gap-6 print:px-10 print:py-10">
            <img
              src="/images/LOGO.png"
              alt="Ethiopian Business & Investment Forum"
              className="h-20 w-20 rounded-full border border-line bg-white object-cover"
            />

            <div className="flex flex-col gap-3">
              <p className="text-[11px] uppercase tracking-[0.32em] text-gold">Register to attend</p>
              <h1 className="font-display text-4xl leading-[1.05] sm:text-5xl print:text-4xl">
                {event.name}
              </h1>
              <p className="text-sm uppercase tracking-[0.2em] text-mute">
                {event.dates} · {event.venueWithCity}
              </p>
            </div>

            <div className="flex flex-col items-center gap-5">
              <div className="rounded-3xl border border-line bg-white p-4 sm:p-6">
                <img
                  src="/qr/registration-qr.svg"
                  alt={`QR code linking to ${REGISTER_URL}`}
                  className="h-56 w-56 sm:h-72 sm:w-72 print:h-64 print:w-64"
                />
              </div>
              <div className="flex items-center gap-2 text-gold">
                <QrCode className="h-5 w-5" aria-hidden="true" />
                <p className="text-sm font-medium uppercase tracking-[0.22em]">Scan to register</p>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-mute">
                Open your phone camera, point it at the code, and complete the short form. You will
                receive a confirmation email with your entry pass.
              </p>
            </div>

            <div className="w-full border-t border-line pt-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-mute">Or visit</p>
              <p className="mt-2 break-all text-sm font-medium text-cream">{REGISTER_URL}</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
