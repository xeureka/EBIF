type Option<T extends string> = {
  value: T;
  label: string;
};

type FilterSelectProps<T extends string> = {
  id: string;
  label?: string;
  value: T;
  options: readonly Option<T>[] | Option<T>[];
  onChange: (value: T) => void;
  className?: string;
};

export function FilterSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  className = "",
}: FilterSelectProps<T>) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs uppercase tracking-[0.16em] text-mute whitespace-nowrap">
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 border border-line bg-ink px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-cream outline-none transition-colors focus:border-gold"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
