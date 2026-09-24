# Publicar a atualização de dados

O site já usa GitHub Pages e o projeto Supabase existente. Esta atualização acrescenta fichas, campanhas, convites e Comunidade salvos. A ordem importa: **primeiro o SQL no Supabase, depois o envio à branch `main` do GitHub**. O envio à `main` publica automaticamente a nova interface.

## 1. Aplicar o SQL uma única vez

1. Entre no [painel do Supabase](https://supabase.com/dashboard) e abra o projeto usado pelo site. Confira que é o mesmo projeto cuja URL termina em `teizrbsaocefxhtaqpxj.supabase.co`.
2. No menu esquerdo, abra **SQL Editor → New query**.
3. Copie **todo** o conteúdo de [202609240001_rpg_campaigns_sheets.sql](supabase/migrations/202609240001_rpg_campaigns_sheets.sql), cole na consulta e clique em **Run**.
4. Aguarde **Success**. Se surgir erro, pare e envie a mensagem de erro para corrigirmos antes de publicar o site.

O arquivo cria tabelas e regras novas. Não exclui contas, perfis ou campanhas anteriores. Não repita a mesma migração depois de ela terminar com sucesso. A etapa antiga de [AUTENTICACAO.md](AUTENTICACAO.md) já deve ter sido aplicada ao projeto.

## 2. Enviar o site

No GitHub Desktop, abra o repositório **Site-rpg-miraculous** na pasta `C:\Users\Gabriel C M\Documents\Site RPG miraculos`. Depois de aplicar o SQL, confira as alterações, faça **Commit to main** e **Push origin**. O GitHub Actions compila, testa e publica o `dist` no Pages; não é necessário enviar `dist` manualmente.

Veja a execução em [Actions](https://github.com/zxcw339-cpu/Site-rpg-miraculous/actions). Quando ela ficar verde, abra o [site](https://zxcw339-cpu.github.io/Site-rpg-miraculous/). Uma falha em Actions não deve ser tratada como publicação concluída.

## 3. Conferir com duas contas

1. Na primeira conta, crie uma campanha e gere um convite no cartão dela. Copie o código.
2. Na segunda conta, use **Campanhas → Entrar por convite**. A campanha deve aparecer em **Jogando**.
3. Na segunda conta, crie uma ficha, vincule-a à campanha e salve alguns dados civis.
4. Na primeira conta, abra **Jogadores** dentro da campanha. A ficha vinculada deve aparecer; o mestre pode configurar bônus e habilidades. A segunda conta deve ver esses valores ao abrir sua ficha.
5. Publique uma nota compartilhada e troque uma mensagem na Comunidade. Confirme que a segunda conta vê a nota e o chat. Uma nota privada deve continuar visível só para o mestre.

Arquivos de imagem da ficha e do mural ainda não são salvos. O envio de PNGs fica para a próxima atualização de armazenamento. A foto de perfil já segue a configuração anterior.

O processo de autenticação, Discord e SMTP não precisa ser refeito a cada versão. A V2 de estética não exigirá SQL novo se não mudar os dados.
