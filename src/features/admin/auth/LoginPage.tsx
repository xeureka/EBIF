import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { loginWithEmail, getAdminMe } from "@/lib/api";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 30;

export function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [touched, setTouched] = useState({ email: false, password: false });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);

  // Rate limiting / Lockout state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // If already authenticated with active session, redirect to attendees
  useEffect(() => {
    let active = true;
    getAdminMe()
      .then((me) => {
        if (active && me && me.status === "active") {
          navigate({ to: "/admin/attendees" });
        }
      })
      .catch(() => {
        // Not authenticated
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const validateEmail = (val: string): string => {
    if (!val.trim()) return "Email is required.";
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(val.trim())) return "Enter a valid email address.";
    return "";
  };

  const validatePassword = (val: string): string => {
    if (!val) return "Password is required.";
    return "";
  };

  const handleBlur = (field: "email" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "email") {
      setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    } else {
      setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0 || loading) return;

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    setTouched({ email: true, password: true });
    setErrors({ email: emailErr, password: passErr });

    if (emailErr || passErr) return;

    setLoading(true);
    setGeneralError("");

    try {
      await loginWithEmail(email, password);
      navigate({ to: "/admin/attendees" });
    } catch {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);

      if (nextFailures >= MAX_FAILED_ATTEMPTS) {
        setLockoutSeconds(LOCKOUT_DURATION_SECONDS);
        setGeneralError(
          `Too many failed attempts. Form locked for ${LOCKOUT_DURATION_SECONDS} seconds.`,
        );
      } else {
        setGeneralError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockoutSeconds > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-4">
      <div className="w-full max-w-[400px] border border-line bg-ink p-7 sm:p-9">
        {/* Card Header */}
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">
            Ethiopian Business &amp; Investment Forum
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium text-cream">Admin sign in</h1>
          <p className="mt-1 text-xs text-mute">Sign in to manage forum attendees and admins.</p>
        </div>

        {/* Lockout Banner */}
        {isLocked && (
          <div className="mt-5 border border-rose/30 bg-rose/10 p-3 text-center text-xs text-rose">
            Too many failed attempts. Please wait{" "}
            <span className="font-semibold">{lockoutSeconds}s</span> before trying again.
          </div>
        )}

        {/* General Error Message */}
        {generalError && !isLocked && (
          <div className="mt-5 border border-rose/30 bg-rose/10 p-3 text-center text-xs text-rose">
            {generalError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="admin-email"
              className="block text-[11px] font-medium uppercase tracking-[0.16em] text-mute mb-1.5"
            >
              Email <span className="text-rose">*</span>
            </label>
            <div
              className={`flex items-center border bg-ink px-3 transition-colors ${
                errors.email && touched.email
                  ? "border-rose"
                  : "border-line focus-within:border-gold"
              }`}
            >
              <Mail size={15} className="mr-2.5 text-mute shrink-0" aria-hidden="true" />
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                disabled={isLocked || loading}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) {
                    setErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) }));
                  }
                  setGeneralError("");
                }}
                onBlur={() => handleBlur("email")}
                placeholder="you@company.com"
                className="h-10 w-full bg-transparent text-sm text-cream placeholder:text-mute/60 outline-none disabled:cursor-not-allowed"
              />
            </div>
            {errors.email && touched.email && (
              <p className="mt-1 text-xs text-rose">{errors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-[11px] font-medium uppercase tracking-[0.16em] text-mute mb-1.5"
            >
              Password <span className="text-rose">*</span>
            </label>
            <div
              className={`flex items-center border bg-ink px-3 transition-colors ${
                errors.password && touched.password
                  ? "border-rose"
                  : "border-line focus-within:border-gold"
              }`}
            >
              <Lock size={15} className="mr-2.5 text-mute shrink-0" aria-hidden="true" />
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={isLocked || loading}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) {
                    setErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) }));
                  }
                  setGeneralError("");
                }}
                onBlur={() => handleBlur("password")}
                placeholder="••••••••••••"
                className="h-10 w-full bg-transparent text-sm text-cream placeholder:text-mute/60 outline-none disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="ml-2 text-mute hover:text-cream transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && touched.password && (
              <p className="mt-1 text-xs text-rose">{errors.password}</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLocked || loading}
              className={`h-11 w-full border border-gold text-[12px] font-medium uppercase tracking-[0.18em] text-ink transition-colors ${
                isLocked || loading
                  ? "cursor-not-allowed bg-gold/40 text-ink/60"
                  : "bg-gold hover:bg-gold-2 cursor-pointer"
              }`}
            >
              {loading ? "Signing in..." : isLocked ? `Locked (${lockoutSeconds}s)` : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
