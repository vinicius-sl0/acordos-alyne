-- =====================================================================
-- 01 - Cria a tabela de ACORDOS no Supabase (banco PostgreSQL).
-- Se você já criou esta tabela antes, NÃO precisa rodar de novo (é só referência).
-- Como usar: Supabase > SQL Editor > cole o conteúdo > Run.
-- =====================================================================

-- Cria a tabela só se ela ainda não existir (pode rodar sem medo de apagar dados)
create table if not exists acordos (
  -- Identificador único do acordo, gerado automaticamente pelo banco
  id uuid primary key default gen_random_uuid(),
  -- Número do acordo (texto, pois pode ter zeros à esquerda)
  numero_acordo text,
  -- Código do cliente/parceiro (liga o acordo à tabela parceiros)
  cod_cliente text,
  -- Tipo do acordo: 'SELL IN' ou 'SELL OUT'
  tipo text,
  -- Razão social / nome do cliente
  cliente text,
  -- Consultor de vendas responsável
  consultor text,
  -- Coordenador do consultor
  coord text,
  -- Situação: 'em andamento', 'encerrado' ou 'pendente'
  status text default 'em andamento',
  -- Data do pagamento (texto livre, ex.: '10/07')
  data_pagamento text,
  -- Contrato assinado? (true = sim)
  assinado boolean default true,
  -- Valores por mês em formato JSON: {"jan": {"acordado": 1000, "realizado": 900, "nota": null}, ...}
  meses jsonb default '{}'::jsonb,
  -- Regra de investimento em JSON: {"tipo": "percentual", "valor": 0.05} ou {"tipo": "fixo", "valor": 1000}
  regra_pagamento jsonb default '{}'::jsonb,
  -- Pagamentos já feitos em JSON: {"swile": 0, "bonificado": 0, "descBoleto": 0, "boleto": 0, "brindes": 0}
  pagamentos jsonb default '{}'::jsonb,
  -- Observações livres
  obs text,
  -- Marca se o acordo veio da planilha original
  importado_da_planilha boolean default false,
  -- Data/hora de criação (automática)
  created_at timestamptz default now(),
  -- Data/hora da última alteração (o painel atualiza a cada gravação)
  updated_at timestamptz default now()
);

-- Liga a segurança por linha (RLS). Sem política, ninguém acessa a tabela.
alter table acordos enable row level security;

-- Remove a política antiga (se existir) para poder recriá-la sem erro
drop policy if exists "acesso total (uso interno)" on acordos;

-- Política de uso interno: QUALQUER pessoa com o arquivo do painel lê e altera os acordos.
-- Atenção: não há login. Se o arquivo for para fora da empresa, adicione autenticação.
create policy "acesso total (uso interno)" on acordos
  for all using (true) with check (true);

-- Liga as atualizações em tempo real (o painel recarrega sozinho quando alguém altera algo)
do $$
begin
  alter publication supabase_realtime add table acordos;
exception when duplicate_object then
  null; -- já estava ligado: ignora
end $$;
