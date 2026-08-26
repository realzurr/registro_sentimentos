export interface Emocao {
  slug: string;
  nome: string;
}

export const emocoes: Emocao[] = [
  { slug: "agressivo", nome: "Agressivo" },
  { slug: "alegre", nome: "Alegre" },
  { slug: "amoroso", nome: "Amoroso" },
  { slug: "analitico", nome: "Analítico" },
  { slug: "ansioso", nome: "Ansioso" },
  { slug: "cansado", nome: "Cansado" },
  { slug: "clareza", nome: "Clareza" },
  { slug: "compreensivo", nome: "Compreensivo" },
  { slug: "consumista", nome: "Consumista" },
  { slug: "criativo", nome: "Criativo" },
  { slug: "critico", nome: "Crítico" },
  { slug: "depressivo", nome: "Depressivo" },
  { slug: "empatico", nome: "Empático" },
  { slug: "estressado", nome: "Estressado" },
  { slug: "euforico", nome: "Eufórico" },
  { slug: "exausto", nome: "Exausto" },
  { slug: "faminto", nome: "Faminto" },
  { slug: "feliz", nome: "Feliz" },
  { slug: "impaciente", nome: "Impaciente" },
  { slug: "impotente", nome: "Impotente" },
  { slug: "indiferente", nome: "Indiferente" },
  { slug: "inteligente", nome: "Inteligente" },
  { slug: "introspectivo", nome: "Introspectivo" },
  { slug: "intolerante", nome: "Intolerante" },
  { slug: "melancolico", nome: "Melancólico" },
  { slug: "nervoso", nome: "Nervoso" },
  { slug: "nostalgico", nome: "Nostálgico" },
  { slug: "paciente", nome: "Paciente" },
  { slug: "parabaixo", nome: "Para Baixo" },
  { slug: "pensativo", nome: "Pensativo" },
  { slug: "produtivo", nome: "Produtivo" },
  { slug: "raiva", nome: "Raiva" },
  { slug: "satisfeito", nome: "Satisfeito" },
  { slug: "saudoso", nome: "Saudoso" },
  { slug: "sereno", nome: "Sereno" },
  { slug: "sonolento", nome: "Sonolento" },
  { slug: "tolerante", nome: "Tolerante" },
  { slug: "tranquilo", nome: "Tranquilo" },
  { slug: "triste", nome: "Triste" },
];

export const nomesEmocoes = emocoes.map((e) => e.nome);

export function slugParaNomeEmocao(slug: string): string {
  return emocoes.find((e) => e.slug === slug)?.nome ?? slug;
}
