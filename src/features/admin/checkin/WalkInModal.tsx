import { useState, type FormEvent } from "react";
import { Modal } from "../components/Modal";
import { registerWalkIn } from "@/lib/api";
import { ATTENDEE_TYPES } from "@/shared/schemas";
import type { CheckInResponse, AttendeeType } from "@/shared/types";
import { UserPlus, AlertCircle, Loader2 } from "lucide-react";

interface WalkInModalProps {
  open: boolean;
  onClose: () => void;
  day: 1 | 2;
  onSuccess: (response: CheckInResponse) => void;
}

const ATTENDEE_TYPE_LABELS: Record<string, string> = {
  company: "Company",
  investor: "Investor",
  government: "Government Institution",
  international_partner: "International Partner",
};

export function WalkInModal({ open, onClose, day, onSuccess }: WalkInModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [attendeeType, setAttendeeType] = useState<string>("company");
  const [agreesToContact, setAgreesToContact] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("A valid email address is required.");
      return;
    }
    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (!/^[97]\d{8}$/.test(cleanPhone)) {
      setError("Phone number must be 9 digits starting with 9 or 7 (e.g. 911234567).");
      return;
    }
    if (!organization.trim()) {
      setError("Organization name is required.");
      return;
    }
    if (!jobTitle.trim()) {
      setError("Job title is required.");
      return;
    }
    if (!agreesToContact) {
      setError("Attendee must agree to be contacted.");
      return;
    }

    setLoading(true);
    try {
      const res = await registerWalkIn({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        organization: organization.trim(),
        jobTitle: jobTitle.trim(),
        attendeeType: attendeeType as AttendeeType,
        agreesToContact: true,
        day,
      });

      // Reset form
      setFullName("");
      setEmail("");
      setPhone("");
      setOrganization("");
      setJobTitle("");
      setAgreesToContact(false);

      onClose();
      onSuccess(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to register walk-in attendee.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Register Walk-in Attendee"
      subtitle={`Register and immediately check in an attendee for Day ${day}.`}
      maxWidthClass="sm:max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 p-3 border border-rose/30 bg-rose/10 text-xs text-rose">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-mute mb-1">
            Full Name <span className="text-gold">*</span>
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Abebe Kebede"
            className="w-full border border-line bg-ink px-3 py-2 text-xs text-cream placeholder:text-mute/60 focus:border-gold focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-mute mb-1">
              Email Address <span className="text-gold">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. abebe@company.et"
              className="w-full border border-line bg-ink px-3 py-2 text-xs text-cream placeholder:text-mute/60 focus:border-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-mute mb-1">
              Phone Number <span className="text-gold">*</span>
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-2.5 border border-r-0 border-line bg-ink-2 text-xs text-mute font-mono">
                +251
              </span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9XXXXXXXX"
                maxLength={9}
                className="w-full border border-line bg-ink px-3 py-2 text-xs text-cream placeholder:text-mute/60 focus:border-gold focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-mute mb-1">
              Organization <span className="text-gold">*</span>
            </label>
            <input
              type="text"
              required
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. Ethio Telecom"
              className="w-full border border-line bg-ink px-3 py-2 text-xs text-cream placeholder:text-mute/60 focus:border-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-mute mb-1">
              Job Title <span className="text-gold">*</span>
            </label>
            <input
              type="text"
              required
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Managing Director"
              className="w-full border border-line bg-ink px-3 py-2 text-xs text-cream placeholder:text-mute/60 focus:border-gold focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-mute mb-1">
            Attendee Type <span className="text-gold">*</span>
          </label>
          <select
            value={attendeeType}
            onChange={(e) => setAttendeeType(e.target.value)}
            className="w-full border border-line bg-ink px-3 py-2 text-xs text-cream focus:border-gold focus:outline-none cursor-pointer"
          >
            {ATTENDEE_TYPES.map((type) => (
              <option key={type} value={type} className="bg-ink text-cream">
                {ATTENDEE_TYPE_LABELS[type] || type}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 border-t border-line">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={agreesToContact}
              onChange={(e) => setAgreesToContact(e.target.checked)}
              className="mt-0.5 accent-gold"
            />
            <span className="text-xs text-cream">
              Attendee agrees to be contacted regarding forum updates and communications <span className="text-gold">*</span>
            </span>
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-line bg-ink-2 text-xs font-semibold uppercase tracking-[0.12em] text-mute hover:text-cream transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 border border-gold bg-gold/15 text-gold text-xs font-bold uppercase tracking-[0.14em] hover:bg-gold/25 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Registering...</span>
              </>
            ) : (
              <>
                <UserPlus size={14} />
                <span>Register & Check In</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
