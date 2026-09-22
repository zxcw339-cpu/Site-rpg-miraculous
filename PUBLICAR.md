# Publicar a prévia

O site pode ser compartilhado como demonstração. Para ativar contas reais, conclua AUTENTICACAO.md antes de publicar esta atualização. Fichas e campanhas continuam temporárias.

O caminho preparado é GitHub para guardar o projeto e GitHub Pages para servir o site. Supabase fica responsável pelas contas e perfis depois de configurado. Seus domínios não são uma solução de hospedagem da interface React. [Documentação do Supabase](https://supabase.com/docs/guides/platform/custom-domains).

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

O fluxo `.github/workflows/deploy-pages.yml` já está pronto: instala as dependências, testa a regra das fichas, compila e publica apenas `dist`. O Vite usa caminhos relativos, compatíveis com a subpasta do repositório. A demonstração não precisa de chaves. Para contas reais, configure as variáveis públicas indicadas em AUTENTICACAO.md. [Publicação com Vite](https://vite.dev/guide/static-deploy.html#github-pages), [caminhos relativos](https://vite.dev/guide/build.html#relative-base).

Para atualizar depois: faça as alterações, use **Commit to main → Push origin** no Desktop. O envio à `main` dispara uma nova publicação automaticamente.

## 3. Ativar as contas

O código agora inclui contas e perfis com Supabase. Siga [AUTENTICACAO.md](AUTENTICACAO.md) para aplicar o SQL no projeto existente, publicar a função de login por nome e configurar e-mail/Discord e variáveis públicas do GitHub. O SQL ainda não foi aplicado ao banco hospedado nesta preparação.

Fichas, campanhas e convites continuam temporários. Não exclua nem recrie seu projeto Supabase. No plano gratuito, projetos podem ser pausados por inatividade; o site estático permanece hospedado no Pages, mas o login depende do Supabase estar disponível.
