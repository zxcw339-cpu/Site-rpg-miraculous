# Miraculous · Painel de campanhas

Site React + TypeScript + Vite para PC. O desenho específico para celular e o refinamento visual das páginas ficam para a V2. As aparências Aranha e Kitsune são provisórias; a preferência visual fica no navegador.

## Funcionalidades

Com o Supabase configurado, cadastro e login por nome ou e-mail, senha e Discord usam contas reais. O perfil é salvo no Supabase. [AUTENTICACAO.md](AUTENTICACAO.md) descreve essa configuração.

A atualização de dados acrescenta:

- Campanhas criadas pelo mestre, com código de convite válido por 30 dias. Gerar um novo código substitui o anterior; o mestre pode revogá-lo.
- Entrada do jogador pelo código. Somente campanhas em que a pessoa joga podem receber suas fichas pessoais.
- Fichas civis salvas na conta. Cada jogador pode vincular uma ficha ativa por campanha, ou manter quantas fichas independentes quiser.
- Bônus de transformação e habilidades salvos separadamente, sob controle do mestre da campanha. Os valores civis continuam sob controle do jogador; ao rolar, os bônus da forma são somados aos civis.
- Painel do mestre com NPCs, itens, notas e rolagens salvos. Notas e cartões de mídia marcados como compartilhados aparecem na Comunidade dos jogadores.
- Chat salvo por campanha. Enquanto a mesa está aberta, novas mensagens são buscadas a cada 10 segundos; o botão **Atualizar mural** busca mudanças nas notas e mídias.

As regras de acesso ficam no banco: só o mestre vê conteúdo privado da campanha, e uma conta não pode alterar a ficha civil de outra. O site não armazena senhas em suas tabelas.

**Nesta atualização, arquivos de imagem da ficha e do mural ainda não são enviados ao banco.** Os campos de upload ficam indisponíveis quando a conta está conectada. Cartões de mídia com título, descrição e visibilidade já são salvos. Fotos do perfil seguem o fluxo de armazenamento existente.

Sem configuração Supabase local, o botão **Explorar demonstração** mostra exemplos em memória. Eles não são dados reais e desaparecem ao recarregar.

## Ativar e publicar

O SQL novo está em [supabase/migrations/202609240001_rpg_campaigns_sheets.sql](supabase/migrations/202609240001_rpg_campaigns_sheets.sql). Ele é aditivo, depende do SQL anterior de autenticação e foi aplicado ao projeto Supabase em 24/09/2026. **Não execute essa migração novamente.** O envio desta atualização à branch `main` publica automaticamente no GitHub Pages. Veja o procedimento em [PUBLICAR.md](PUBLICAR.md).

Não é necessário repetir todo o processo do Supabase a cada versão: cada migração nova é aplicada uma vez. A atualização visual V2, se não mudar o banco, exigirá apenas o envio dos arquivos do site.

## Executar e conferir

Requer Node.js 22.12+ (testado com Node 24):

```sh
npm ci
npm run dev
npm test
npm run build
```

Abra [a versão local](http://127.0.0.1:5173/). Para testar contas reais localmente, crie `.env.local` a partir de `.env.example` com **somente** a URL e a chave publicável do Supabase; nunca use uma chave administrativa em `VITE_*`.

O teste isolado de políticas SQL usa PostgreSQL/WASM sem acessar o projeto remoto:

```sh
npm install --prefix .preview/backend-check --no-save --ignore-scripts @electric-sql/pglite
node tests/campaign-sql.integration.mjs .preview/backend-check/node_modules/@electric-sql/pglite/dist/index.js
```

O site hospedado em GitHub Pages e o Supabase funcionam sem o computador do criador ligado.
