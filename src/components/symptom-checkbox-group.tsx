import { useCallback } from "react";
import { sintomas } from "@/lib/symptoms-list";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface SymptomCheckboxGroupProps {
  value: string[];
  onChange: (value: string[]) => void;
  detalhe?: string;
  onDetalheChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
}

export function SymptomCheckboxGroup({
  value,
  onChange,
  detalhe = "",
  onDetalheChange,
  name = "sintomas",
  disabled = false,
}: SymptomCheckboxGroupProps) {
  const toggle = useCallback(
    (slug: string) => {
      onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
    },
    [value, onChange],
  );

  const showDetalhe = value.includes("outros") && onDetalheChange;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
        {sintomas.map((s) => {
          const checked = value.includes(s.slug);
          return (
            <label
              key={s.slug}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-full border-2 px-4 py-2.5 text-sm font-medium transition-all select-none",
                checked
                  ? "border-green-primary bg-green-primary/15 text-green-dark shadow-sm"
                  : "border-border bg-white/70 text-muted-foreground hover:border-green-primary/50 hover:bg-white",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  checked ? "border-green-primary bg-green-primary" : "border-muted-foreground/40",
                )}
              >
                {checked && (
                  <svg
                    viewBox="0 0 12 12"
                    className="h-2.5 w-2.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <input
                type="checkbox"
                name={name}
                value={s.slug}
                checked={checked}
                onChange={() => toggle(s.slug)}
                disabled={disabled}
                className="sr-only"
              />
              {s.nome}
            </label>
          );
        })}
      </div>
      {showDetalhe && (
        <Textarea
          value={detalhe}
          onChange={(e) => onDetalheChange!(e.target.value)}
          placeholder="Descreva outros sintomas sentidos..."
          rows={2}
          maxLength={500}
          disabled={disabled}
        />
      )}
    </div>
  );
}
