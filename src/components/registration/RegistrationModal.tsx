import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from "react";
import {
  Building2,
  CheckCircle2,
  Globe2,
  Landmark,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { event } from "@/data/event";
import {
  submitRegistration,
  type AttendeeType,
  type RegistrationPayload,
} from "@/lib/registration";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  jobTitle: string;
  attendeeType: AttendeeType | "";
  consent: boolean;
};

type FieldName = keyof FormState;

const REQUIRED_FIELDS: FieldName[] = [
  "fullName",
  "email",
  "phone",
  "organization",
  "jobTitle",
  "attendeeType",
  "consent",
];

const EMPTY_FORM: FormState = {
  fullName: "",
  email: "",
  phone: "",
  organization: "",
  jobTitle: "",
  attendeeType: "",
  consent: false,
};

const ATTENDEE_TYPES: {
  value: AttendeeType;
  title: string;
  subtitle: string;
  icon: LucideIcon;
}[] = [
  {
    value: "Company",
    title: "Company",
    subtitle: "Represent a business",
    icon: Building2,
  },
  {
    value: "Investor",
    title: "Investor",
    subtitle: "Seeking opportunities",
    icon: TrendingUp,
  },
  {
    value: "Government Institution",
    title: "Government Institution",
    subtitle: "Public sector",
    icon: Landmark,
  },
  {
    value: "International Partner",
    title: "International Partner",
    subtitle: "Global collaboration",
    icon: Globe2,
  },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[97]\d{8}$/;

function validateField(name: FieldName, values: FormState): string {
  switch (name) {
    case "fullName":
      return values.fullName.trim() ? "" : "Full name is required.";
    case "email":
      if (!values.email.trim()) return "Email is required.";
      return EMAIL_PATTERN.test(values.email.trim()) ? "" : "Enter a valid email address.";
    case "phone":
      if (!values.phone) return "Phone number is required.";
      return PHONE_PATTERN.test(values.phone)
        ? ""
        : "Enter 9 digits starting with 9 or 7.";
    case "organization":
      return values.organization.trim() ? "" : "Organization is required.";
    case "jobTitle":
      return values.jobTitle.trim() ? "" : "Job title is required.";
    case "attendeeType":
      return values.attendeeType ? "" : "Select an attendee type.";
    case "consent":
      return values.consent ? "" : "Please confirm you agree to be contacted.";
  }
}

function validateAll(values: FormState): Partial<Record<FieldName, string>> {
  return REQUIRED_FIELDS.reduce<Partial<Record<FieldName, string>>>((errors, field) => {
    const message = validateField(field, values);
    if (message) errors[field] = message;
    return errors;
  }, {});
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-full border border-gold text-[11px] font-bold text-gold">
        {number}
      </span>
      <h3 className="text-[12px] font-bold uppercase tracking-[0.18em]">{title}</h3>
    </div>
  );
}

function FieldLabel({
  htmlFor,
  label,
  required = true,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-mute"
    >
      {label}
      {required && <span className="ml-0.5 text-rose">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-rose">{message}</p>;
}

function inputClass(hasError: boolean) {
  return `h-11 w-full border bg-ink px-3 text-sm text-cream outline-none transition-colors ${
    hasError ? "border-rose" : "border-line focus:border-gold"
  }`;
}

export function RegistrationModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const completed = REQUIRED_FIELDS.filter((field) => !validateField(field, form)).length;
  const canSubmit = completed === REQUIRED_FIELDS.length;

  useEffect(() => {
    if (open) return;
    setForm(EMPTY_FORM);
    setTouched({});
    setErrors({});
    setSubmitting(false);
    setSubmitError("");
    setSuccess(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.offsetParent !== null,
      );

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.preventDefault();
        onClose();
        return;
      }
      if (keyboardEvent.key !== "Tab") return;

      const items = getFocusable();
      if (!items.length) {
        keyboardEvent.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (keyboardEvent.shiftKey && document.activeElement === first) {
        keyboardEvent.preventDefault();
        last.focus();
      } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
        keyboardEvent.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const timer = window.setTimeout(() => {
      const target = success
        ? dialog.querySelector<HTMLElement>("[data-success-close]")
        : dialog.querySelector<HTMLElement>('[data-field="fullName"]');
      target?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(timer);
    };
  }, [open, onClose, success]);

  function updateField<K extends FieldName>(name: K, value: FormState[K]) {
    const next: FormState = { ...form, [name]: value };
    setForm(next);
    if (touched[name]) {
      setErrors((current) => ({ ...current, [name]: validateField(name, next) }));
    }
    setSubmitError("");
  }

  function handleBlur(name: FieldName) {
    setTouched((current) => ({ ...current, [name]: true }));
    setErrors((current) => ({ ...current, [name]: validateField(name, form) }));
  }

  function handlePhoneChange(changeEvent: ChangeEvent<HTMLInputElement>) {
    let digits = changeEvent.target.value.replace(/\D/g, "");
    if (digits.length > 0 && digits[0] !== "9" && digits[0] !== "7") {
      if (digits.startsWith("251") && (digits[3] === "9" || digits[3] === "7")) {
        digits = digits.slice(3);
      } else if (digits.startsWith("0") && (digits[1] === "9" || digits[1] === "7")) {
        digits = digits.slice(1);
      } else {
        digits = "";
      }
    }
    digits = digits.slice(0, 9);
    updateField("phone", digits);
  }

  function selectAttendeeType(value: AttendeeType) {
    updateField("attendeeType", value);
    setTouched((current) => ({ ...current, attendeeType: true }));
    setErrors((current) => ({ ...current, attendeeType: "" }));
  }

  function handleConsentChange(changeEvent: ChangeEvent<HTMLInputElement>) {
    updateField("consent", changeEvent.target.checked);
  }

  function handleBackdropClick(mouseEvent: MouseEvent<HTMLDivElement>) {
    if (mouseEvent.target === mouseEvent.currentTarget) onClose();
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (submitting) return;

    const nextErrors = validateAll(form);
    setErrors(nextErrors);
    setTouched(
      REQUIRED_FIELDS.reduce<Partial<Record<FieldName, boolean>>>((all, field) => {
        all[field] = true;
        return all;
      }, {}),
    );

    const firstInvalid = REQUIRED_FIELDS.find((field) => nextErrors[field]);
    if (firstInvalid) {
      const target = dialogRef.current?.querySelector<HTMLElement>(
        `[data-field="${firstInvalid}"]`,
      );
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const attendeeType = form.attendeeType as AttendeeType;
      const payload: RegistrationPayload = {
        name: form.fullName.trim(),
        organisation: form.organization.trim(),
        email: form.email.trim(),
        phone: `+251${form.phone}`,
        jobTitle: form.jobTitle.trim(),
        role: attendeeType,
        attendeeType,
        note: "",
        consent: form.consent,
      };
      await submitRegistration(payload);
      setSuccess(true);
    } catch {
      setSubmitError("We could not complete your registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-shade/70 p-0 sm:items-center sm:p-6"
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-title"
        className="relative flex h-full w-full flex-col overflow-hidden bg-ink text-cream sm:h-auto sm:max-h-[90vh] sm:max-w-[760px] sm:border sm:border-line"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close registration"
          className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center border border-line bg-ink text-xl leading-none text-cream transition-colors hover:border-gold hover:text-gold"
        >
          <X size={18} strokeWidth={1.5} />
        </button>

        <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
          {success ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-4 py-10 text-center">
              <CheckCircle2 size={40} strokeWidth={1.5} className="text-gold" />
              <h2 id="registration-title" className="mt-4 font-display text-4xl">
                You're registered
              </h2>
              <p className="mt-3 max-w-md text-sm text-mute">
                A confirmation will be sent to {form.email}.
              </p>
              <button
                type="button"
                data-success-close
                onClick={onClose}
                className="mt-6 inline-flex h-11 items-center border border-gold bg-gold px-6 text-[12px] uppercase tracking-[0.18em] text-ink transition-colors hover:bg-gold-2"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="pr-12">
                <p className="text-[11px] uppercase tracking-[0.28em] text-gold font-semibold">
                  REGISTRATION
                </p>
                <h2 id="registration-title" className="mt-2 font-display text-4xl sm:text-5xl">
                  Secure your place
                </h2>
                <p className="mt-2 text-sm text-mute">Takes about a minute.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="border border-line px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-mute">
                    {event.shortDates}
                  </span>
                  <span className="border border-line px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-mute">
                    {event.venueWithCity}
                  </span>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-1 flex-1 bg-line">
                    <div
                      className="h-full bg-gold transition-all duration-300"
                      style={{ width: `${(completed / REQUIRED_FIELDS.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-mute">
                    {completed} of {REQUIRED_FIELDS.length} completed
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-8">
                <div>
                  <SectionHeading number="01" title="YOUR DETAILS" />
                  <div className="mt-4 space-y-4">
                    <div>
                      <FieldLabel htmlFor="registration-full-name" label="Full name" />
                      <input
                        id="registration-full-name"
                        data-field="fullName"
                        type="text"
                        value={form.fullName}
                        onChange={(changeEvent) =>
                          updateField("fullName", changeEvent.target.value)
                        }
                        onBlur={() => handleBlur("fullName")}
                        className={inputClass(!!errors.fullName)}
                        autoComplete="name"
                      />
                      <FieldError message={errors.fullName} />
                    </div>

                    <div>
                      <FieldLabel htmlFor="registration-email" label="Email" />
                      <input
                        id="registration-email"
                        data-field="email"
                        type="email"
                        placeholder="you@company.com"
                        value={form.email}
                        onChange={(changeEvent) =>
                          updateField("email", changeEvent.target.value)
                        }
                        onBlur={() => handleBlur("email")}
                        className={inputClass(!!errors.email)}
                        autoComplete="email"
                      />
                      <FieldError message={errors.email} />
                    </div>

                    <div>
                      <FieldLabel htmlFor="registration-phone" label="Phone" />
                      <div
                        className={`flex h-11 border ${
                          errors.phone ? "border-rose" : "border-line focus-within:border-gold"
                        }`}
                      >
                        <span className="flex items-center border-r border-line bg-ink-2 px-3 text-sm text-mute">
                          +251
                        </span>
                        <input
                          id="registration-phone"
                          data-field="phone"
                          type="tel"
                          inputMode="numeric"
                          pattern="[97][0-9]{8}"
                          placeholder="911 984 806"
                          value={form.phone}
                          onChange={handlePhoneChange}
                          onBlur={() => handleBlur("phone")}
                          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-cream outline-none"
                          autoComplete="tel-national"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-mute">
                        9 digits, starting with 9 or 7.
                      </p>
                      <FieldError message={errors.phone} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-line pt-6">
                  <SectionHeading number="02" title="YOUR ORGANIZATION" />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="registration-organization" label="Organization" />
                      <input
                        id="registration-organization"
                        data-field="organization"
                        type="text"
                        value={form.organization}
                        onChange={(changeEvent) =>
                          updateField("organization", changeEvent.target.value)
                        }
                        onBlur={() => handleBlur("organization")}
                        className={inputClass(!!errors.organization)}
                        autoComplete="organization"
                      />
                      <FieldError message={errors.organization} />
                    </div>
                    <div>
                      <FieldLabel htmlFor="registration-job-title" label="Job title" />
                      <input
                        id="registration-job-title"
                        data-field="jobTitle"
                        type="text"
                        value={form.jobTitle}
                        onChange={(changeEvent) =>
                          updateField("jobTitle", changeEvent.target.value)
                        }
                        onBlur={() => handleBlur("jobTitle")}
                        className={inputClass(!!errors.jobTitle)}
                        autoComplete="organization-title"
                      />
                      <FieldError message={errors.jobTitle} />
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-1.5 text-[11px] uppercase tracking-[0.18em] text-mute">
                      Attendee type <span className="text-rose">*</span>
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {ATTENDEE_TYPES.map(({ value, title, subtitle, icon: Icon }, index) => {
                        const selected = form.attendeeType === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            data-field={index === 0 ? "attendeeType" : undefined}
                            aria-pressed={selected}
                            onClick={() => selectAttendeeType(value)}
                            className={`border p-4 text-left transition-colors ${
                              selected
                                ? "border-gold bg-gold/10"
                                : "border-line hover:border-gold/60"
                            }`}
                          >
                            <Icon size={18} strokeWidth={1.5} className="text-gold" />
                            <p className="mt-3 text-sm font-medium">{title}</p>
                            <p className="mt-0.5 text-xs text-mute">{subtitle}</p>
                          </button>
                        );
                      })}
                    </div>
                    <FieldError message={errors.attendeeType} />
                  </div>
                </div>

                <div className="border-t border-line pt-6">
                  <SectionHeading number="03" title="ATTENDANCE" />
                  <div className="mt-4">
                    <label className="flex items-start gap-3 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        data-field="consent"
                        checked={form.consent}
                        onChange={handleConsentChange}
                        onBlur={() => handleBlur("consent")}
                        className="mt-0.5 h-4 w-4 accent-[var(--color-gold)] cursor-pointer"
                      />
                      <span>
                        I agree to be contacted about the Ethiopian Business &amp; Investment
                        Forum. <span className="text-rose">*</span>
                      </span>
                    </label>
                    <FieldError message={errors.consent} />
                  </div>
                </div>

                <div className="border-t border-line pt-6">
                  {submitError && <p className="mb-3 text-sm text-rose">{submitError}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    aria-disabled={!canSubmit || submitting}
                    className={`h-12 w-full text-[12px] font-medium uppercase tracking-[0.18em] text-ink transition-colors ${
                      canSubmit && !submitting
                        ? "border border-gold bg-gold hover:bg-gold-2 cursor-pointer"
                        : "cursor-not-allowed border border-gold/40 bg-gold/40 text-ink/60"
                    }`}
                  >
                    {submitting ? "Submitting..." : "Register for the Forum"}
                  </button>
                  <p className="mt-3 text-center text-xs text-mute">
                    We only use your details for this event.
                  </p>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
