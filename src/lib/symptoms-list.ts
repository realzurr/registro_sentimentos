export interface Sintoma {
  slug: string;
  nome: string;
}

export const sintomas: Sintoma[] = [
  { slug: "menstrual", nome: "Período Menstrual" },
  { slug: "dorcabeca", nome: "Dor de cabeça" },
  { slug: "dorcorpo", nome: "Dor no corpo" },
  { slug: "febre", nome: "Febre" },
  { slug: "nausea", nome: "Náuseas" },
  { slug: "vomito", nome: "Vômito" },
  { slug: "colica", nome: "Cólica" },
  { slug: "tontura", nome: "Tontura" },
  { slug: "azia", nome: "Azia" },
  { slug: "outros", nome: "Outros" },
];

export const slugsSintomas = sintomas.map((s) => s.slug);

export function slugParaNomeSintoma(slug: string): string {
  return sintomas.find((s) => s.slug === slug)?.nome ?? slug;
}
