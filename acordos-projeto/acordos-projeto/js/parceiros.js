// ---------- base de parceiros ----------
// Base de parceiros em memória. A chave é o código normalizado (veja normCod), por isso 601, 0601 e 601.0 apontam para o mesmo parceiro.
// parceirosStatus indica se a base está carregando, pronta ou deu erro; parceirosErro guarda a mensagem para mostrar na tela.
// Mapa (código normalizado → dados do parceiro)
let parceiros = new Map();      // código normalizado -> {cod, razao, vendedor, coord}
// Situação da base: carregando, ok ou erro
let parceirosStatus = 'carregando'; // 'carregando' | 'ok' | 'erro'
// Mensagem de erro, quando houver
let parceirosErro = '';
// Estado da importação de planilha em andamento (arquivo lido, linhas e posição da linha de cabeçalho).
// Dados da planilha que está sendo importada
let imp = null;                 // estado da importação: {wb, rows, headerIdx}

// Converte qualquer valor em texto sem espaços nas pontas (null/undefined viram '').
// Devolve o valor como texto limpo; null/undefined viram ''
function txt(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }

// Normaliza um código de parceiro para comparação:
// - '601.0' (número lido do Excel) vira '601';
// - zeros à esquerda são removidos ('0601' vira '601');
// - códigos com letras permanecem como estão.
// Padroniza um código para poder comparar
function normCod(v) {
  // Começa com o código como texto
  let s = txt(v);
  // Código tipo '601.0' (vindo do Excel): remove o '.0'
  if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, '');
  // Só dígitos: remove zeros à esquerda ('0601' → '601')
  if (/^\d+$/.test(s)) s = s.replace(/^0+(?=\d)/, '');
  // Devolve o código padronizado
  return s;
}

// Procura um parceiro na base pelo código. Devolve {cod, razao, vendedor, coord} ou null se não existir.
// Procura um parceiro pelo código
function buscarParceiro(cod) {
  // Padroniza o código digitado
  const k = normCod(cod);
  // Devolve o parceiro, ou null se não existir
  return k ? (parceiros.get(k) || null) : null;
}

// Descobre o coordenador de um vendedor olhando os acordos já cadastrados (usado quando o parceiro não tem coordenador na base).
// Descobre o coordenador de um vendedor pelos acordos já cadastrados
function coordDoConsultor(nome) {
  // Nome do vendedor em maiúsculas, sem espaços nas pontas
  const n = txt(nome).toUpperCase();
  // Sem nome: não há o que procurar
  if (!n) return '';
  // Percorre os acordos...
  for (let i = 0; i < acordos.length; i++) {
    // Acordo atual
    const r = acordos[i];
    // Se é do mesmo vendedor e tem coordenador, usa esse coordenador
    if (r.coord && txt(r.consultor).toUpperCase() === n) return r.coord;
  }
  // Não achou: devolve vazio
  return '';
}

// Reconhece o erro do Supabase que significa 'a tabela parceiros ainda não foi criada'.
// Reconhece o erro 'tabela parceiros não existe'
function erroTabelaParceiros(e) {
  // Texto do erro
  const m = (e && e.message) ? e.message : '';
  // Verdadeiro se o erro fala da tabela parceiros e de ela não existir
  return /parceiros/i.test(m) && /(schema cache|does not exist|relation)/i.test(m);
}

// Carrega a base inteira do Supabase. O Supabase entrega no máximo 1000 linhas por consulta,
// por isso a leitura é feita em páginas de 1000 até acabar.
// Carrega a base de parceiros do banco
async function loadParceiros() {
  // Sem conexão: não faz nada
  if (!supabaseClient) return;
  // Mapa novo, que será preenchido
  const mapa = new Map();
  // O Supabase entrega no máximo 1000 linhas por vez
  const pagina = 1000;
  // Tenta carregar
  try {
    // Pede de 1000 em 1000 até acabar
    for (let from = 0; ; from += pagina) {
      // Busca uma página de parceiros, em ordem de código
      const res = await supabaseClient.from('parceiros')
        .select('cod,razao_social,vendedor,coord')
        .order('cod', { ascending: true })
        .range(from, from + pagina - 1);
      // Erro: vai para o catch
      if (res.error) throw res.error;
      // Linhas desta página
      const data = res.data || [];
      // Para cada parceiro da página...
      data.forEach(r => {
        // ...guarda no mapa pelo código padronizado
        mapa.set(normCod(r.cod), { cod: r.cod, razao: r.razao_social || '', vendedor: r.vendedor || '', coord: r.coord || '' });
      });
      // Página incompleta = acabaram os dados
      if (data.length < pagina) break;
    }
    // Troca a base antiga pela nova
    parceiros = mapa;
    // Marca como carregada
    parceirosStatus = 'ok';
    // Sem erro
    parceirosErro = '';
  } catch (e) {
    // Se falhou...
    // Registra no console
    console.error(e);
    // Marca como erro
    parceirosStatus = 'erro';
    // Escolhe a mensagem: tabela inexistente ou erro genérico
    parceirosErro = erroTabelaParceiros(e)
      ? 'A tabela "parceiros" ainda não existe no Supabase. Rode o SQL de criação (SQL Editor) e recarregue a página.'
      : 'Não foi possível carregar a base de parceiros: ' + ((e && e.message) || 'erro desconhecido');
  }
  // Atualiza o texto da janela de parceiros
  atualizarResumoParceiros();
}

// Atualiza a frase de resumo da janela 'Base de parceiros' (quantidade, vazia ou erro).
// Escreve a frase de resumo na janela 'Base de parceiros'
function atualizarResumoParceiros() {
  // Elemento do resumo
  const el = $('parcResumo');
  // Se não existe na página, para
  if (!el) return;
  // Remove cor de erro anterior
  el.className = 'parc-resumo';
  // Carregando: mostra 'Carregando…'
  if (parceirosStatus === 'carregando') { el.textContent = 'Carregando…'; return; }
  // Erro: mostra a mensagem em vermelho
  if (parceirosStatus === 'erro') { el.textContent = parceirosErro; el.classList.add('err'); return; }
  // Mostra quantos parceiros existem, ou avisa que a base está vazia
  el.textContent = parceiros.size
    ? 'A base tem ' + parceiros.size.toLocaleString('pt-BR') + ' parceiros.'
    : 'A base está vazia. Importe a planilha abaixo.';
}

// Autopreenchimento do formulário: ao digitar o código do cliente, preenche razão social, vendedor (consultor) e coordenador.
// Os campos continuam editáveis; se o código não existe, apenas avisa.
// autopreenchimento no formulário de acordo
// Preenche automaticamente o formulário a partir do código do cliente
function aplicarParceiroNoForm() {
  // Linha de dica abaixo do campo de código
  const hint = $('codHint');
  // Código digitado
  const cod = $('fCodCliente').value.trim();
  // Limpa estilo e texto da dica
  hint.className = 'hint';
  hint.textContent = '';
  // Campo vazio: nada a fazer
  if (!cod) return;
  // Base ainda carregando: pede para tentar de novo
  if (parceirosStatus === 'carregando') { hint.textContent = 'Carregando a base de parceiros… digite o código de novo em instantes.'; return; }
  // Base indisponível: pede para preencher manualmente
  if (parceirosStatus === 'erro') { hint.textContent = 'Base de parceiros indisponível. Preencha manualmente.'; hint.classList.add('warn'); return; }
  // Base vazia: orienta a importar
  if (parceirosStatus === 'ok' && parceiros.size === 0) { hint.textContent = 'Base de parceiros vazia. Importe em "Base de parceiros".'; hint.classList.add('warn'); return; }
  // Procura o parceiro
  const p = buscarParceiro(cod);
  // Código não existe na base: aviso amarelo
  if (!p) { hint.textContent = 'Código não encontrado na base. Preencha manualmente.'; hint.classList.add('warn'); return; }
  // Preenche o nome do cliente (razão social)
  if (p.razao) $('fCliente').value = p.razao;
  // Preenche o consultor (vendedor)
  if (p.vendedor) $('fConsultorForm').value = p.vendedor;
  // Coordenador da base, ou o do vendedor nos acordos existentes
  const coord = p.coord || coordDoConsultor(p.vendedor);
  // Preenche o coordenador
  if (coord) $('fCoord').value = coord;
  // Confirma que o preenchimento foi feito
  hint.textContent = '✓ Preenchido pela base de parceiros';
  // Cor verde
  hint.classList.add('ok');
}

// Espera 250 ms depois da última tecla antes de buscar, para não consultar a cada letra digitada.
// Cronômetro da espera de digitação
let timerCod = null;
// A cada tecla no código do cliente...
function onCodInput() {
  // ...cancela a busca agendada...
  clearTimeout(timerCod);
  // ...e agenda outra para 250 ms depois (só busca quando para de digitar)
  timerCod = setTimeout(aplicarParceiroNoForm, 250);
}

// Consulta rápida de um código dentro da janela 'Base de parceiros'.
// consulta rápida no modal da base
// Mostra o resultado da consulta rápida
function consultarCodigoParceiro() {
  // Caixa de resultado
  const box = $('parcResultado');
  // Código digitado
  const cod = $('parcBusca').value.trim();
  // Remove estilo anterior
  box.className = 'parc-result';
  // Vazio: mostra um traço
  if (!cod) { box.textContent = '—'; return; }
  // Procura o parceiro
  const p = buscarParceiro(cod);
  // Não existe: 'Não encontrado'
  if (!p) { box.textContent = 'Não encontrado'; return; }
  // Estilo de resultado encontrado
  box.classList.add('ok');
  // Mostra razão social e vendedor
  box.textContent = (p.razao || '(sem razão social)') + ' · Vendedor: ' + (p.vendedor || '(sem vendedor)');
}

// Importação da planilha de parceiros (.xls/.xlsx exportada do Sankhya).
// Abre a janela, mostrando o resumo atual e limpando a consulta anterior.
// importação da planilha
// Abre a janela da base de parceiros
function abrirParceiros() {
  // Atualiza o resumo
  atualizarResumoParceiros();
  // Limpa a consulta anterior
  $('parcBusca').value = '';
  // Reinicia o resultado
  consultarCodigoParceiro();
  // Mostra a janela
  $('overlayParc').classList.add('open');
}
// Fecha a janela de parceiros
function fecharParceiros() { $('overlayParc').classList.remove('open'); }

// Mensagem de andamento da importação. cls pode ser 'ok' (verde) ou 'err' (vermelho).
// Mostra o andamento da importação
function setProgresso(msg, cls) {
  // Elemento do texto de andamento
  const el = $('parcProgress');
  // Escreve a mensagem
  el.textContent = msg || '';
  // Aplica cor: 'ok' (verde) ou 'err' (vermelho)
  el.className = 'parc-progress' + (cls ? ' ' + cls : '');
}

// Lê o arquivo escolhido com a biblioteca XLSX (SheetJS), lista as abas e já tenta escolher a aba certa (nome com 'parceiro' ou 'cliente').
// Lê a planilha escolhida pelo usuário
function lerArquivoParceiros(file) {
  // Limpa mensagens antigas
  setProgresso('');
  // Esconde a escolha de colunas
  $('parcMapa').style.display = 'none';
  // Desativa 'Importar' até haver uma prévia válida
  $('btnParcImportar').disabled = true;
  // Esquece a planilha anterior
  imp = null;
  // Nenhum arquivo escolhido: para
  if (!file) return;
  // Biblioteca de planilhas não carregou (sem internet?)
  if (!window.XLSX) { setProgresso('O leitor de planilhas não carregou. Verifique a conexão com a internet e recarregue a página.', 'err'); return; }
  // Avisa que está lendo
  setProgresso('Lendo a planilha…');
  // Leitor de arquivos do navegador
  const reader = new FileReader();
  // Se não conseguir ler o arquivo, avisa
  reader.onerror = () => setProgresso('Não foi possível ler o arquivo.', 'err');
  // Quando terminar de ler...
  reader.onload = (ev) => {
    // Tenta interpretar a planilha
    try {
      // Abre a planilha (todas as abas)
      const wb = XLSX.read(ev.target.result, { type: 'array' });
      // Guarda a planilha para os próximos passos
      imp = { wb: wb, rows: [], headerIdx: 0 };
      // Lista de abas
      const aba = $('parcAba');
      // Preenche a lista com os nomes das abas
      aba.innerHTML = wb.SheetNames.map(n => '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>').join('');
      // Aba sugerida: a primeira, por padrão
      let preferida = wb.SheetNames[0];
      // Procura uma aba chamada 'parceiros' ou 'clientes'
      for (let i = 0; i < wb.SheetNames.length; i++) {
        // Achou: usa essa aba
        if (/parceir|cliente/i.test(wb.SheetNames[i])) { preferida = wb.SheetNames[i]; break; }
      }
      // Seleciona a aba sugerida
      aba.value = preferida;
      // Lê a aba e sugere as colunas
      carregarAbaParceiros();
      // Mostra a escolha de colunas
      $('parcMapa').style.display = 'block';
      // Limpa a mensagem
      setProgresso('');
    } catch (err) {
      // Planilha inválida ou corrompida
      // Registra no console
      console.error(err);
      // Avisa o usuário
      setProgresso('Não consegui abrir essa planilha: ' + (err.message || 'formato inválido'), 'err');
    }
  };
  // Começa a ler o arquivo
  reader.readAsArrayBuffer(file);
}

// Procura, entre os títulos de coluna, o primeiro que combina com alguma das expressões (em ordem de prioridade). Devolve -1 se não achar.
// Acha a coluna cujo título combina com um dos padrões
function acharColuna(headers, regexes) {
  // Tenta os padrões em ordem de prioridade...
  for (let r = 0; r < regexes.length; r++) {
    // ...em todas as colunas
    for (let i = 0; i < headers.length; i++) {
      // Combinou: devolve a posição da coluna
      if (headers[i] && regexes[r].test(headers[i])) return i;
    }
  }
  // Não achou nenhuma
  return -1;
}

// Lê a aba escolhida, localiza a linha de cabeçalho e sugere automaticamente as colunas de código, razão social, vendedor e coordenador.
// Lê a aba escolhida e prepara a escolha das colunas
function carregarAbaParceiros() {
  // Aba escolhida
  const ws = imp.wb.Sheets[$('parcAba').value];
  // Converte a aba numa lista de linhas (cada linha é uma lista de células)
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  // O Sankhya coloca título e data antes do cabeçalho, então é preciso localizá-lo
  // o cabeçalho pode não estar na primeira linha (o Sankhya coloca título e data antes)
  // Posição da linha de cabeçalho
  let hi = 0;
  // Olha as primeiras 15 linhas
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    // Linha atual
    const linha = rows[i] || [];
    // Células de texto não vazias
    const textos = linha.filter(c => typeof c === 'string' && c.trim() !== '');
    // Cabeçalho = linha com 2+ textos e alguma coluna parecida com 'Cód'
    if (textos.length >= 2 && linha.some(c => typeof c === 'string' && /c[oó]d/i.test(c))) { hi = i; break; }
  }
  // Guarda as linhas
  imp.rows = rows;
  // Guarda a posição do cabeçalho
  imp.headerIdx = hi;
  // Títulos das colunas
  const headers = (rows[hi] || []).map(txt);
  // Monta a lista de opções de colunas (opcional = pode escolher 'não usar')
  const opcoes = (opcional) => (opcional ? '<option value="-1">(não usar)</option>' : '<option value="-1">Escolha…</option>') +
    // Uma opção por título de coluna
    headers.map((h, i) => h ? '<option value="' + i + '">' + escapeHtml(h) + '</option>' : '').join('');
  // Preenche as quatro listas de colunas
  $('parcColCod').innerHTML = opcoes(false);
  // Razão social
  $('parcColRaz').innerHTML = opcoes(false);
  // Vendedor (opcional)
  $('parcColVend').innerHTML = opcoes(true);
  // Coordenador (opcional)
  $('parcColCoord').innerHTML = opcoes(true);
  // Sugere a coluna do código pelo título
  $('parcColCod').value = String(acharColuna(headers, [/c[oó]d\.?\s*parceiro/i, /^c[oó]d(igo)?\.?$/i, /c[oó]d/i]));
  // Sugere a razão social
  $('parcColRaz').value = String(acharColuna(headers, [/raz[aã]o/i]));
  // Sugere o vendedor
  $('parcColVend').value = String(acharColuna(headers, [/apelido.*vend/i, /consultor/i, /^vendedor$/i, /vend/i]));
  // Sugere o coordenador
  $('parcColCoord').value = String(acharColuna(headers, [/coord/i]));
  // Mostra a prévia com as colunas sugeridas
  atualizarPreviaParceiros();
}

// Transforma as linhas da planilha na lista a gravar: normaliza o código, trata '<SEM VENDEDOR>' como vazio,
// ignora linhas sem código e, se um código se repete, vale a última ocorrência.
// Transforma as linhas da planilha na lista de parceiros a gravar
function montarLinhasParceiros() {
  // Posições das colunas escolhidas...
  const iCod = parseInt($('parcColCod').value, 10);
  const iRaz = parseInt($('parcColRaz').value, 10);
  const iVend = parseInt($('parcColVend').value, 10);
  // ...(coordenador)
  const iCoord = parseInt($('parcColCoord').value, 10);
  // Mapa de saída (o código repetido substitui o anterior)
  const out = new Map();
  // Contadores para o resumo
  let ignoradas = 0, duplicadas = 0, semVendedor = 0;
  // Sem planilha ou sem coluna de código: lista vazia
  if (!imp || iCod < 0) return { lista: [], ignoradas: 0, duplicadas: 0, semVendedor: 0 };
  // Data/hora da importação
  const agora = new Date().toISOString();
  // Percorre as linhas depois do cabeçalho
  for (let r = imp.headerIdx + 1; r < imp.rows.length; r++) {
    // Linha atual
    const row = imp.rows[r] || [];
    // Código da linha, padronizado
    const cod = normCod(row[iCod]);
    // Linha sem código...
    if (!cod) {
      // ...conta como ignorada se tinha algum conteúdo
      if (row.some(c => txt(c) !== '')) ignoradas++;
      // Passa para a próxima linha
      continue;
    }
    // Vendedor da linha
    let vend = iVend >= 0 ? txt(row[iVend]) : '';
    // '<SEM VENDEDOR>' conta como vazio
    if (/^<?\s*sem\s+vendedor\s*>?$/i.test(vend)) vend = '';
    // Conta parceiros sem vendedor
    if (iVend >= 0 && !vend) semVendedor++;
    // Conta códigos repetidos (vale o último)
    if (out.has(cod)) duplicadas++;
    // Dados do parceiro a gravar
    const item = {
      // Código padronizado
      cod: cod,
      // Razão social
      razao_social: iRaz >= 0 ? txt(row[iRaz]) : '',
      // Vendedor
      vendedor: vend,
      // Quando foi atualizado
      updated_at: agora,
    };
    // Coordenador, se a coluna foi escolhida
    if (iCoord >= 0) item.coord = txt(row[iCoord]);
    // Guarda no mapa pelo código
    out.set(cod, item);
  }
  // Devolve a lista e as contagens
  return { lista: Array.from(out.values()), ignoradas: ignoradas, duplicadas: duplicadas, semVendedor: semVendedor };
}

// Mostra a prévia (5 primeiras linhas e contagens) e só habilita 'Importar' quando código e razão social estão escolhidos.
// Mostra a prévia da importação
function atualizarPreviaParceiros() {
  // Área da prévia
  const box = $('parcPrevia');
  // Monta a lista com as colunas escolhidas
  const res = montarLinhasParceiros();
  // Coluna da razão social
  const iRaz = parseInt($('parcColRaz').value, 10);
  // Pode importar? Precisa de código e razão social
  const ok = res.lista.length > 0 && iRaz >= 0;
  // Ativa ou desativa o botão 'Importar'
  $('btnParcImportar').disabled = !ok;
  // Nada para mostrar ainda
  if (!res.lista.length) {
    // Pede para escolher a coluna do código
    box.innerHTML = '<p class="parc-help" style="margin-top:10px;">Escolha a coluna do código para ver a prévia.</p>';
    // Para aqui
    return;
  }
  // 5 primeiras linhas da prévia
  const linhas = res.lista.slice(0, 5).map(p =>
    '<tr><td>' + escapeHtml(p.cod) + '</td><td>' + escapeHtml(p.razao_social) + '</td><td>' + escapeHtml(p.vendedor || '—') + '</td></tr>'
  ).join('');
  // Frase de resumo: quantidade pronta para importar
  let resumo = res.lista.length.toLocaleString('pt-BR') + ' parceiros prontos para importar';
  // Acrescenta quantos estão sem vendedor
  if (res.semVendedor) resumo += ' (' + res.semVendedor.toLocaleString('pt-BR') + ' sem vendedor)';
  // Acrescenta códigos repetidos
  if (res.duplicadas) resumo += ', ' + res.duplicadas + ' código(s) repetido(s) na planilha, vale o último';
  // Acrescenta linhas ignoradas
  if (res.ignoradas) resumo += ', ' + res.ignoradas + ' linha(s) sem código ignorada(s)';
  // Ponto final
  resumo += '.';
  // Mostra o resumo e a tabela de prévia
  box.innerHTML = '<p class="parc-help" style="margin:10px 0 0;">' + escapeHtml(resumo) + '</p>' +
    '<div class="previa-wrap"><table class="previa"><thead><tr><th>Código</th><th>Razão social</th><th>Vendedor</th></tr></thead><tbody>' + linhas + '</tbody></table></div>';
}

// Grava a lista no Supabase em lotes de 500 (upsert pelo código): parceiros existentes são atualizados, novos são inseridos e nada é apagado.
// Botão 'Importar parceiros': grava a base no banco
async function importarParceiros() {
  // Sem conexão: avisa e para
  if (!supabaseClient) { setProgresso('Sem conexão com o banco de dados.', 'err'); return; }
  // Monta a lista final
  const res = montarLinhasParceiros();
  // Lista a gravar
  const lista = res.lista;
  // Lista vazia: nada a fazer
  if (!lista.length) return;
  // Desativa o botão durante a gravação
  $('btnParcImportar').disabled = true;
  // Grava em lotes de 500 para não sobrecarregar
  const lote = 500;
  // Quantos já foram gravados
  let feitos = 0;
  // Tenta gravar
  try {
    // Um lote por vez
    for (let i = 0; i < lista.length; i += lote) {
      // Pedaço atual da lista
      const parte = lista.slice(i, i + lote);
      // UPSERT: atualiza quem já existe (pelo código) e insere quem é novo; nada é apagado
      const r = await supabaseClient.from('parceiros').upsert(parte, { onConflict: 'cod' });
      // Erro: vai para o catch
      if (r.error) throw r.error;
      // Soma ao contador
      feitos += parte.length;
      // Mostra 'X de Y'
      setProgresso('Importando… ' + feitos.toLocaleString('pt-BR') + ' de ' + lista.length.toLocaleString('pt-BR'));
    }
    // Recarrega a base gravada
    await loadParceiros();
    // Mensagem de sucesso (verde)
    setProgresso('Pronto: ' + lista.length.toLocaleString('pt-BR') + ' parceiros gravados. A base agora tem ' + parceiros.size.toLocaleString('pt-BR') + '.', 'ok');
    // Aviso rápido de sucesso
    showToast('Base de parceiros atualizada.');
  } catch (e) {
    // Se falhou...
    // Registra no console
    console.error(e);
    // Mensagem: tabela inexistente ou erro genérico (com quantos já foram gravados)
    const msg = erroTabelaParceiros(e)
      ? 'A tabela "parceiros" não existe no Supabase. Rode o SQL de criação e tente de novo.'
      : 'Erro ao importar (' + feitos + ' gravados antes do erro): ' + ((e && e.message) || 'desconhecido');
    // Mostra o erro em vermelho
    setProgresso(msg, 'err');
  } finally {
    // Sempre executa...
    // ...reativa o botão
    $('btnParcImportar').disabled = false;
  }
}
