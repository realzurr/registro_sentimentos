export interface VirtudeOpcao {
  slug: string;
  nome: string;
}

export const virtudes: VirtudeOpcao[] = [
  { slug: "humildade", nome: "Humildade" },
  { slug: "brandura", nome: "Brandura" },
  { slug: "eternidade", nome: "Eternidade" },
  { slug: "perdao", nome: "Perdão" },
  { slug: "exemplo-positivo", nome: "Exemplo Positivo" },
  { slug: "igualdade", nome: "Igualdade" },
  { slug: "fraternidade", nome: "Fraternidade" },
  { slug: "aceitacao", nome: "Aceitação" },
  { slug: "perseveranca", nome: "Perseverança" },
  { slug: "otimismo", nome: "Otimismo" },
  { slug: "paciencia", nome: "Paciência" },
  { slug: "reconciliacao", nome: "Reconciliação" },
  { slug: "fe", nome: "Fé" },
  { slug: "individuacao", nome: "Individuação" },
  { slug: "ajuda-ao-proximo", nome: "Ajuda ao Próximo" },
  { slug: "amor-ao-proximo", nome: "Amor ao Próximo" },
  { slug: "gratidao", nome: "Gratidão" },
  { slug: "verdade", nome: "Verdade" },
  { slug: "bom-humor", nome: "Bom Humor" },
  { slug: "honestidade", nome: "Honestidade" },
  { slug: "nao-julgamento", nome: "Não Julgamento" },
  { slug: "pureza-de-coracao", nome: "Pureza de Coração" },
  { slug: "abnegacao", nome: "Abnegação" },
  { slug: "pagar-o-mal-com-o-bem", nome: "Pagar o Mal com o Bem" },
  { slug: "honrar-a-familia", nome: "Honrar a Família" },
  { slug: "desapego", nome: "Desapego" },
  { slug: "busca-do-melhoramento", nome: "Busca do Melhoramento" },
  { slug: "cuidado-com-o-corpo", nome: "Cuidado com o Corpo" },
  { slug: "flexibilidade", nome: "Flexibilidade" },
  { slug: "utilidade", nome: "Utilidade" },
  { slug: "amor-a-natureza-e-aos-animais", nome: "Amor à Natureza e aos Animais" },
  { slug: "responsabilidade", nome: "Responsabilidade" },
];

export function nomeVirtude(slug: string): string {
  return virtudes.find((v) => v.slug === slug)?.nome ?? slug;
}

export function embaralharVirtudes(): VirtudeOpcao[] {
  const lista = [...virtudes];
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}
