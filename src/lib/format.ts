export function formatarDataPtBr(dataIso: string): string {
  if (!dataIso) return "";

  const matchComHora = dataIso.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (matchComHora) {
    const [, ano, mes, dia, hora, min] = matchComHora;
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  }

  const matchApenasData = dataIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchApenasData) {
    const [, ano, mes, dia] = matchApenasData;
    return `${dia}/${mes}/${ano}`;
  }

  return dataIso;
}

export function truncarTexto(texto: string, limite: number): string {
  if (!texto) return "";
  if (texto.length <= limite) return texto;
  return `${texto.slice(0, limite)}...`;
}

export function truncarUserId(userId: string): string {
  if (!userId) return "";
  if (userId.length <= 8) return userId;
  return `${userId.slice(0, 8)}...`;
}
