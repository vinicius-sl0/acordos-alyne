# Painel de Acordos Comerciais — Grupo Alyne

Painel para acompanhar acordos comerciais (meta, investimento, pagamentos), com banco de dados online (Supabase).

## Como abrir
1. Dê dois cliques em `index.html` (abre no navegador). É preciso internet: o painel usa o Supabase e duas bibliotecas online.
2. Se for a primeira vez, rode os arquivos da pasta `sql/` no Supabase (SQL Editor), na ordem 01, 02 e 03.
   Se as tabelas já existem, rode só o `03_migracao_acordos.sql` (datas de vigência e meta batida).

## Estrutura da pasta
```
acordos-projeto/
├── index.html              HTML: a estrutura da página (campos, botões, tabela, janelas)
├── css/
│   └── estilos.css         CSS: cores, tamanhos, layout, modo escuro e versão para celular
├── js/                     JavaScript: o comportamento (a ordem de carregamento está no index.html)
│   ├── config.js           Configurações (endereço e chave do Supabase) e variáveis globais
│   ├── utilitarios.js      Formatação de números, avisos na tela, atalhos
│   ├── datas.js            Validação de datas e critério de vigência (filtro por período)
│   ├── calculos.js         Totais, investimento devido e saldo de cada acordo (regra da meta batida)
│   ├── filtros.js          Leitura e aplicação dos filtros (busca, código, consultor, período...)
│   ├── tabela.js           Desenho do resumo, da tabela e das mensagens de tela
│   ├── formulario.js       Janela de criar/editar acordo
│   ├── banco.js            Conversão de dados e leitura/gravação no Supabase
│   ├── dados-iniciais.js   Acordos originais da planilha (importados uma única vez)
│   ├── parceiros.js        Base de parceiros: preenchimento automático e importação de planilha
│   └── principal.js        Liga os botões às funções e inicia o programa
├── sql/                    SQL: comandos para o banco de dados (Supabase)
│   ├── 01_criar_tabela_acordos.sql
│   ├── 02_criar_tabela_parceiros.sql
│   └── 03_migracao_acordos.sql
└── assets/                 Imagens (logo e ícone da aba)
```

## Onde mexer para...
- Trocar o projeto do Supabase: `js/config.js` (nunca coloque a chave secreta aqui, só a publishable).
- Mudar cores e fontes: início de `css/estilos.css` (bloco `:root`).
- Mudar a regra de cálculo do saldo: `js/calculos.js`.
- Mudar o critério do filtro por período: `js/datas.js`.
- Adicionar um campo ao acordo: `index.html` (campo), `js/formulario.js` (ler/preencher), `js/banco.js` (gravar/ler) e uma coluna nova em `sql/`.

## Observação de segurança
Não há login: quem tiver os arquivos consegue ler e alterar os dados (a chave usada é pública por natureza do Supabase).
Para uso fora da equipe, o próximo passo é adicionar autenticação e restringir as políticas do banco.
