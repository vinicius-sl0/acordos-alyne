// ---------- modal / form ----------
// ---------- formulário do acordo ----------
// Monta a grade de 12 meses (acordado, realizado e 'sem giro?') dentro do formulário.
// meses = valores já salvos do acordo (ou vazio, num acordo novo)
function buildMesesTable(meses) {
  // Se não vierem meses, usa um objeto vazio
  meses = meses || {};
  // Cabeçalho da grade: uma coluna vazia + jan..dez
  let head = '<thead><tr><th></th>' + MESES_LABEL.map(m=>`<th>${m}</th>`).join('') + '</tr></thead>';
  // Linha 'Acordado': um campo numérico por mês
  let acRow = '<td class="rowlabel">Acordado</td>' + MESES.map(m => {
    // Valores do mês atual
    const mm = meses[m] || {};
    // Valor a mostrar no campo (vazio se não houver)
    const v = (mm.acordado === undefined || mm.acordado === null) ? '' : mm.acordado;
    // Campo numérico; data-mes e data-campo identificam o mês e o tipo para a leitura posterior
    return `<td><input type="number" step="0.01" aria-label="Acordado ${m}" data-mes="${m}" data-campo="acordado" value="${v}"></td>`;
  }).join('');
  // Linha 'Realizado': igual à anterior, para o valor realizado
  let reRow = '<td class="rowlabel">Realizado</td>' + MESES.map(m => {
    // Valores do mês atual
    const mm = meses[m] || {};
    // Valor a mostrar no campo
    const v = (mm.realizado === undefined || mm.realizado === null) ? '' : mm.realizado;
    // Campo numérico do realizado
    return `<td><input type="number" step="0.01" aria-label="Realizado ${m}" data-mes="${m}" data-campo="realizado" value="${v}"></td>`;
  }).join('');
  // Linha 'Sem giro?': campo de texto para anotar que o cliente não comprou no mês
  let notaRow = '<td class="rowlabel">Sem giro?</td>' + MESES.map(m => {
    // Valores do mês atual
    const mm = meses[m] || {};
    // Anotação já salva (escapada para ser segura em HTML)
    const v = mm.nota ? escapeHtml(mm.nota) : '';
    // Campo de texto curto (máximo 24 caracteres)
    return `<td><input type="text" class="nota-input" maxlength="24" placeholder="—" aria-label="Sem giro ${m}" data-mes="${m}" data-campo="nota" value="${v}"></td>`;
  }).join('');
  // Junta cabeçalho e as três linhas e coloca na página
  $('mesesTable').innerHTML = head + `<tbody><tr>${acRow}</tr><tr>${reRow}</tr><tr class="nota-row">${notaRow}</tr></tbody>`;
  // Qualquer digitação na grade recalcula os totais do formulário
  $('mesesTable').querySelectorAll('input').forEach(inp => inp.addEventListener('input', updateComputedPreview));
}

// Lê a grade de meses guardando só os meses preenchidos. 'nota' é o texto de 'sem giro' (ex.: cliente não comprou).
// Lê os valores digitados na grade de meses
function readMesesFromForm() {
  // Objeto que vai receber os meses preenchidos
  const meses = {};
  // Passa por jan..dez
  MESES.forEach(m => {
    // Valor acordado digitado no mês
    const ac = $('mesesTable').querySelector(`input[data-mes="${m}"][data-campo="acordado"]`).value;
    // Valor realizado digitado no mês
    const re = $('mesesTable').querySelector(`input[data-mes="${m}"][data-campo="realizado"]`).value;
    // Campo de anotação do mês
    const notaInput = $('mesesTable').querySelector(`input[data-mes="${m}"][data-campo="nota"]`);
    // Texto da anotação sem espaços nas pontas
    const nota = notaInput ? notaInput.value.trim() : '';
    // Só guarda o mês se algum dos três campos foi preenchido
    if (ac !== '' || re !== '' || nota !== '') {
      // Guarda os três valores do mês
      meses[m] = {
        // Vazio vira null; senão vira número
        acordado: ac === '' ? null : Number(ac),
        // Idem para o realizado
        realizado: re === '' ? null : Number(re),
        // Idem para a anotação
        nota: nota === '' ? null : nota,
      };
    }
  });
  // Devolve só os meses preenchidos
  return meses;
}

// Marca o contrato como assinado ou não e pinta o cartão (verde = assinado, vermelho = pendente).
// Define se o contrato está assinado (val = true ou false)
function setAssinado(val) {
  // Guarda a escolha na variável global
  assinadoAtual = val;
  // Cartão 'Contrato assinado?'
  const card = $('signedCard');
  // Destaca o botão 'Sim' se estiver assinado
  $('btnAssinadoSim').classList.toggle('active', val === true);
  // Aplica o estilo verde ao botão 'Sim'
  $('btnAssinadoSim').classList.add('sim');
  // Destaca o botão 'Ainda não' se não estiver assinado
  $('btnAssinadoNao').classList.toggle('active', val === false);
  // Aplica o estilo vermelho ao botão 'Ainda não'
  $('btnAssinadoNao').classList.add('nao');
  // Borda verde no cartão se assinado
  card.classList.toggle('is-signed', val === true);
  // Borda vermelha no cartão se não assinado
  card.classList.toggle('is-pending', val === false);
}

// Seletor 'Meta batida?': Bateu / Não bateu / A definir. Pinta o cartão, mostra o aviso de saldo zerado e recalcula os totais.
// val = true (bateu), false (não bateu) ou null (a definir)
function setMeta(val) {
  // Guarda a escolha; qualquer valor diferente de true/false vira null
  metaBatidaAtual = (val === true || val === false) ? val : null;
  // Destaca o botão 'Bateu'
  $('btnMetaSim').classList.toggle('active', metaBatidaAtual === true);
  // Destaca o botão 'Não bateu'
  $('btnMetaNao').classList.toggle('active', metaBatidaAtual === false);
  // Destaca o botão 'A definir'
  $('btnMetaIndef').classList.toggle('active', metaBatidaAtual === null);
  // Borda verde no cartão se bateu a meta
  $('metaCard').classList.toggle('is-signed', metaBatidaAtual === true);
  // Borda vermelha se não bateu
  $('metaCard').classList.toggle('is-pending', metaBatidaAtual === false);
  // Mostra o aviso de 'saldo zerado' só quando não bateu a meta
  $('metaAviso').hidden = metaBatidaAtual !== false;
  // Recalcula investimento e saldo na faixa de totais
  updateComputedPreview();
}

// Alterna a regra de investimento entre '% sobre o realizado' e 'valor fixo', mostrando só o campo correspondente.
// tipo = 'percentual' ou 'fixo'
function setRegraTipo(tipo) {
  // Guarda a escolha
  regraTipoAtual = tipo;
  // Destaca o botão '% sobre o realizado' quando escolhido
  $('btnRegraPerc').classList.toggle('active', tipo === 'percentual');
  // Destaca o botão 'Valor fixo' quando escolhido
  $('btnRegraFixo').classList.toggle('active', tipo === 'fixo');
  // Mostra o campo de percentual só na regra percentual
  $('campoPercentual').style.display = tipo === 'percentual' ? 'block' : 'none';
  // Mostra o campo de valor fixo só na regra fixa
  $('campoFixo').style.display = tipo === 'fixo' ? 'block' : 'none';
  // Recalcula a faixa de totais
  updateComputedPreview();
}

// Lê todos os campos do formulário e devolve o acordo no formato interno.
// O percentual é digitado em % e guardado como fração (5 vira 0.05).
// Lê o formulário inteiro e devolve um acordo
function readFormRecord() {
  // Percentual digitado (número ou NaN se vazio)
  const percVal = parseFloat($('fPercentual').value);
  // Valor fixo digitado (número ou NaN se vazio)
  const fixoVal = parseFloat($('fValorFixo').value);
  // Objeto com todos os campos do acordo
  return {
    // Número do acordo
    numeroAcordo: $('fNumero').value.trim(),
    // Código do cliente/parceiro
    codCliente: $('fCodCliente').value.trim(),
    // Sell In ou Sell Out
    tipo: $('fFTipo').value,
    // Razão social / nome do cliente
    cliente: $('fCliente').value.trim(),
    // Consultor de vendas
    consultor: $('fConsultorForm').value.trim(),
    // Coordenador
    coord: $('fCoord').value.trim(),
    // Em andamento, encerrado ou pendente
    status: $('fFStatus').value,
    // Data de início do acordo (AAAA-MM-DD ou vazio)
    dataInicio: $('fDataInicio').value,
    // Data de término do acordo
    dataFim: $('fDataFim').value,
    // Texto livre com a data do pagamento
    dataPagamento: $('fDataPagamento').value.trim(),
    // Contrato assinado (true/false)
    assinado: assinadoAtual,
    // Meta batida (true/false/null)
    metaBatida: metaBatidaAtual,
    // Valores mensais (acordado, realizado, anotação)
    meses: readMesesFromForm(),
    // Regra de investimento
    regraPagamento: {
      // 'percentual' ou 'fixo'
      tipo: regraTipoAtual,
      // Percentual vira fração (5 → 0.05); valor fixo fica como digitado; vazio vira 0
      valor: regraTipoAtual === 'percentual' ? (isNaN(percVal) ? 0 : percVal/100) : (isNaN(fixoVal) ? 0 : fixoVal)
    },
    // Valores já pagos em cada forma
    pagamentos: {
      // Cartão presente Swile (vazio = 0)
      swile: parseFloat($('fSwile').value) || 0,
      // Bonificação em produtos
      bonificado: parseFloat($('fBonificado').value) || 0,
      // Desconto em boleto
      descBoleto: parseFloat($('fDescBoleto').value) || 0,
      // Pagamento em boleto
      boleto: parseFloat($('fBoleto').value) || 0,
      // Brindes
      brindes: parseFloat($('fBrindes').value) || 0,
    },
    // Observações
    obs: $('fObs').value.trim(),
  };
}

// Valida as datas do formulário. Devolve a mensagem de erro (ou '' se estiver tudo certo).
// Confere as datas do formulário; devolve a mensagem de erro ou '' se estiver tudo certo
function validarDatasForm() {
  // a = início e b = término digitados
  const a = $('fDataInicio').value, b = $('fDataFim').value;
  // Mensagem de erro (vazia = sem erro)
  let msg = '';
  // Data que não existe de verdade
  if ((a && !dataValida(a)) || (b && !dataValida(b))) msg = 'Informe datas válidas.';
  // Término antes do início (mesmo dia é permitido)
  else if (a && b && b < a) msg = 'A data de término não pode ser anterior à data de início.';
  // Mostra (ou apaga) a mensagem abaixo das datas
  $('dataMsg').textContent = msg;
  // Marca os campos como inválidos (borda vermelha)
  $('fDataFim').setAttribute('aria-invalid', msg ? 'true' : 'false');
  // (idem para o início)
  $('fDataInicio').setAttribute('aria-invalid', msg ? 'true' : 'false');
  // Devolve a mensagem para quem chamou
  return msg;
}

// Faixa de totais do formulário: recalcula ao vivo a cada digitação.
// Atualiza a faixa de totais no pé do formulário
function updateComputedPreview() {
  // Lê o formulário do jeito que está agora
  const rec = readFormRecord();
  // Calcula os totais com esses valores
  const c = computeTotals(rec);
  // Escreve os 5 totais: acordado, realizado, % da meta, investimento devido e saldo
  $('computedStrip').innerHTML = `
    <div class="c"><div class="l">Total acordado</div><div class="v">${fmtMoney(c.totalAcordado)}</div></div>
    <div class="c"><div class="l">Total realizado</div><div class="v">${fmtMoney(c.totalRealizado)}</div></div>
    <div class="c"><div class="l">% da meta</div><div class="v">${fmtPct(c.percAtingido)}</div></div>
    <div class="c"><div class="l">Investimento devido</div><div class="v">${fmtMoney(c.valorInvest)}</div></div>
    <div class="c"><div class="l">Saldo a pagar</div><div class="v">${fmtMoney(c.saldo)}</div></div>
  `;
}

// Abre o formulário. Com id = edita um acordo existente; sem id = novo acordo.
// Preenche os campos e desabilita as datas se o banco ainda não foi migrado.
// Abre o formulário; id = acordo a editar (vazio = novo)
function openModal(id) {
  // Guarda qual acordo está em edição
  editingId = id || null;
  // Título muda entre 'Editar' e 'Novo'
  $('modalTitle').textContent = id ? 'Editar acordo' : 'Novo acordo';
  // O botão Excluir só aparece ao editar
  $('btnExcluir').style.display = id ? 'inline-flex' : 'none';

  // Acordo a mostrar (vazio quando é novo)
  const rec = id ? (acordos.find(r => r.id === id) || {}) : {};
  // Preenche os campos de identificação...
  $('fNumero').value = rec.numeroAcordo || '';
  $('fCodCliente').value = rec.codCliente || '';
  $('fFTipo').value = rec.tipo || 'SELL IN';
  $('fCliente').value = rec.cliente || '';
  $('fConsultorForm').value = rec.consultor || '';
  $('fCoord').value = rec.coord || '';
  // ...até o status
  $('fFStatus').value = rec.status || 'em andamento';
  // Preenche as datas de vigência
  $('fDataInicio').value = rec.dataInicio || '';
  $('fDataFim').value = rec.dataFim || '';
  // Desativa as datas se o banco ainda não tem as colunas
  $('fDataInicio').disabled = $('fDataFim').disabled = !datasDisponiveis;
  // Limpa mensagens de erro antigas
  validarDatasForm();
  // Explica por que as datas estão desativadas
  if (!datasDisponiveis) $('dataMsg').textContent = 'Datas de vigência indisponíveis até a migração do banco ser executada (veja o aviso no topo).';
  // Data do pagamento
  $('fDataPagamento').value = rec.dataPagamento || '';
  // Observações
  $('fObs').value = rec.obs || '';
  // Limpa a dica do código do cliente
  $('codHint').textContent = '';
  $('codHint').className = 'hint';

  // Marca assinado (padrão: assinado)
  setAssinado(rec.assinado === false ? false : true);
  // Monta a grade de meses com os valores do acordo
  buildMesesTable(rec.meses);
  // Desativa os botões de meta se o banco ainda não tem a coluna
  ['btnMetaSim','btnMetaNao','btnMetaIndef'].forEach(id => { $(id).disabled = !metaDisponivel; });
  // Mostra o aviso de indisponibilidade quando for o caso
  $('metaIndisponivel').hidden = metaDisponivel;

  // Regra de pagamento do acordo
  const regra = rec.regraPagamento || {tipo:'percentual', valor:0};
  // Seleciona percentual ou fixo
  setRegraTipo(regra.tipo === 'fixo' ? 'fixo' : 'percentual');
  // Percentual volta de fração para % (0.05 → 5)
  $('fPercentual').value = regra.tipo === 'percentual' && regra.valor ? (regra.valor*100) : '';
  // Valor fixo, se for o caso
  $('fValorFixo').value = regra.tipo === 'fixo' && regra.valor ? regra.valor : '';

  // Pagamentos já feitos
  const pg = rec.pagamentos || {};
  // Preenche cada forma de pagamento...
  $('fSwile').value = pg.swile || '';
  $('fBonificado').value = pg.bonificado || '';
  $('fDescBoleto').value = pg.descBoleto || '';
  $('fBoleto').value = pg.boleto || '';
  // ...até brindes
  $('fBrindes').value = pg.brindes || '';

  // Marca a meta (bateu / não bateu / a definir) e recalcula os totais
  setMeta(metaDisponivel ? (rec.metaBatida === undefined ? null : rec.metaBatida) : null);
  // Mostra a janela
  $('overlay').classList.add('open');
  // Volta ao topo da janela
  $('overlay').scrollTop = 0;
}

// Fecha o formulário e esquece qual acordo estava sendo editado.
// Fecha a janela do acordo
function closeModal() {
  // Esconde a janela
  $('overlay').classList.remove('open');
  // Esquece o acordo editado
  editingId = null;
}
