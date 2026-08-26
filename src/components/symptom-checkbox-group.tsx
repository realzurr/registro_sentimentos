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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {sintomas.map((s) => {
          const checked = value.includes(s.slug);
          return (
            <label
              key={s.slug}
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
                value={s.slug}
                checked={checked}
                onChange={() => toggle(s.slug)}
                disabled={disabled}
                className="accent-primary"
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
