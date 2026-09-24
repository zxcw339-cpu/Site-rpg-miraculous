# Publicar a atualização de dados

O site já usa GitHub Pages e o projeto Supabase existente. Esta atualização acrescenta fichas, campanhas, convites e Comunidade salvos. **O SQL foi aplicado ao projeto `MiraculousRPGDB` em 24/09/2026** e as tabelas novas foram confirmadas. Falta enviar o código à branch `main` do GitHub; esse envio publica automaticamente a nova interface.

## 1. Banco de dados: concluído

O arquivo [202609240001_rpg_campaigns_sheets.sql](supabase/migrations/202609240001_rpg_campaigns_sheets.sql) criou as tabelas e regras novas sem excluir contas ou perfis existentes. **Não execute a mesma migração novamente.** A configuração anterior de login e Discord continua válida; não precisa ser repetida.

## 2. Enviar o site

No GitHub Desktop, abra o repositório **Site-rpg-miraculous** na pasta `C:\Users\Gabriel C M\Documents\Site RPG miraculos`. Quando o código estiver na branch `main`, clique em **Push origin**. O GitHub Actions compila, testa e publica o `dist` no Pages; não é necessário enviar `dist` manualmente.

Veja a execução em [Actions](https://github.com/zxcw339-cpu/Site-rpg-miraculous/actions). Quando ela ficar verde, abra o [site](https://zxcw339-cpu.github.io/Site-rpg-miraculous/). Uma falha em Actions não deve ser tratada como publicação concluída.

## 3. Conferir com duas contas

1. Na primeira conta, crie uma campanha e gere um convite no cartão dela. Copie o código.
2. Na segunda conta, use **Campanhas → Entrar por convite**. A campanha deve aparecer em **Jogando**.
3. Na segunda conta, crie uma ficha, vincule-a à campanha e salve alguns dados civis.
4. Na primeira conta, abra **Jogadores** dentro da campanha. A ficha vinculada deve aparecer; o mestre pode configurar bônus e habilidades. A segunda conta deve ver esses valores ao abrir sua ficha.
5. Publique uma nota compartilhada e troque uma mensagem na Comunidade. Confirme que a segunda conta vê a nota e o chat. Uma nota privada deve continuar visível só para o mestre.

Arquivos de imagem da ficha e do mural ainda não são salvos. O envio de PNGs fica para a próxima atualização de armazenamento. A foto de perfil já segue a configuração anterior.

O processo de autenticação, Discord e SMTP não precisa ser refeito a cada versão. A V2 de estética não exigirá SQL novo se não mudar os dados.
