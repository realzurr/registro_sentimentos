export function hojeLocal(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function agoraLocal(): string {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  const hora = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${ano}-${mes}-${dia}T${hora}:${min}`;
}

export function paraInputDatetimeLocal(dataStr?: string | null): string {
  if (!dataStr) return agoraLocal();

  const matchComHora = dataStr.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (matchComHora) {
    return `${matchComHora[1]}T${matchComHora[2]}`;
  }

  const matchApenasData = dataStr.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (matchApenasData) {
    return `${matchApenasData[1]}T00:00`;
  }

  return dataStr;
}
