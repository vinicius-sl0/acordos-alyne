// Ponto de entrada: confere a configuração, conecta ao Supabase e carrega tudo na ordem:
// colunas de datas, importação inicial, acordos, tempo real e base de parceiros.
// Roda uma vez, quando a página abre
async function init() {
  // Confere se a URL/chave do Supabase foram preenchidas (ainda não são os textos de exemplo)
  if (SUPABASE_URL.includes('SEU-PROJETO') || SUPABASE_KEY.includes('SUA-CHAVE')) {
    // Não configurado: mostra o erro na tela
    carga = 'erro'; cargaErro = 'Configure SUPABASE_URL e SUPABASE_KEY no arquivo js/config.js antes de usar.'; renderTable();
    // Para aqui
    return;
  }
  // Tenta criar a conexão
  try {
    // Cria a conexão com o banco usando a biblioteca do Supabase (carregada no index.html)
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (e) {
    // Se não conseguiu conectar...
    // Registra no console
    console.error(e);
    // Mostra o erro na tela
    carga = 'erro'; cargaErro = 'Não foi possível conectar ao Supabase. Verifique a URL e a chave.'; renderTable();
    // Para aqui
    return;
  }
  // 1) Descobre se as colunas novas (datas e meta) existem no banco
  await verificarColunasDatas();
  // 2) Importa os acordos da planilha, se o banco estiver vazio
  await runImportIfNeeded();
  // 3) Carrega os acordos e desenha a tela
  await loadAcordos();
  // 4) Liga as atualizações em tempo real
  subscribeAcordos();
  // 5) Carrega a base de parceiros (para o preenchimento automático)
  await loadParceiros();
  // 6) Redesenha, agora que a base de parceiros chegou (para mostrar o nome do parceiro pesquisado)
  renderTable();
}

// ---------- events ----------
// Liga os botões e campos às funções: cabeçalho, formulário do acordo e janela da base de parceiros.
// Botão 'Novo acordo': abre o formulário vazio
$('btnNovo').addEventListener('click', () => openModal(null));
// Botão 'Base de parceiros': abre a janela de parceiros
$('btnParceiros').addEventListener('click', abrirParceiros);
// 'X' da janela de parceiros: fecha
$('btnParcClose').addEventListener('click', fecharParceiros);
// Botão 'Fechar' da janela de parceiros
$('btnParcFechar').addEventListener('click', fecharParceiros);
// Clique no fundo escuro fora da janela também fecha
$('overlayParc').addEventListener('click', (e) => { if (e.target.id === 'overlayParc') fecharParceiros(); });
// Consulta rápida de código enquanto digita
$('parcBusca').addEventListener('input', consultarCodigoParceiro);
// Escolha da planilha de parceiros: lê o arquivo
$('parcArquivo').addEventListener('change', (e) => lerArquivoParceiros(e.target.files && e.target.files[0]));
// Troca de aba da planilha: recarrega as colunas
$('parcAba').addEventListener('change', carregarAbaParceiros);
// Troca de coluna: atualiza a prévia da importação
['parcColCod','parcColRaz','parcColVend','parcColCoord'].forEach(id => $(id).addEventListener('change', atualizarPreviaParceiros));
// Botão 'Importar parceiros'
$('btnParcImportar').addEventListener('click', importarParceiros);
// Digitando o código do cliente: busca o parceiro (com pequena espera)
$('fCodCliente').addEventListener('input', onCodInput);
// Ao sair do campo: preenche razão social, vendedor e coordenador
$('fCodCliente').addEventListener('change', aplicarParceiroNoForm);
// 'X' do formulário: fecha
$('btnClose').addEventListener('click', closeModal);
// Botão 'Cancelar': fecha sem salvar
$('btnCancelar').addEventListener('click', closeModal);
// Botão 'Salvar acordo'
$('btnSalvar').addEventListener('click', saveRecord);
// Botão 'Excluir'
$('btnExcluir').addEventListener('click', deleteRecord);
// Clique no fundo escuro fecha o formulário
$('overlay').addEventListener('click', (e) => { if (e.target.id === 'overlay') closeModal(); });
// Escolhe a regra '% sobre o realizado'
$('btnRegraPerc').addEventListener('click', () => setRegraTipo('percentual'));
// Escolhe a regra 'Valor fixo'
$('btnRegraFixo').addEventListener('click', () => setRegraTipo('fixo'));
// Contrato assinado: sim
$('btnAssinadoSim').addEventListener('click', () => setAssinado(true));
// Contrato assinado: ainda não
$('btnAssinadoNao').addEventListener('click', () => setAssinado(false));
// Meta batida: sim
$('btnMetaSim').addEventListener('click', () => setMeta(true));
// Meta batida: não (zera o saldo a pagar)
$('btnMetaNao').addEventListener('click', () => setMeta(false));
// Meta batida: a definir
$('btnMetaIndef').addEventListener('click', () => setMeta(null));
// Qualquer valor digitado no percentual, no valor fixo ou nos pagamentos recalcula os totais do formulário
['fPercentual','fValorFixo','fSwile','fBonificado','fDescBoleto','fBoleto','fBrindes'].forEach(id => {
  // Chama o recálculo a cada digitação
  $(id).addEventListener('input', updateComputedPreview);
});
// Valida as datas do formulário a cada alteração, mostrando o erro na hora.
// Valida as datas ao digitar ou escolher no calendário
['fDataInicio','fDataFim'].forEach(id => {
  // Ao digitar
  $(id).addEventListener('input', validarDatasForm);
  // Ao escolher no calendário
  $(id).addEventListener('change', validarDatasForm);
});

// Filtros: tudo atualiza a tabela e o resumo ao mesmo tempo.
// Cada mudança nos filtros redesenha a tabela e o resumo
['fBusca','fConsultor','fStatus','fTipo','fSaldo','fDe','fAte','fSemDatas'].forEach(id => {
  // Ao digitar
  $(id).addEventListener('input', renderTable);
  // Ao escolher numa lista ou data
  $(id).addEventListener('change', renderTable);
});
// Código do parceiro: atualiza enquanto digita (com pequena espera) e imediatamente no Enter / botão Pesquisar.
// Cronômetro da espera de 250 ms no campo de código
let codTimer = null;
// Digitando o código: espera 250 ms sem digitar e então filtra
$('fCodigo').addEventListener('input', () => { clearTimeout(codTimer); codTimer = setTimeout(renderTable, 250); });
// Tecla Enter: filtra na hora
$('fCodigo').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(codTimer); renderTable(); } });
// Botão 'Pesquisar': filtra na hora (e foca o campo se estiver vazio)
$('btnPesquisar').addEventListener('click', () => { clearTimeout(codTimer); renderTable(); if (!$('fCodigo').value.trim()) $('fCodigo').focus(); });
// Botão 'Limpar filtros'
$('btnLimpar').addEventListener('click', () => { clearTimeout(codTimer); limparFiltros(); });

// Botões que aparecem dentro da tabela / avisos (conteúdo gerado dinamicamente).
// Um único ouvinte de cliques para botões criados dinamicamente (tabela e mensagens)
document.addEventListener('click', (e) => {
  // Clicou em 'Editar' de uma linha?
  const edit = e.target.closest('[data-edit]');
  // Sim: abre o formulário daquele acordo
  if (edit) { openModal(edit.getAttribute('data-edit')); return; }
  // Clicou em algum botão de ação?
  const act = e.target.closest('[data-action]');
  // Não: ignora o clique
  if (!act) return;
  // Nome da ação do botão
  const a = act.getAttribute('data-action');
  // Limpar filtros
  if (a === 'limpar') limparFiltros();
  // Novo acordo
  else if (a === 'novo') openModal(null);
  // Tentar novamente (após erro de carga)
  else if (a === 'retry') recarregar();
  // Copiar o SQL da migração
  else if (a === 'copiar-sql') {
    // Aviso de 'SQL copiado'
    const done = () => showToast('SQL copiado.');
    // Copia pelo método moderno do navegador...
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(MIGRACAO_SQL).then(done, () => { $('sqlMigracao').select(); });
    // ...ou, se não existir, seleciona o texto e usa o método antigo
    else { $('sqlMigracao').select(); document.execCommand && document.execCommand('copy'); done(); }
  }
});

// Tecla Esc fecha a janela aberta (primeiro a de parceiros, depois o formulário).
// Ouve o teclado da página inteira
document.addEventListener('keydown', (e) => {
  // Só interessa a tecla Esc
  if (e.key !== 'Escape') return;
  // Se a janela de parceiros está aberta, fecha ela
  if ($('overlayParc').classList.contains('open')) fecharParceiros();
  // Senão, se o formulário está aberto, fecha ele
  else if ($('overlay').classList.contains('open')) closeModal();
});

// Botão 'Atualizar': recarrega acordos e parceiros sem recarregar a página (o ícone gira enquanto carrega).
// Botão 'Atualizar' (e 'Tentar novamente')
async function recarregar() {
  // Ícone de atualizar
  const ic = $('icRefresh');
  // Faz o ícone girar e desativa o botão
  ic.classList.add('spin'); $('btnRefresh').disabled = true;
  // Mostra o esqueleto cinza enquanto carrega
  carga = 'carregando'; renderTable();
  // Recarrega acordos e parceiros e redesenha
  try { await loadAcordos(); await loadParceiros(); renderTable(); }
  // Ao terminar (com sucesso ou erro): para o giro e reativa o botão
  finally { ic.classList.remove('spin'); $('btnRefresh').disabled = false; }
}
// Botão 'Atualizar'
$('btnRefresh').addEventListener('click', recarregar);

// Início do programa: desenha o esqueleto de carregamento e conecta ao banco de dados.
// Desenha o esqueleto de carregamento imediatamente
renderTable();
// Inicia o programa: conecta ao banco e carrega os dados
init();
