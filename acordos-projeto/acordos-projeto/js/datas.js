// ---------- datas de vigência ----------
// As datas trafegam sempre como texto "AAAA-MM-DD" (formato do <input type="date"> e da coluna date do Postgres).
// Nesse formato a comparação de texto equivale à comparação cronológica e não sofre com fuso horário.
// Confere se o texto é uma data real no formato AAAA-MM-DD
function dataValida(s) {
  // Rejeita se não estiver no formato AAAA-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  // Separa ano, mês e dia como números
  const [y, m, d] = s.split('-').map(Number);
  // Rejeita anos fora de 1900–2100 (evita erros de digitação, como o ano 20260)
  if (y < 1900 || y > 2100) return false;
  // Cria a data em UTC (sem influência do fuso horário)
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Só vale se a data criada tem o mesmo ano, mês e dia (rejeita 31/02, por exemplo)
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
// Converte AAAA-MM-DD em DD/MM/AAAA para exibir. Devolve '' se a data for inválida.
// Converte AAAA-MM-DD em DD/MM/AAAA; datas inválidas viram texto vazio
function fmtData(s) { return dataValida(s) ? `${s.slice(8,10)}/${s.slice(5,7)}/${s.slice(0,4)}` : ''; }

/* Critério de vigência do filtro por período:
   um acordo vigora de dataInicio até dataFim (inclusive). Ele entra no resultado quando o seu período
   SE SOBREPÕE ao intervalo pesquisado [ini, fim], ou seja:  dataInicio <= fim  E  dataFim >= ini.
   - Os limites são inclusivos: datas exatamente iguais (ou um acordo de 1 dia) são encontradas.
   - Só "data inicial": traz quem ainda está vigente nessa data ou depois (término >= inicial).
   - Só "data final": traz quem já tinha começado até essa data (início <= final).
   - Acordo com apenas uma das datas é tratado como aberto do outro lado (sem início = desde sempre; sem término = sem fim).
   - Acordo SEM nenhuma data (cadastros antigos) não tem vigência definida: fica de fora do filtro por período,
     a menos que "Incluir acordos sem datas" esteja marcado. Retorna null nesse caso. */
// r = acordo; ini/fim = período pesquisado. Devolve true (se sobrepõe), false (não) ou null (acordo sem datas)
function vigenciaSobrepoe(r, ini, fim) {
  // a = início do acordo, b = término ('' quando não preenchido)
  const a = r.dataInicio || '', b = r.dataFim || '';
  // Acordo sem nenhuma data: vigência indefinida (acordos antigos)
  if (!a && !b) return null;
  // Se o acordo começa DEPOIS do fim pesquisado, está fora
  if (fim && a && a > fim) return false;
  // Se o acordo terminou ANTES do início pesquisado, está fora
  if (ini && b && b < ini) return false;
  // Nenhuma das exclusões valeu: os períodos se sobrepõem
  return true;
}
