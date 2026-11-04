import { ArrowUp } from "lucide-react";

export function BackToTop() {
  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed right-5 bottom-5 z-30 grid h-11 w-11 place-items-center border border-line bg-ink/90 text-cream shadow-lg backdrop-blur-md transition-colors hover:border-gold hover:text-gold"
    >
      <ArrowUp size={18} strokeWidth={1.75} />
    </button>
  );
}
