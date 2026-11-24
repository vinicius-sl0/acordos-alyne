// ---------- mapeamento JS (camelCase) <-> Supabase (snake_case) ----------
// Formato interno -> linha do banco. As colunas de data só são enviadas se o banco já foi migrado.
// Recebe o acordo no formato do programa e devolve a linha no formato da tabela do banco
function toDbRow(rec) {
  // Campos que sempre existem na tabela
  const row = {
    // Texto vazio vira null (vazio no banco)...
    numero_acordo: rec.numeroAcordo || null,
    cod_cliente: rec.codCliente || null,
    tipo: rec.tipo || null,
    cliente: rec.cliente || null,
    consultor: rec.consultor || null,
    coord: rec.coord || null,
    status: rec.status || 'em andamento',
    data_pagamento: rec.dataPagamento || null,
    assinado: rec.assinado === false ? false : true,
    meses: rec.meses || {},
    regra_pagamento: rec.regraPagamento || {tipo:'percentual', valor:0},
    pagamentos: rec.pagamentos || {},
    obs: rec.obs || null,
    // Marca se o acordo veio da planilha original
    importado_da_planilha: rec.importadoDaPlanilha || false,
    // Data e hora desta gravação
    updated_at: new Date().toISOString(),
  };
  // Só envia as colunas de vigência se o banco já foi migrado (evita erro em bancos antigos).
  // Só envia as datas se o banco já tiver essas colunas (evita erro)
  if (datasDisponiveis) {
    // Data de início válida ou null
    row.data_inicio = dataValida(rec.dataInicio) ? rec.dataInicio : null;
    // Data de término válida ou null
    row.data_fim = dataValida(rec.dataFim) ? rec.dataFim : null;
  }
  // Só envia 'meta batida' se a coluna existir: true, false ou null
  if (metaDisponivel) row.meta_batida = rec.metaBatida === true ? true : (rec.metaBatida === false ? false : null);
  // Devolve a linha pronta para o Supabase
  return row;
}

// Linha do banco -> formato interno. Acordos antigos (sem datas) viram dataInicio/dataFim vazios, sem erro.
// Faz o caminho inverso: linha do banco → acordo no formato do programa
function fromDbRow(row) {
  // Normaliza a data vinda do banco (pega AAAA-MM-DD, ou '' se inválida/ausente)
  const dt = (v) => (typeof v === 'string' && dataValida(v.slice(0, 10))) ? v.slice(0, 10) : '';
  // Cada campo do banco (snake_case) vira um campo do programa (camelCase)
  return {
    id: row.id,
    numeroAcordo: row.numero_acordo || '',
    codCliente: row.cod_cliente || '',
    tipo: row.tipo || '',
    cliente: row.cliente || '',
    consultor: row.consultor || '',
    coord: row.coord || '',
    status: row.status || 'em andamento',
    // Acordos antigos não têm datas: viram '' sem causar erro
    dataInicio: dt(row.data_inicio),
    dataFim: dt(row.data_fim),
    dataPagamento: row.data_pagamento || '',
    assinado: row.assinado === false ? false : true,
    // true, false ou null (a definir)
    metaBatida: row.meta_batida === true ? true : (row.meta_batida === false ? false : null),
    meses: row.meses || {},
    regraPagamento: row.regra_pagamento || {tipo:'percentual', valor:0},
    pagamentos: row.pagamentos || {},
    obs: row.obs || '',
    importadoDaPlanilha: row.importado_da_planilha || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Traduz erros técnicos do banco em mensagens claras (regra de datas violada, colunas de vigência ausentes).
// Transforma erros técnicos do banco em frases que o usuário entende
function erroAmigavel(e) {
  // Texto técnico do erro
  const msg = (e && e.message) || '';
  // Violou a regra 'término depois do início'
  if ((e && e.code === '23514') || msg.includes('acordos_vigencia_valida')) return 'A data de término não pode ser anterior à data de início.';
  // Coluna não existe: falta rodar a migração
  if ((e && e.code === '42703') || /data_inicio|data_fim|meta_batida/.test(msg)) return 'O banco ainda não tem as colunas novas (vigência / meta batida). Rode a migração SQL indicada no aviso do topo.';
  // Outros erros: mostra o texto original
  return msg || 'erro desconhecido';
}

// Mostra (ou esconde) o aviso amarelo com o SQL da migração, quando o banco ainda não tem as colunas de datas.
// Mostra o aviso da migração só se faltar alguma coluna nova
function renderAvisoMigracao() {
  // Área do aviso, no topo da página
  const box = $('migracaoAviso');
  // Tudo migrado: esconde o aviso
  if (datasDisponiveis && metaDisponivel) { box.hidden = true; box.innerHTML = ''; return; }
  // Falta migrar: mostra o aviso
  box.hidden = false;
  // Monta o aviso com o SQL pronto para copiar
  box.innerHTML = `<div class="alert warn">${icon('calendar')}<div class="alert-body">
    <strong>Falta um passo no banco de dados para usar os campos novos (datas de vigência e meta batida).</strong>
    <p>No Supabase, abra <em>SQL Editor</em>, cole o comando abaixo e clique em <em>Run</em>. Ele só adiciona colunas vazias e não altera nenhum acordo existente. Depois recarregue esta página.</p>
    <textarea readonly rows="5" id="sqlMigracao" aria-label="SQL da migração">${escapeHtml(MIGRACAO_SQL)}</textarea>
    <button class="btn btn-secondary btn-sm" type="button" data-action="copiar-sql">${icon('copy')}Copiar SQL</button>
  </div></div>`;
}

// Habilita ou desabilita todos os campos de data (filtros e formulário) conforme o banco tenha ou não as colunas.
// Liga/desliga os campos conforme as colunas existam
function aplicarDisponibilidadeDatas() {
  // Atualiza o aviso
  renderAvisoMigracao();
  // Filtros de período
  ['fDe','fAte'].forEach(id => { $(id).disabled = !datasDisponiveis; });
  // Caixa 'Incluir acordos sem datas'
  $('fSemDatas').disabled = !datasDisponiveis;
  // Datas do formulário
  $('fDataInicio').disabled = $('fDataFim').disabled = !datasDisponiveis;
  // Botões de meta batida
  ['btnMetaSim','btnMetaNao','btnMetaIndef'].forEach(id => { $(id).disabled = !metaDisponivel; });
}

// Descobre se as colunas de vigência existem no banco (consulta de 1 linha, sem alterar nada).
// Pergunta ao banco se as colunas novas existem (consulta de 1 linha, não altera nada)
async function verificarColunasDatas() {
  // Teste 1: colunas de data
  try {
    // Tenta ler as duas colunas de data
    const { error } = await supabaseClient.from('acordos').select('data_inicio,data_fim').limit(1);
    // Erro de 'coluna inexistente': marca datas como indisponíveis
    if (error && (error.code === '42703' || /data_inicio|data_fim/.test(error.message || ''))) datasDisponiveis = false;
  } catch (e) { console.error(e); }
    // Falha de rede: só registra no console
  // Teste 2: coluna de meta batida
  try {
    // Tenta ler a coluna meta_batida
    const r2 = await supabaseClient.from('acordos').select('meta_batida').limit(1);
    // Coluna inexistente: marca meta como indisponível
    if (r2.error && (r2.error.code === '42703' || /meta_batida/.test(r2.error.message || ''))) metaDisponivel = false;
  } catch (e) { console.error(e); }
    // Falha de rede: só registra no console
  // Aplica o resultado na tela
  aplicarDisponibilidadeDatas();
}

// Salva o acordo (cria ou atualiza): valida nome e datas, grava no Supabase, fecha o formulário e recarrega a lista.
// Botão 'Salvar acordo'
async function saveRecord() {
  // Sem conexão com o banco: avisa e para
  if (!supabaseClient) { showToast('Conexão com o banco de dados indisponível.', 'erro'); return; }
  // Lê o formulário
  const rec = readFormRecord();
  // Nome do cliente é obrigatório
  if (!rec.cliente) { showToast('Informe o nome do cliente.', 'erro'); $('fCliente').focus(); return; }
  // Valida as datas (se estiverem disponíveis)
  const erroData = datasDisponiveis ? validarDatasForm() : '';
  // Datas inválidas: avisa e não salva
  if (erroData) { showToast(erroData, 'erro'); $('fDataFim').focus(); return; }
  // Botão de salvar
  const btn = $('btnSalvar');
  // Desativa o botão para evitar clique duplo
  btn.disabled = true;
  // Troca o texto para 'Salvando…'
  btn.querySelector('span').textContent = 'Salvando…';
  // Tenta gravar
  try {
    // Edição: atualiza o acordo existente
    if (editingId) {
      // Converte para o formato do banco
      const row = toDbRow(rec);
      // Na edição não mexe na marca 'veio da planilha'
      delete row.importado_da_planilha; // ao editar, não mexe na origem do registro (veio da planilha ou não)
      // UPDATE no banco, apenas do acordo com este id
      const { error } = await supabaseClient.from('acordos').update(row).eq('id', editingId);
      // Se o banco devolveu erro, cai no bloco catch
      if (error) throw error;
      // Aviso de sucesso
      showToast('Acordo atualizado.');
    } else {
      // Acordo novo...
      // INSERT: cria o acordo no banco
      const { error } = await supabaseClient.from('acordos').insert([toDbRow(rec)]);
      // Erro: vai para o catch
      if (error) throw error;
      // Aviso de sucesso
      showToast('Acordo criado.');
    }
    // Fecha o formulário
    closeModal();
    // Recarrega a lista para mostrar a alteração
    await loadAcordos();
  } catch (e) {
    // Se algo deu errado...
    // Registra o erro técnico no console do navegador
    console.error(e);
    // Mostra o erro em português
    showToast('Não foi possível salvar: ' + erroAmigavel(e), 'erro');
  } finally {
    // Sempre executa, dando certo ou não
    // Reativa o botão
    btn.disabled = false;
    // Volta o texto original do botão
    btn.querySelector('span').textContent = 'Salvar acordo';
  }
}

// Exclui o acordo aberto no formulário, depois de pedir confirmação.
// Botão 'Excluir'
async function deleteRecord() {
  // Só exclui se há um acordo aberto e conexão
  if (!editingId || !supabaseClient) return;
  // Pede confirmação; se o usuário cancelar, para
  if (!confirm('Excluir este acordo definitivamente?')) return;
  // Tenta excluir
  try {
    // DELETE do acordo com este id
    const { error } = await supabaseClient.from('acordos').delete().eq('id', editingId);
    // Erro: vai para o catch
    if (error) throw error;
    // Aviso de sucesso
    showToast('Acordo excluído.');
    // Fecha o formulário
    closeModal();
    // Recarrega a lista
    await loadAcordos();
  } catch (e) {
    // Falha ao excluir
    // Registra no console
    console.error(e);
    // Avisa o usuário
    showToast('Não foi possível excluir.', 'erro');
  }
}

// ---------- data loading ----------
// Busca todos os acordos no Supabase, converte para o formato interno e redesenha a tela.
// Se falhar, mostra o estado de erro com o botão 'Tentar novamente'.
// Carrega todos os acordos do banco e redesenha a tela
async function loadAcordos() {
  // Sem conexão: não faz nada
  if (!supabaseClient) return;
  // Na primeira carga mostra o esqueleto cinza
  if (carga !== 'ok') { carga = 'carregando'; renderTable(); }
  // Tenta buscar
  try {
    // SELECT * da tabela acordos, ordenado pelo nome do cliente
    const { data, error } = await supabaseClient.from('acordos').select('*').order('cliente', { ascending: true });
    // Erro: vai para o catch
    if (error) throw error;
    // Se o banco devolve linhas sem as colunas de vigência, a migração ainda não foi rodada.
    // Linhas sem a coluna de data: banco ainda não migrado
    if (data && data.length && !('data_inicio' in data[0]) && datasDisponiveis) { datasDisponiveis = false; aplicarDisponibilidadeDatas(); }
    // Linhas sem a coluna de meta: banco ainda não migrado
    if (data && data.length && !('meta_batida' in data[0]) && metaDisponivel) { metaDisponivel = false; aplicarDisponibilidadeDatas(); }
    // Converte cada linha do banco para o formato do programa e guarda na lista global
    acordos = (data || []).map(fromDbRow);
    // Carregamento concluído
    carga = 'ok';
    // Apaga avisos antigos do topo
    setStatus('');
    // Atualiza a lista de consultores do filtro
    populateConsultorFilter(acordos);
    // Desenha a tabela e o resumo
    renderTable();
  } catch (e) {
    // Falhou ao carregar...
    // Registra no console
    console.error(e);
    // Marca como erro
    carga = 'erro';
    // Texto de ajuda mostrado na tela de erro
    cargaErro = 'Verifique a conexão, a URL/chave do Supabase e se a tabela "acordos" foi criada. (' + erroAmigavel(e) + ')';
    // Desenha a tela de erro com 'Tentar novamente'
    renderTable();
  }
}

// Tempo real: quando outra pessoa altera um acordo, a lista é recarregada sozinha.
// Ativa o recebimento de mudanças em tempo real
function subscribeAcordos() {
  // Sem conexão: nada a fazer
  if (!supabaseClient) return;
  // Abre um canal que 'escuta' a tabela acordos...
  supabaseClient
    .channel('acordos-changes')
    // ...e a cada inserção, alteração ou exclusão (de qualquer pessoa)...
    .on('postgres_changes', { event: '*', schema: 'public', table: 'acordos' }, () => {
      // ...recarrega a lista automaticamente
      loadAcordos();
    })
    // Começa a escutar
    .subscribe();
}
