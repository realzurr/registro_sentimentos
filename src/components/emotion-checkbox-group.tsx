import { useCallback } from "react";
import { emocoes } from "@/lib/emotions-list";
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
  const toggle = useCallback(
    (slug: string) => {
      onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
    },
    [value, onChange],
  );

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {emocoes.map((e) => {
        const checked = value.includes(e.slug);
        return (
          <label
            key={e.slug}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
              checked
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <input
              type="checkbox"
              name={name}
              value={e.slug}
              checked={checked}
              onChange={() => toggle(e.slug)}
              disabled={disabled}
              className="accent-primary"
            />
            {e.nome}
          </label>
        );
      })}
    </div>
  );
}
