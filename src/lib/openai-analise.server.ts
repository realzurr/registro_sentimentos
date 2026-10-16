import type { DadosDashboard, PeriodoDashboard } from "./api/dashboard.server";

export function descricaoPeriodo(periodo: PeriodoDashboard): string {
  if (periodo === "semana") return "esta semana";
  if (periodo === "mes") return "este mês";
  return "todo o período";
}

export async function gerarAnaliseOpenAI(
  nome: string | null | undefined,
  email: string | null | undefined,
  periodo: PeriodoDashboard,
  dados: DadosDashboard,
): Promise<string> {
  const { OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const identidade = nome || email || "participante";

  const prompt = `Você é uma analista de bem-estar emocional do Programa de Virtudes da Tenda do Xamãs.

Sua tarefa é interpretar os registros de virtudes de cada participante de maneira humana, acolhedora, respeitosa e individualizada. Escreva como se estivesse conversando diretamente com a pessoa, com o cuidado e a sensibilidade da Ligia.

Analise os seguintes dados do participante "${identidade}" em comparação com o grupo, referentes a ${descricaoPeriodo(periodo)}:

Emoções registradas pelo participante:
${JSON.stringify(dados.usuario_emocoes, null, 0)}

Média de emoções registradas pelo grupo, por participante:
${JSON.stringify(dados.grupo_emocoes, null, 0)}

Evolução semanal do participante:
${JSON.stringify(dados.usuario_evolucao, null, 0)}

Evolução semanal média do grupo:
${JSON.stringify(dados.grupo_evolucao, null, 0)}

Métricas gerais:
* Total de registros do participante: ${dados.metricas.total_usuario}
* Média de registros do grupo: ${dados.metricas.media_grupo}
* Emoção mais registrada pelo participante: ${dados.metricas.top_emocao_usuario}
* Emoção mais registrada pelo grupo: ${dados.metricas.top_emocao_grupo}

Produza uma mensagem em português, com no máximo 3 parágrafos curtos.

No primeiro parágrafo, fale diretamente com o participante e descreva o que os registros revelam sobre seu momento emocional. Compare com o grupo de forma delicada, sem transformar a comparação em julgamento, competição ou classificação.

No segundo parágrafo, explique as tendências observadas ao longo das semanas. Destaque possíveis sinais de estabilidade, oscilação, melhora, atenção ou mudança emocional. Não afirme que houve melhora ou piora quando os dados não forem suficientes.

No terceiro parágrafo, apresente uma orientação positiva, prática e acolhedora. A sugestão pode envolver observar melhor as emoções, manter constância nos registros, fortalecer o estado de presença, respeitar os próprios limites, cuidar da rotina, conversar com a equipe ou buscar apoio profissional quando necessário.

Estilo de escrita:
* Use linguagem simples, humana, calorosa e próxima.
* Caso seja necessário indicar algum acompanhamento, sempre pedir para entrar em contato com a Ligia.
* Escreva como alguém que acolhe, mas também orienta com clareza.
* Evite linguagem excessivamente técnica, fria, genérica, poética ou mística.
* Evite frases prontas que poderiam servir para qualquer pessoa.
* Utilize o nome do participante de forma natural, preferencialmente no início.
* Não faça diagnósticos psicológicos, médicos ou psiquiátricos.
* Não utilize termos como "você tem", "você sofre de" ou "isso comprova".
* Prefira expressões como "seus registros sugerem", "é possível observar", "aparece uma tendência" ou "este pode ser um ponto importante de atenção".
* Não apresente a comparação com o grupo como padrão de normalidade.
* Caso existam poucos registros, informe com delicadeza que ainda não há dados suficientes para uma conclusão mais consistente.
* Não invente informações que não estejam presentes nos dados.
* Não use títulos, tópicos, listas, emojis ou markdown.
* Responda somente com a mensagem final que será apresentada ao participante.

Não use markdown. Responda em texto puro.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
    temperature: 0.8,
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}
