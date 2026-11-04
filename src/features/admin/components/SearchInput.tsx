import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delayMs?: number;
  className?: string;
  id?: string;
  label?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  delayMs = 250,
  className = "",
  id = "admin-search",
  label = "Search",
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync if parent updates value directly (e.g. clear filters)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, delayMs);
    return () => clearTimeout(handler);
  }, [localValue, delayMs, onChange, value]);

  return (
    <div className={`relative flex items-center ${className}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        size={16}
        strokeWidth={1.75}
        className="pointer-events-none absolute left-3 text-mute"
        aria-hidden="true"
      />
      <input
        id={id}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full border border-line bg-ink pl-9 pr-9 text-sm text-cream placeholder:text-mute/70 focus:border-gold focus:outline-none"
      />
      {localValue && (
        <button
          type="button"
          onClick={() => {
            setLocalValue("");
            onChange("");
          }}
          aria-label="Clear search"
          className="absolute right-2.5 text-mute transition-colors hover:text-cream"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
