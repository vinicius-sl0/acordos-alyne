// ---------- renderização ----------
// Desenha os 6 cartões de resumo usando SOMENTE a lista recebida (a lista já filtrada).
// Desenha os cartões de resumo (o parâmetro list é a lista JÁ filtrada)
function renderSummary(list) {
  // Quantidade de acordos na lista
  const total = list.length;
  // Quantos estão em andamento
  const andamento = list.filter(r => r.status === 'em andamento').length;
  // Quantos estão encerrados
  const encerrados = list.filter(r => r.status === 'encerrado').length;
  // Acumuladores de investimento, valor pago e saldo
  let investTotal = 0, pagoTotal = 0, saldoTotal = 0;
  // Passa por cada acordo somando os valores
  list.forEach(r => {
    // Totais do acordo
    const c = computeTotals(r);
    // Soma o investimento devido
    investTotal += c.valorInvest;
    // Soma o que já foi pago
    pagoTotal += c.totalPago;
    // Soma o saldo (valores negativos, pagamento a mais, contam como zero)
    saldoTotal += Math.max(c.saldo, 0);
  });
  // Função que monta o HTML de um cartão (cor, título, valor)
  const k = (cls, label, val) => `<div class="kpi ${cls}"><div class="kpi-label">${label}</div><div class="kpi-value">${val}</div></div>`;
  // Monta os 6 cartões e coloca na página
  $('summary').innerHTML =
    k('', 'Acordos', total) + k('', 'Em andamento', andamento) + k('', 'Encerrados', encerrados) +
    k('gold', 'Investimento total', fmtMoney(investTotal)) +
    k('green', 'Já pago', fmtMoney(pagoTotal)) +
    k('red', 'Saldo em aberto', fmtMoney(saldoTotal));
}

// Monta a lista de consultores (filtro e sugestões do formulário) a partir dos acordos existentes, mantendo a seleção atual.
// Preenche as listas de consultores com os nomes existentes nos acordos
function populateConsultorFilter(list) {
  // Lista de seleção do filtro de consultor
  const sel = $('fConsultor');
  // Guarda a escolha atual para não perdê-la
  const current = sel.value;
  // Nomes únicos e em ordem alfabética (Set remove repetidos)
  const names = [...new Set(list.map(r => r.consultor).filter(Boolean))].sort();
  // Recria as opções: 'Todos' + um item por consultor
  sel.innerHTML = '<option value="">Todos</option>' + names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  // Restaura a escolha que estava selecionada
  sel.value = current;
  // Preenche também as sugestões do campo 'Consultor' do formulário
  $('consultoresList').innerHTML = names.map(n => `<option value="${escapeHtml(n)}">`).join('');
}

// Etiqueta colorida com o status do acordo.
// Cria a etiqueta colorida do status
function statusTag(status) {
  // Classe de cor conforme o status
  const cls = status === 'encerrado' ? 'encerrado' : (status === 'pendente' ? 'pendente' : 'andamento');
  // Texto da etiqueta
  const label = status === 'encerrado' ? 'Encerrado' : (status === 'pendente' ? 'Pendente' : 'Em andamento');
  // Devolve a etiqueta pronta em HTML
  return `<span class="chip ${cls}"><span class="dot"></span>${label}</span>`;
}

// Texto da coluna Vigência: período completo, só início, só término, ou 'Sem vigência definida' (acordos antigos).
// Texto da coluna 'Vigência' de um acordo
function vigenciaHtml(r) {
  // Início e término já no formato DD/MM/AAAA
  const a = fmtData(r.dataInicio), b = fmtData(r.dataFim);
  // Sem nenhuma data (acordos antigos)
  if (!a && !b) return '<span class="vig empty">Sem vigência definida</span>';
  // Com início e término
  if (a && b) return `<span class="vig">${a}<div class="cell-sub">até ${b}</div></span>`;
  // Só com início
  if (a) return `<span class="vig">${a}<div class="cell-sub">sem término</div></span>`;
  // Só com término
  return `<span class="vig">até ${b}<div class="cell-sub">sem início</div></span>`;
}

// Linhas cinzas 'esqueleto' mostradas enquanto os dados carregam.
// Cria as linhas cinzas de 'carregando'
function skeletonRows() {
  // Uma célula cinza com a largura recebida
  const cell = (w) => `<td><div class="skeleton sk-line" style="width:${w}"></div></td>`;
  // Gera 6 linhas, cada uma com 11 células de larguras variadas
  return Array.from({length: 6}, () => '<tr class="sk-row">' + [ '80%','60%','50%','70%','60%','60%','50%','60%','50%','50%','40%' ].map(cell).join('') + '</tr>').join('');
}

// Bloco padrão de estado da tela (ícone, título, texto e botões), usado nos casos vazio e erro.
// Monta a mensagem de tela (ícone, título, texto e botões opcionais)
function estadoHtml(tipo, ic, titulo, texto, acoes) {
  // Devolve o bloco pronto; os botões só entram se houver 'acoes'
  return `<div class="state ${tipo}"><div class="state-ic">${icon(ic)}</div><h3>${titulo}</h3><p>${texto}</p>${acoes ? `<div class="state-actions">${acoes}</div>` : ''}</div>`;
}

// Escolhe o título e a explicação da tela 'sem resultados' conforme o que causou: código do parceiro, período ou filtros em geral.
// Decide o que dizer quando a pesquisa não encontra nada; devolve [título, texto]
function mensagemSemResultado(f) {
  // Caso 1: a pesquisa foi por código do parceiro
  if (f.codigo) {
    // Procura o parceiro na base (se ela já carregou)
    const p = (typeof parceiros !== 'undefined' && parceirosStatus === 'ok') ? buscarParceiro(f.codigo) : null;
    // Há outros filtros além do código?
    const outros = contarFiltros(f) > 1 || f.semDatas;
    // Texto que vai explicar o motivo
    let txt;
    // Com outros filtros: o parceiro pode ter acordos, mas não nesses filtros
    if (outros) txt = `Nenhum acordo do parceiro ${escapeHtml(f.codigoBruto)} atende aos demais filtros aplicados.`;
    // Parceiro existe na base, mas não tem nenhum acordo
    else if (p) txt = `${escapeHtml(p.razao || '')} (código ${escapeHtml(f.codigoBruto)}) está na base de parceiros, mas ainda não tem acordos cadastrados.`;
    // Código não existe nem nos acordos nem na base: provável erro de digitação
    else if (typeof parceiros !== 'undefined' && parceirosStatus === 'ok') txt = `O código ${escapeHtml(f.codigoBruto)} não foi encontrado nos acordos nem na base de parceiros. Confira se digitou corretamente.`;
    // Base de parceiros indisponível: mensagem simples
    else txt = `Nenhum acordo foi encontrado para o código ${escapeHtml(f.codigoBruto)}.`;
    // Devolve título e explicação do caso do código
    return ['Nenhum acordo para este código', txt];
  }
  // Caso 2: a pesquisa foi por período
  if (f.ini || f.fim) return ['Nenhum acordo nesse período', 'Nenhuma vigência cadastrada se sobrepõe ao período escolhido. Ajuste as datas ou marque “Incluir acordos sem datas de vigência”.'];
  // Caso 3: filtros em geral
  return ['Nenhum acordo encontrado', 'Nenhum acordo atende aos filtros aplicados. Ajuste ou limpe os filtros para ver todos.'];
}

// Atualiza a parte visual dos filtros: contador, botão Limpar e mensagens (código inválido, período invertido, migração pendente).
// Atualiza os elementos visuais ligados aos filtros
function renderFiltrosUI(f) {
  // Quantos filtros estão ativos
  const n = contarFiltros(f);
  // Escreve o número na bolinha ao lado de 'Filtros'
  $('filterCount').textContent = n;
  // Esconde a bolinha quando não há filtros
  $('filterCount').hidden = n === 0;
  // Desativa o botão 'Limpar filtros' quando não há nada para limpar
  $('btnLimpar').disabled = !(n || f.codigoBruto || f.semDatas || $('fDe').value || $('fAte').value);

  // Linha de mensagem abaixo do campo de código
  const cm = $('codMsg');
  // Remove cores de mensagens anteriores
  cm.className = 'field-msg';
  // Marca o campo como inválido (acessibilidade e borda vermelha)
  $('fCodigo').setAttribute('aria-invalid', f.erroCodigo ? 'true' : 'false');
  // Código inválido: mostra o erro em vermelho
  if (f.erroCodigo) { cm.textContent = f.erroCodigo; cm.classList.add('err'); }
  // Sem erro: limpa a mensagem
  else cm.textContent = '';

  // Linha de mensagem abaixo das datas do período
  const pm = $('periodoMsg');
  // Remove cores anteriores
  pm.className = 'field-msg fg-12';
  // Marca as duas datas como inválidas se estiverem invertidas
  $('fDe').setAttribute('aria-invalid', f.erroPeriodo ? 'true' : 'false');
  // (idem para a data final)
  $('fAte').setAttribute('aria-invalid', f.erroPeriodo ? 'true' : 'false');
  // Período invertido: erro em vermelho
  if (f.erroPeriodo) { pm.textContent = f.erroPeriodo + ' O filtro por período foi ignorado.'; pm.classList.add('err'); }
  // Banco sem colunas de data: aviso em amarelo
  else if (!datasDisponiveis) { pm.textContent = 'Filtro por período indisponível até a migração do banco ser executada (veja o aviso no topo).'; pm.classList.add('warn'); }
  // Tudo certo: limpa a mensagem
  else pm.textContent = '';
}

// Função central que desenha a tela, em 4 passos:
// 1) lê e valida os filtros;  2) trata os estados carregando e erro;
// 3) filtra e desenha os cartões de resumo;  4) desenha as linhas ou o estado 'vazio'.
// Função principal de desenho da tela; é chamada sempre que algo muda
function renderTable() {
  // Passo 1: lê os filtros
  const f = lerFiltros();
  // Atualiza contador, botão Limpar e mensagens dos filtros
  renderFiltrosUI(f);
  // Corpo da tabela e área de mensagens
  const tbody = $('tbody'), empty = $('emptyState');

  // Passo 2a: ainda carregando, mostra o esqueleto cinza e para
  if (carga === 'carregando') {
    // Linhas cinzas na tabela
    tbody.innerHTML = skeletonRows();
    // Esconde a área de mensagens
    empty.hidden = true;
    // Cartões de resumo cinzas
    $('summary').innerHTML = Array.from({length: 6}, () => '<div class="kpi"><div class="skeleton sk-line" style="width:60%"></div><div class="skeleton sk-line" style="width:80%;height:22px;margin-top:8px"></div></div>').join('');
    // Texto de contagem
    $('countNote').textContent = 'Carregando acordos…';
    // Limpa a nota do resumo
    $('kpisNote').textContent = '';
    // Termina aqui: não há o que desenhar ainda
    return;
  }
  // Passo 2b: falha ao carregar, mostra mensagem de erro com botão 'Tentar novamente'
  if (carga === 'erro') {
    // Esvazia a tabela
    tbody.innerHTML = '';
    // Esvazia o resumo
    $('summary').innerHTML = '';
    $('kpisNote').textContent = '';
    $('countNote').textContent = '';
    // Mostra a área de mensagens
    empty.hidden = false;
    // Escreve a mensagem de erro e o botão de nova tentativa
    empty.innerHTML = estadoHtml('err', 'alert', 'Não foi possível carregar os acordos', escapeHtml(cargaErro || 'Verifique a conexão e tente novamente.'),
      `<button class="btn btn-primary" data-action="retry">${icon('refresh')}Tentar novamente</button>`);
    // Termina aqui
    return;
  }

  // Passo 3: aplica os filtros à lista de acordos
  const list = aplicarFiltros(acordos, f);
  // Desenha os cartões de resumo só com os acordos filtrados
  renderSummary(list);
  // Quantos filtros ativos
  const n = contarFiltros(f);
  // Se há filtro, avisa que o resumo é referente a ele
  $('kpisNote').textContent = n ? `Resumo referente aos filtros aplicados (${list.length} de ${acordos.length} acordos).` : '';
  // Mostra 'X de Y acordos'
  $('countNote').textContent = `${list.length} de ${acordos.length} acordo(s)`;

  // Quando se pesquisa por código, mostra abaixo do campo quem é o parceiro e quantos acordos tem
  // Parceiro pesquisado: mostra quantos acordos ele tem e quem é.
  // Só se há código válido
  if (f.codigo && !f.erroCodigo) {
    // Parceiro encontrado na base (ou null)
    const p = (typeof parceiros !== 'undefined' && parceirosStatus === 'ok') ? buscarParceiro(f.codigo) : null;
    // Linha de mensagem do código
    const cm = $('codMsg');
    // Encontrou acordos: mensagem verde com a quantidade e o nome
    if (list.length) {
      // Texto: 'N acordo(s) do parceiro X — RAZÃO SOCIAL'
      cm.textContent = `${list.length} acordo(s) do parceiro ${f.codigoBruto}` + (p && p.razao ? ' — ' + p.razao : '');
      // Cor verde
      cm.classList.add('ok');
    } else {
      // Não encontrou acordos: mensagem amarela
      // Mostra o nome do parceiro (se existir na base) ou um aviso
      cm.textContent = p && p.razao ? p.razao : 'Nenhum acordo para este código.';
      // Cor amarela
      cm.classList.add('warn');
    }
  }

  // Passo 4a: lista vazia, mostra a tela de 'nenhum resultado'
  if (list.length === 0) {
    // Esvazia a tabela
    tbody.innerHTML = '';
    // Mostra a área de mensagens
    empty.hidden = false;
    // Não existe nenhum acordo cadastrado: convida a criar o primeiro
    if (acordos.length === 0) {
      // Mensagem + botão 'Novo acordo'
      empty.innerHTML = estadoHtml('', 'inbox', 'Nenhum acordo cadastrado', 'Cadastre o primeiro acordo para começar o acompanhamento.',
        `<button class="btn btn-primary" data-action="novo">${icon('plus')}Novo acordo</button>`);
    } else {
      // Existem acordos, mas os filtros esconderam todos
      // Pega título e texto adequados ao motivo
      const [t, d] = mensagemSemResultado(f);
      // Mensagem + botão 'Limpar filtros e ver todos'
      empty.innerHTML = estadoHtml('', 'search', t, d, `<button class="btn btn-secondary" data-action="limpar">${icon('x')}Limpar filtros e ver todos</button>`);
    }
    // Termina aqui
    return;
  }
  // Passo 4b: há acordos, esconde a área de mensagens
  empty.hidden = true;

  // Cria uma linha de tabela (<tr>) para cada acordo e coloca no corpo da tabela
  tbody.innerHTML = list.map(r => {
    // Totais deste acordo
    const c = computeTotals(r);
    // Vermelho se há saldo a pagar; verde se não há
    const saldoClass = c.saldo > 0.01 ? 'saldo-pos' : 'saldo-zero';
    // Quantos meses têm anotação de 'sem giro'
    const semGiroCount = Object.values(r.meses || {}).filter(mm => mm && mm.nota).length;
    // Etiqueta 'Assinado' ou 'Não assinado'
    const assinadoChip = r.assinado === false
      ? '<span class="chip pendente">Não assinado</span>'
      : '<span class="chip ok">Assinado</span>';
    // Etiqueta 'Meta batida' ou 'Meta não batida' (nada se ainda a definir)
    const metaChip = c.metaBatida === true ? '<span class="chip ok">Meta batida</span>'
      : (c.metaBatida === false ? '<span class="chip pendente">Meta não batida</span>' : '');
    // Porcentagem da meta atingida
    const pct = c.percAtingido;
    // Barra de progresso (limitada a 100% de largura)
    const barra = pct === null ? '' : `<div class="progress${pct >= 1 ? ' done' : ''}" role="img" aria-label="${fmtPct(pct)} da meta"><span style="width:${Math.min(pct * 100, 100)}%"></span></div>`;
    // Monta a linha da tabela com todas as colunas deste acordo
    return `
      <tr>
        <td class="c-cliente" data-label="Cliente">
          <div class="cell-main">${escapeHtml(r.cliente || '(sem nome)')}</div>
          <div class="cell-sub">Cód. ${escapeHtml(r.codCliente||'—')} · Acordo ${escapeHtml(r.numeroAcordo||'—')}</div>
        </td>
        <td data-label="Consultor">${escapeHtml(r.consultor||'—')}</td>
        <td data-label="Tipo"><span class="tipo-pill">${escapeHtml(r.tipo||'—')}</span></td>
        <td data-label="Vigência">${vigenciaHtml(r)}</td>
        <td data-label="Situação"><div class="chips">${statusTag(r.status)}${assinadoChip}${metaChip}</div></td>
        <td class="num" data-label="Realizado">${fmtMoney(c.totalRealizado)}${semGiroCount > 0 ? `<div class="semgiro">${semGiroCount} mês(es) sem giro</div>` : ''}</td>
        <td class="num" data-label="% Meta"><span class="progress-label">${fmtPct(pct)}</span>${barra}</td>
        <td class="num" data-label="Investimento">${fmtMoney(c.valorInvest)}</td>
        <td class="num" data-label="Pago">${fmtMoney(c.totalPago)}</td>
        <td class="num ${saldoClass}" data-label="Saldo">${fmtMoney(c.saldo)}</td>
        <td class="c-actions"><button class="btn btn-secondary btn-sm" data-edit="${escapeHtml(r.id)}">${icon('edit')}Editar</button></td>
      </tr>`;
  }).join('');
}
