-- =====================================================================
-- 02 - Cria a tabela de PARCEIROS (código, razão social, vendedor, coordenador).
-- É ela que permite preencher automaticamente o formulário ao digitar o código.
-- Se você já criou esta tabela, NÃO precisa rodar de novo (é só referência).
-- =====================================================================

-- Cria a tabela só se ainda não existir
create table if not exists parceiros (
  -- Código do parceiro: é a chave primária (não existem dois parceiros com o mesmo código)
  cod text primary key,
  -- Razão social
  razao_social text,
  -- Vendedor responsável
  vendedor text,
  -- Coordenador do vendedor (opcional)
  coord text,
  -- Quando o parceiro foi importado/atualizado pela última vez
  updated_at timestamptz default now()
);

-- Liga a segurança por linha
alter table parceiros enable row level security;

-- Recria a política de uso interno sem dar erro se já existir
drop policy if exists "acesso total (uso interno)" on parceiros;

-- Política de uso interno (mesma observação da tabela acordos: não há login)
create policy "acesso total (uso interno)" on parceiros
  for all using (true) with check (true);
