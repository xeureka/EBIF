import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";

type CopyFieldProps = {
  id: string;
  label: string;
  value: string;
  isSecret?: boolean;
  className?: string;
};

export function CopyField({ id, label, value, isSecret = false, className = "" }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        // Fallback
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-[11px] font-medium uppercase tracking-[0.16em] text-mute">
        {label}
      </label>
      <div className="flex items-center border border-line bg-ink-2/60 transition-colors focus-within:border-gold">
        <input
          id={id}
          type={isSecret && !showSecret ? "password" : "text"}
          value={value}
          readOnly
          className="h-10 min-w-0 flex-1 bg-transparent px-3 font-mono text-xs text-cream outline-none select-all"
        />

        {isSecret && (
          <button
            type="button"
            onClick={() => setShowSecret((v) => !v)}
            aria-label={showSecret ? "Hide password" : "Show password"}
            className="grid h-10 w-10 place-items-center text-mute transition-colors hover:text-cream"
          >
            {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-10 items-center gap-1.5 border-l border-line px-3 text-xs uppercase tracking-[0.12em] font-medium text-cream transition-colors hover:bg-gold/10 hover:text-gold"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-600" />
              <span className="text-emerald-700">Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
