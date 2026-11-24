// Chaves dos meses usadas dentro de cada acordo (jan..dez) e os rótulos exibidos na tela.
// Lista com as chaves dos 12 meses; é com elas que cada acordo guarda seus valores (meses.jan, meses.fev...)
const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
// Nomes bonitos dos meses, na mesma ordem, usados nos títulos da grade do formulário
const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ====== CONFIGURAÇÃO DO SUPABASE ======
// Esta é a chave PÚBLICA ("publishable"). Nunca coloque aqui a chave secreta (service_role / sb_secret_...).
// Endereço do seu projeto no Supabase (o banco de dados online)
const SUPABASE_URL = "https://fizhidnqgaocwmmixpgy.supabase.co";
const SUPABASE_KEY = "sb_publishable_8Vb7UUXhUffX2t2_XwDrvg_uyQqJTJX";
// =======================================

// SQL da migração das colunas novas: datas de vigência e meta batida (idempotente: pode rodar mais de uma vez e não altera nenhum dado).
// Texto do SQL mostrado no aviso de migração (é o mesmo que está em sql/03_migracao_acordos.sql)
const MIGRACAO_SQL =
`alter table acordos add column if not exists data_inicio date;
alter table acordos add column if not exists data_fim date;
alter table acordos add column if not exists meta_batida boolean;
alter table acordos drop constraint if exists acordos_vigencia_valida;
alter table acordos add constraint acordos_vigencia_valida
  check (data_inicio is null or data_fim is null or data_fim >= data_inicio);`;

// ---------- estado global da página ----------
// acordos: lista carregada do banco (os filtros trabalham sobre ela, em memória).
// editingId: id do acordo aberto no formulário (null = novo acordo).
// Conexão com o banco; fica null até a função init() criar a conexão
let supabaseClient = null;
// Lista de todos os acordos carregados do banco (os filtros trabalham em cima dela)
let acordos = [];
// Id do acordo que está aberto no formulário; null significa que é um acordo novo
let editingId = null;
// Regra de investimento escolhida no formulário: 'percentual' ou 'fixo'
let regraTipoAtual = 'percentual';
// Se o contrato está assinado no formulário aberto (true = assinado)
let assinadoAtual = true;
// Situação do carregamento dos acordos: carregando, ok ou erro
let carga = 'carregando';     // 'carregando' | 'ok' | 'erro'
// Texto do erro mostrado na tela quando a carga falha
let cargaErro = '';
// Indica se a coluna meta_batida existe no banco
let metaDisponivel = true;    // false enquanto o banco não tiver a coluna meta_batida
// Escolha de 'meta batida' no formulário aberto (true, false ou null)
let metaBatidaAtual = null;   // seleção do formulário: true = bateu, false = não bateu, null = a definir
// Indica se as colunas de data de vigência existem no banco
let datasDisponiveis = true;  // false enquanto o banco não tiver as colunas data_inicio / data_fim
