import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { getPublicTicket } from "@/lib/api";
import type { PublicTicketResponse } from "@/shared/types";
import { AlertCircle, Download, Printer, Loader2 } from "lucide-react";

export const Route = createFileRoute("/ticket/$code")({
  head: () => ({
    meta: [
      {
        name: "robots",
        content: "noindex, nofollow",
      },
      {
        title: "Official Forum Ticket — Ethiopian Business & Investment Forum",
      },
    ],
  }),
  component: PublicTicketPage,
});

function PublicTicketPage() {
  const { code } = Route.useParams();
  const [ticketData, setTicketData] = useState<PublicTicketResponse["ticket"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    getPublicTicket(code)
      .then(async (res) => {
        if (!active) return;
        setTicketData(res.ticket);

        try {
          const dataUrl = await QRCode.toDataURL(res.ticket.ticketCode, {
            errorCorrectionLevel: "M",
            margin: 2,
            width: 280,
            color: {
              dark: "#0b1329",
              light: "#ffffff",
            },
          });
          if (active) setQrDataUrl(dataUrl);
        } catch (qrErr) {
          console.error("Failed to render QR on ticket page:", qrErr);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [code]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl || !ticketData) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `ticket-${ticketData.ticketCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-4 text-cream">
        <Loader2 size={32} className="animate-spin text-gold mb-3" />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mute">
          Verifying ticket credentials...
        </p>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center p-4 text-cream">
        <div className="max-w-md w-full border border-line bg-ink-2/60 p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border border-rose/40 bg-rose/10 flex items-center justify-center text-rose">
            <AlertCircle size={24} />
          </div>
          <h1 className="text-xl font-bold font-display text-cream mb-2">Ticket Not Found</h1>
          <p className="text-xs text-mute mb-6 leading-relaxed">
            The requested ticket code does not exist or may be invalid. Please check the link or contact the registration desk.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 border border-gold bg-gold/15 text-gold text-xs font-bold uppercase tracking-[0.14em] hover:bg-gold/25 transition-colors"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper py-8 px-4 flex flex-col items-center justify-center text-cream">
      {/* Top action bar (hidden during print) */}
      <div className="w-full max-w-lg mb-4 flex items-center justify-between no-print">
        <a
          href="/"
          className="text-xs text-mute hover:text-gold transition-colors uppercase tracking-[0.12em]"
        >
          &larr; Forum Homepage
        </a>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadQr}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] border border-line bg-ink text-mute hover:text-cream hover:border-gold transition-colors cursor-pointer"
          >
            <Download size={13} className="text-gold" />
            <span>Download QR</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] border border-gold bg-gold text-ink font-bold hover:bg-gold-2 transition-colors cursor-pointer"
          >
            <Printer size={13} />
            <span>Print Ticket</span>
          </button>
        </div>
      </div>

      {/* Official Ticket Card (Print Friendly) */}
      <div className="w-full max-w-lg border-2 border-gold/40 bg-ink shadow-2xl overflow-hidden print-ticket-card">
        {/* Ticket Header */}
        <div className="bg-gradient-to-b from-ink-2 to-ink border-b-2 border-gold/40 p-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold mb-1">
            Official Entry Ticket
          </p>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-cream leading-snug">
            {ticketData.eventName}
          </h1>
        </div>

        {/* QR Code and Ticket Code */}
        <div className="p-6 text-center border-b border-line/80 flex flex-col items-center bg-ink/60">
          {qrDataUrl && (
            <div className="border-2 border-gold/30 bg-white p-3 inline-block shadow-md">
              <img
                src={qrDataUrl}
                alt={`Ticket QR Code for ${ticketData.ticketCode}`}
                className="w-48 h-48 block"
              />
            </div>
          )}
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-mute">
            Ticket Code
          </p>
          <p className="mt-1 font-mono text-lg font-bold text-gold tracking-widest bg-ink-2 px-4 py-1.5 border border-line inline-block">
            {ticketData.ticketCode}
          </p>
        </div>

        {/* Attendee Details */}
        <div className="p-6 space-y-4 text-sm bg-ink">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-line/60">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mute">
                Attendee Name
              </p>
              <p className="mt-0.5 font-bold text-cream text-base">
                {ticketData.attendeeName}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mute">
                Attendee Type
              </p>
              <p className="mt-0.5 font-semibold text-gold">
                {ticketData.attendeeType}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mute">
                Dates
              </p>
              <p className="font-medium text-cream">{ticketData.dates}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mute">
                Venue
              </p>
              <p className="font-medium text-cream">{ticketData.venue}</p>
            </div>
          </div>
        </div>

        {/* Ticket Footer / Verification Note */}
        <div className="bg-ink-2/60 border-t border-line p-4 text-center text-[11px] text-mute">
          <p>
            Please present this QR code along with a valid ID at the registration desk for verification.
          </p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-ticket-card {
            box-shadow: none !important;
            border: 2px solid #000000 !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            max-width: 100% !important;
          }
          .print-ticket-card * {
            color: #000000 !important;
            background: transparent !important;
            border-color: #cccccc !important;
          }
        }
      `}</style>
    </div>
  );
}
