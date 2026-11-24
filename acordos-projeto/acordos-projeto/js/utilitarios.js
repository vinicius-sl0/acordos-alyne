// Atalhos usados no código todo:
// $(id) busca um elemento; fmtMoney/fmtPct formatam em padrão brasileiro; icon() desenha um ícone do sprite SVG.
// Atalho: $('id') devolve o elemento da página com aquele id
const $ = (id) => document.getElementById(id);
// Formata número como dinheiro brasileiro, ex.: R$ 1.234,50
const fmtMoney = (v) => 'R$ ' + (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
// Formata fração como porcentagem (0.05 vira 5%); vazio vira um traço
const fmtPct = (v) => v===null || v===undefined || isNaN(v) ? '—' : (v*100).toLocaleString('pt-BR',{maximumFractionDigits:1}) + '%';
// Monta o HTML de um ícone, tirando o desenho do sprite SVG que está no index.html
const icon = (id, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

// Escapa texto antes de colocá-lo em innerHTML, para que nomes com < > & " não quebrem a tela.
// Troca caracteres especiais do HTML por códigos seguros
function escapeHtml(s) {
  // Converte para texto e troca & < > " ' pelos códigos equivalentes
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Aviso rápido no rodapé (toast). tipo 'erro' deixa vermelho e fica mais tempo na tela.
// Guarda o cronômetro do aviso, para poder cancelar se vier outro aviso
let toastTimer = null;
// Mostra o aviso flutuante: msg = texto, tipo = 'erro' (vermelho) ou vazio (normal)
function showToast(msg, tipo) {
  // Pega o elemento do aviso na página
  const t = $('toast');
  // Define a aparência: vermelho se for erro
  t.className = 'toast' + (tipo === 'erro' ? ' erro' : '');
  // Coloca o ícone (alerta ou visto) e o texto, já escapado
  t.innerHTML = icon(tipo === 'erro' ? 'alert' : 'check') + '<span>' + escapeHtml(msg) + '</span>';
  // Força o navegador a recalcular o layout, para a animação reiniciar
  void t.offsetWidth;
  // Faz o aviso aparecer (a classe 'show' liga a animação)
  t.classList.add('show');
  // Cancela o desaparecimento agendado do aviso anterior
  clearTimeout(toastTimer);
  // Agenda o desaparecimento: 5s para erro, 2,6s para sucesso
  toastTimer = setTimeout(() => t.classList.remove('show'), tipo === 'erro' ? 5000 : 2600);
}

// Faixa de aviso no topo da página (ex.: importando dados ou erro geral). Texto vazio limpa a faixa.
// Mostra uma faixa de aviso no topo; isErr = true deixa vermelha
function setStatus(msg, isErr) {
  // Pega a área da faixa de aviso
  const el = $('statusBanner');
  // Sem mensagem: limpa a faixa e sai
  if (!msg) { el.innerHTML = ''; return; }
  // Monta a faixa com ícone e texto escapado
  el.innerHTML = `<div class="alert ${isErr ? 'err' : 'info'}">${icon(isErr ? 'alert' : 'refresh')}<div class="alert-body">${escapeHtml(msg)}</div></div>`;
}

// Rede de segurança: qualquer erro de JavaScript não tratado aparece na tela, para facilitar o suporte.
// Roda quando acontece qualquer erro de JavaScript não tratado
window.addEventListener('error', function(e) {
  // Mostra o erro na tela, com o número da linha, para facilitar o suporte
  setStatus('Erro no JavaScript da página: ' + e.message + ' (linha ' + e.lineno + '). Copie esta mensagem e envie para quem mantém o arquivo.', true);
});
