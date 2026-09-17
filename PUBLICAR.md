# Publicar a prévia

O site já pode ser compartilhado como demonstração. Login, cadastro, campanhas e fichas continuam temporários: publicar não cria autenticação nem salva os dados dos visitantes.

O caminho preparado é GitHub para guardar o projeto e GitHub Pages para servir o site. Supabase fica responsável por contas e banco quando essa integração for desenvolvida. Seus domínios não são uma solução de hospedagem da interface React. [Documentação do Supabase](https://supabase.com/docs/guides/platform/custom-domains).

## 1. Enviar o projeto ao GitHub

1. Instale o [GitHub Desktop](https://desktop.github.com/) e entre na sua conta.
2. Em **File → Add local repository → Choose**, selecione `C:\Users\Gabriel C M\Documents\Site RPG miraculos`.
3. A pasta do projeto já contém o repositório Git. Use **Add repository**. Se o Desktop informar que não encontra o local antigo, use **Locate** e selecione a mesma pasta acima. Não crie outra subpasta.
4. Confira que os arquivos aparecem no Desktop. Na aba **Changes**, se houver alterações pendentes, escreva `Prévia inicial do painel` em **Summary** e clique em **Commit to main**. A publicação está configurada para a branch `main`.
5. O repositório já está conectado a `https://github.com/zxcw339-cpu/Site-rpg-miraculous`. Depois do commit, use **Push origin** para enviar os arquivos do site. Não é necessário publicar outro repositório. Para usar Pages no GitHub Free, o repositório precisa ser público: isso torna o código público também.

Esse fluxo de envio é documentado no [GitHub Desktop](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop). A disponibilidade do Pages em repositórios públicos ou privados depende do plano; no Free, use um repositório público. [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

O `.gitignore` já exclui `node_modules`, `dist`, arquivos `.env`, cache e a pasta de testes visuais `.preview`. Envie os fontes, `public`, `tests`, os arquivos de configuração e `.github`. Não é necessário enviar a pasta `dist` manualmente.

## 2. Colocar o site no ar

1. Abra o repositório no site do GitHub.
2. Acesse **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Vá a **Actions → Publicar previa no GitHub Pages → Run workflow**, escolha `main` e execute. Se a primeira execução automática falhar porque Pages ainda não estava ativado, execute novamente depois do passo anterior.
4. Aguarde as etapas de compilação e publicação ficarem verdes.
5. Em **Settings → Pages**, clique em **Visit site**. O endereço terá o formato `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`. Use o link mostrado pelo GitHub, incluindo a barra final.
6. Confira login, fichas, campanhas e fontes nesse endereço. Compartilhe o link explicando que é uma prévia com dados fictícios.

O fluxo `.github/workflows/deploy-pages.yml` já está pronto: instala as dependências, testa a regra das fichas, compila e publica apenas `dist`. O Vite usa caminhos relativos, compatíveis com a subpasta do repositório. Não são necessários tokens pessoais ou chaves do Supabase nesta versão. [Publicação com Vite](https://vite.dev/guide/static-deploy.html#github-pages), [caminhos relativos](https://vite.dev/guide/build.html#relative-base).

Para atualizar depois: faça as alterações, use **Commit to main → Push origin** no Desktop. O envio à `main` dispara uma nova publicação automaticamente.

## 3. Onde entra o Supabase

Esta etapa é para quando formos desenvolver contas e dados persistentes. Ela não é necessária para publicar a prévia de hoje.

1. Acesse o [painel do Supabase](https://supabase.com/dashboard) e abra o projeto existente. Antes de conectar, precisamos examinar suas tabelas e integrações atuais para preservá-las. Não exclua ou recrie esse projeto.
2. Para a integração futura, localize a URL do projeto e a chave **publishable** pelo botão **Connect**. Chaves **secret/service_role** e a senha do banco nunca entram no código público. [Chaves do Supabase](https://supabase.com/docs/guides/getting-started/api-keys).
3. Depois de implementar o login real, configure o endereço publicado em **Authentication → URL Configuration → Site URL** e cadastre os retornos permitidos em **Redirect URLs**. Somente preencher essas configurações não conecta o protótipo. [URLs de autenticação](https://supabase.com/docs/guides/auth/redirect-urls).
4. Desenvolveremos as tabelas e permissões de perfis, campanhas, participantes e fichas. A restrição “jogador pode vincular sua ficha; mestre cria NPCs/vilões em outra área” também precisa ser aplicada no banco, com políticas de acesso (RLS), antes de receber dados reais. [Orientações de produção](https://supabase.com/docs/guides/deployment/going-into-prod).
5. Após conectar e testar contas distintas, publicaremos a nova versão pelo mesmo fluxo do GitHub. Até lá, o site continua demonstrativo.

O plano gratuito do Supabase pode pausar projetos com pouca atividade em um período de sete dias. A prévia estática atual no Pages não depende do Supabase e não é afetada por essa pausa. [Disponibilidade do Supabase](https://supabase.com/docs/guides/deployment/going-into-prod#availability).

O repositório remoto foi criado pelo usuário. Em 17/09/2026, o Git local foi corrigido para apontar à pasta que contém o site, mantendo o histórico e o endereço remoto. O README inicial da subpasta está preservado em `.preview/repository-setup-backup-20260917/`. Nenhum commit, push ou publicação externa foi executado automaticamente nesta correção.
