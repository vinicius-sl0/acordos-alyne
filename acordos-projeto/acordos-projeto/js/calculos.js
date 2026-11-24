// ---------- cálculos ----------
// Calcula os totais de UM acordo: soma dos meses (acordado e realizado), % da meta, investimento devido
// (percentual do realizado ou valor fixo), total já pago e saldo a pagar.
// Recebe um acordo e devolve todos os seus totais
function computeTotals(rec) {
  // Acumuladores: total acordado e total realizado (soma dos 12 meses)
  let totalAcordado = 0, totalRealizado = 0;
  // Percorre jan..dez
  MESES.forEach(m => {
    // Pega os valores do mês atual (pode não existir)
    const mm = rec.meses && rec.meses[m];
    // Só soma se o mês tem dados
    if (mm) {
      // Soma o acordado do mês (vazio conta como 0)
      totalAcordado += Number(mm.acordado) || 0;
      // Soma o realizado do mês (vazio conta como 0)
      totalRealizado += Number(mm.realizado) || 0;
    }
  });
  // Investimento devido ao cliente; começa em zero
  let valorInvest = 0;
  // Regra de pagamento do acordo (percentual por padrão)
  const regra = rec.regraPagamento || {tipo:'percentual', valor:0};
  // Regra de valor fixo...
  if (regra.tipo === 'fixo') {
    // ...o investimento é o próprio valor fixo
    valorInvest = Number(regra.valor) || 0;
  } else {
    // Senão, é percentual...
    // ...o investimento é o realizado vezes o percentual (ex.: 0.05 = 5%)
    valorInvest = totalRealizado * (Number(regra.valor) || 0);
  }
  // Pagamentos já feitos ao cliente
  const pg = rec.pagamentos || {};
  // Soma de todas as formas de pagamento: Swile, bonificado, desconto em boleto, boleto e brindes
  const totalPago = ['swile','bonificado','descBoleto','boleto','brindes']
    .reduce((s,k) => s + (Number(pg[k])||0), 0);
  // Meta batida: true = bateu, false = não bateu, null/ausente = ainda a definir (acordos antigos).
  // Se NÃO bateu a meta, o acordo não gera investimento: o devido e o saldo a pagar ficam zerados.
  // Padroniza o valor da meta: true, false ou null (a definir)
  const metaBatida = rec.metaBatida === true ? true : (rec.metaBatida === false ? false : null);
  // Meta NÃO batida: não há investimento devido
  if (metaBatida === false) valorInvest = 0;
  // Saldo a pagar = devido − pago; se a meta não foi batida, fica sempre zero
  const saldo = metaBatida === false ? 0 : valorInvest - totalPago;
  // Porcentagem da meta atingida (realizado ÷ acordado); null se não houver meta
  const percAtingido = totalAcordado > 0 ? totalRealizado / totalAcordado : null;
  // Devolve todos os totais juntos, em um objeto
  return {totalAcordado, totalRealizado, valorInvest, totalPago, saldo, percAtingido, metaBatida};
}
