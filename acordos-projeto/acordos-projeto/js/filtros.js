// ---------- filtros ----------
/* Lê e valida todos os filtros da tela. Entradas inválidas NÃO filtram (e geram mensagem):
   - código do parceiro: só dígitos; comparação exata pelo código normalizado (601 = 0601 = 601.0), nunca por "contém";
   - período: data final anterior à inicial é rejeitada. */
// Lê todos os campos de filtro da tela e devolve um objeto com os valores já validados
function lerFiltros() {
  // Objeto com o estado de todos os filtros
  const f = {
    // Texto da busca, sem espaços nas pontas e em minúsculas (para ignorar maiúsculas)
    busca: $('fBusca').value.trim().toLowerCase(),
    // Consultor escolhido na lista ('' = todos)
    consultor: $('fConsultor').value,
    // Status escolhido ('' = todos)
    status: $('fStatus').value,
    // Tipo escolhido: Sell In ou Sell Out ('' = todos)
    tipo: $('fTipo').value,
    // Filtro de saldo: com saldo a pagar ou quitado ('' = todos)
    saldo: $('fSaldo').value,
    // Código do parceiro exatamente como digitado
    codigoBruto: $('fCodigo').value.trim(),
    // codigo = código normalizado (usado na comparação); erroCodigo = mensagem se for inválido
    codigo: '', erroCodigo: '',
    // Período: ini/fim = datas válidas; erroPeriodo = mensagem se estiverem invertidas
    ini: '', fim: '', erroPeriodo: '',
    // Caixa 'Incluir acordos sem datas de vigência' marcada ou não
    semDatas: $('fSemDatas').checked,
  };
  // Se o usuário digitou um código, valida
  if (f.codigoBruto) {
    // Só dígitos são aceitos: normaliza o código (601, 0601 e 601.0 viram 601)
    if (/^\d+$/.test(f.codigoBruto)) f.codigo = normCod(f.codigoBruto);
    // Com letras ou símbolos: guarda a mensagem de erro (o filtro é ignorado)
    else f.erroCodigo = 'Digite apenas números no código do parceiro.';
  }
  // Data inicial do período (ignorada se o banco não tem as colunas de data)
  let ini = datasDisponiveis ? $('fDe').value : '';
  // Data final do período
  let fim = datasDisponiveis ? $('fAte').value : '';
  // Descarta data inicial inválida
  if (ini && !dataValida(ini)) ini = '';
  // Descarta data final inválida
  if (fim && !dataValida(fim)) fim = '';
  // Data final antes da inicial: erro, e o filtro de período é ignorado
  if (ini && fim && fim < ini) f.erroPeriodo = 'A data final não pode ser anterior à data inicial.';
  // Período válido: guarda as datas (uma delas pode estar vazia)
  else { f.ini = ini; f.fim = fim; }
  // Devolve os filtros prontos
  return f;
}

// Conta os filtros ativos (mostrado na bolinha ao lado de 'Filtros'). Campos vazios e entradas inválidas não contam.
// Conta quantos filtros estão realmente ativos
function contarFiltros(f) {
  // Contador começa em zero
  let n = 0;
  // Cada filtro preenchido soma 1...
  if (f.busca) n++;
  if (f.consultor) n++;
  if (f.status) n++;
  if (f.tipo) n++;
  if (f.saldo) n++;
  if (f.codigo) n++;
  if (f.ini) n++;
  // ...até a data final
  if (f.fim) n++;
  // Devolve o total de filtros ativos
  return n;
}

// Aplica TODOS os filtros ao mesmo tempo (E lógico): o acordo só aparece se passar em todos.
// Trabalha em memória sobre a lista já carregada, por isso é instantâneo.
// Recebe a lista de acordos e os filtros; devolve só os acordos que passam em TODOS
function aplicarFiltros(lista, f) {
  // filter mantém o acordo quando a função devolve true
  return lista.filter(r => {
    // Busca: o texto precisa estar no nome do cliente, no código ou no número do acordo
    if (f.busca && !(`${r.cliente} ${r.codCliente} ${r.numeroAcordo}`.toLowerCase().includes(f.busca))) return false;
    // Código do parceiro: comparação EXATA (60 não encontra 601)
    if (f.codigo && (!r.codCliente || normCod(r.codCliente) !== f.codigo)) return false;
    // Consultor diferente do escolhido: sai
    if (f.consultor && r.consultor !== f.consultor) return false;
    // Status diferente do escolhido: sai
    if (f.status && r.status !== f.status) return false;
    // Tipo diferente do escolhido: sai
    if (f.tipo && r.tipo !== f.tipo) return false;
    // Filtro de saldo: precisa calcular os totais do acordo
    if (f.saldo) {
      // Calcula os totais do acordo
      const c = computeTotals(r);
      // 'Com saldo a pagar': tira quem não tem saldo (acima de 1 centavo)
      if (f.saldo === 'pendente' && c.saldo <= 0.01) return false;
      // 'Quitado': tira quem ainda tem saldo
      if (f.saldo === 'quitado' && c.saldo > 0.01) return false;
    }
    // Filtro por período: só vale se pelo menos uma data foi preenchida
    if (f.ini || f.fim) {
      // Verifica se a vigência do acordo se sobrepõe ao período
      const v = vigenciaSobrepoe(r, f.ini, f.fim);
      // Fora do período: sai
      if (v === false) return false;
      // Acordo sem datas: só fica se a caixa 'Incluir acordos sem datas' estiver marcada
      if (v === null && !f.semDatas) return false;
    }
    // Passou em todos os filtros: o acordo fica na lista
    return true;
  });
}
// Atalho: lê os filtros da tela e devolve a lista filtrada.
// Atalho que lê os filtros e já devolve a lista filtrada
function getFiltered() { return aplicarFiltros(acordos, lerFiltros()); }

// Zera todos os campos de filtro e redesenha a tabela com todos os acordos.
// Botão 'Limpar filtros'
function limparFiltros() {
  // Esvazia os campos de texto e de data
  ['fBusca','fCodigo','fDe','fAte'].forEach(id => { $(id).value = ''; });
  // Volta as listas de seleção para 'Todos'
  ['fConsultor','fStatus','fTipo','fSaldo'].forEach(id => { $(id).value = ''; });
  // Desmarca a caixa de acordos sem datas
  $('fSemDatas').checked = false;
  // Redesenha a tela com todos os acordos
  renderTable();
}
