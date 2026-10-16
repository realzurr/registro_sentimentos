import { useCallback, useState } from "react";
import { embaralharEmocoes } from "@/lib/emotions-list";
import { cn } from "@/lib/utils";

interface EmotionCheckboxGroupProps {
  value: string[];
  onChange: (value: string[]) => void;
  name?: string;
  disabled?: boolean;
}

export function EmotionCheckboxGroup({
  value,
  onChange,
  name = "emocoes",
  disabled = false,
}: EmotionCheckboxGroupProps) {
  const [emocoesOpcoes] = useState(() => embaralharEmocoes());
  const toggle = useCallback(
    (slug: string) => {
      onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
    },
    [value, onChange],
  );

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {emocoesOpcoes.map((e) => {
        const checked = value.includes(e.slug);
        return (
          <label
            key={e.slug}
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
              value={e.slug}
              checked={checked}
              onChange={() => toggle(e.slug)}
              disabled={disabled}
              className="sr-only"
            />
            {e.nome}
          </label>
        );
      })}
    </div>
  );
}
