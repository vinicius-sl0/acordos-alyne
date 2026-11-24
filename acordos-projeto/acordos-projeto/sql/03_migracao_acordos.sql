  -- =====================================================================
  -- 03 - MIGRAÇÃO: datas de vigência e meta batida dos acordos.
  -- Segura e repetível: só ADICIONA colunas vazias e uma regra; não altera nem apaga nenhum acordo.
  -- Acordos antigos ficam com data_inicio / data_fim / meta_batida vazios (null) e continuam funcionando.
  -- Como usar: Supabase > SQL Editor > cole o conteúdo > Run. Depois recarregue o painel.
  -- =====================================================================

  -- Data de início da vigência do acordo (só a data, sem hora)
  alter table acordos add column if not exists data_inicio date;

  -- Data de término da vigência do acordo
  alter table acordos add column if not exists data_fim date;

  -- Meta batida: true = bateu, false = não bateu (saldo a pagar fica zerado), null = ainda a definir
  alter table acordos add column if not exists meta_batida boolean;

  -- Remove a regra antiga (se existir) para poder recriá-la sem erro
  alter table acordos drop constraint if exists acordos_vigencia_valida;

  -- Regra do banco: o término nunca pode ser anterior ao início (vale se as duas datas existirem)
  alter table acordos add constraint acordos_vigencia_valida
    check (data_inicio is null or data_fim is null or data_fim >= data_inicio);
