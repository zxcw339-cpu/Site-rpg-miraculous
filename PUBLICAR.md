# Publicação do site

## Atualização de 25/09/2026

O site público está em [GitHub Pages](https://zxcw339-cpu.github.io/Site-rpg-miraculous/) e usa o projeto Supabase existente `MiraculousRPGDB`. A configuração de login, Discord e SMTP permanece no projeto; não precisa ser refeita a cada versão.

A atualização corrige permissões do mestre, edição e exclusão de fichas e mesas, upload privado de imagens, comunidade, chat, rolagens e registros. O arquivo [202609250001_rpg_v1_fixes.sql](supabase/migrations/202609250001_rpg_v1_fixes.sql) acrescenta as regras e tabelas necessárias **sem formatar o banco**. Ele amplia a permissão do mestre para editar fichas vinculadas à sua mesa e moderar conteúdos da comunidade. **Em 25/09, confirmei que a migração já estava presente no projeto hospedado. Não execute o arquivo novamente.** A tentativa repetida foi recusada por um gatilho já existente; por estar em uma transação, não mudou os dados. Consultas de leitura confirmaram categorias, rolagens, registros, funções, políticas, armazenamento privado e o chat em tempo real.

O commit `6387371` foi enviado à branch `main`. A [execução 6 do GitHub Actions](https://github.com/zxcw339-cpu/Site-rpg-miraculous/actions/runs/36156418025) concluiu build e publicação com sucesso. O site público carregou `index-DkwjKPzL.js`, o mesmo arquivo gerado nessa execução. Nas próximas versões, envie as mudanças à branch `main`; o GitHub Actions compila e publica automaticamente. Não envie `dist` manualmente.

Para um teste real, use duas contas da mesa: o mestre cria uma categoria e uma publicação; o jogador envia uma mensagem, vincula uma ficha e edita dados civis; o mestre confere a ficha, registra uma rolagem e verifica os registros. Faça upload de um PNG pequeno e veja se ele aparece após recarregar. A exclusão definitiva de uma ficha ou mesa deve ser conferida somente com dados de teste.

O armazenamento é privado e fornece links temporários para imagens. O chat mostra as 200 mensagens mais recentes e os registros mostram até 200 eventos; ainda não há paginação completa. O desenho para celular terá uma implementação própria, descrita em [MOBILE.md](MOBILE.md).

## Publicação anterior — 24/09/2026

O site usa GitHub Pages e o projeto Supabase existente. Esta atualização acrescenta fichas, campanhas, convites e Comunidade salvos. **O SQL foi aplicado ao projeto `MiraculousRPGDB` em 24/09/2026** e as tabelas novas foram confirmadas. O código também foi enviado à branch `main`; o GitHub Pages publicou a nova interface.

## 1. Banco de dados: concluído

O arquivo [202609240001_rpg_campaigns_sheets.sql](supabase/migrations/202609240001_rpg_campaigns_sheets.sql) criou as tabelas e regras novas sem excluir contas ou perfis existentes. **Não execute a mesma migração novamente.** A configuração anterior de login e Discord continua válida; não precisa ser repetida.

## 2. Publicação: concluída

O envio à branch `main` foi feito e o [GitHub Actions](https://github.com/zxcw339-cpu/Site-rpg-miraculous/actions/runs/36071501699) concluiu build e publicação com sucesso. O [site público](https://zxcw339-cpu.github.io/Site-rpg-miraculous/) carregou o mesmo arquivo JavaScript gerado nessa execução.

Nas próximas versões, basta enviar mudanças à branch `main` no GitHub Desktop com **Push origin**; o GitHub Actions compila, testa e publica o `dist` automaticamente. Não envie `dist` manualmente.

## 3. Conferir com duas contas

1. Na primeira conta, crie uma campanha e gere um convite no cartão dela. Copie o código.
2. Na segunda conta, use **Campanhas → Entrar por convite**. A campanha deve aparecer em **Jogando**.
3. Na segunda conta, crie uma ficha, vincule-a à campanha e salve alguns dados civis.
4. Na primeira conta, abra **Jogadores** dentro da campanha. A ficha vinculada deve aparecer; o mestre pode configurar bônus e habilidades. A segunda conta deve ver esses valores ao abrir sua ficha.
5. Publique uma nota compartilhada e troque uma mensagem na Comunidade. Confirme que a segunda conta vê a nota e o chat. Uma nota privada deve continuar visível só para o mestre.

Na publicação de 24/09, os arquivos de imagem da ficha e do mural ainda não eram salvos. O upload privado foi preparado na atualização de 25/09.

O processo de autenticação, Discord e SMTP não precisa ser refeito a cada versão. A V2 de estética não exigirá SQL novo se não mudar os dados.
