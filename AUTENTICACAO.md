# Ativar contas no Supabase

A integração está preparada no projeto. Em 22/09/2026, a função de login por nome foi publicada em `MiraculousRPGDB` e seus dois segredos foram configurados. A tabela de perfis já existe no projeto hospedado; o SQL não foi reaplicado nesta publicação. O site atualizado e os acessos reais ainda precisam ser conferidos. Contas e perfis serão reais; fichas, campanhas e convites continuam demonstrações em memória nesta entrega.

O site fica no GitHub Pages. O Supabase hospeda as contas, fotos e a função de login por nome. Discord é um login OAuth: não usa bot e não exige deixar seu PC ligado. [Guia oficial](https://supabase.com/docs/guides/auth/social-login/auth-discord).

## 1. Aplicar o SQL no projeto existente

1. Abra seu projeto atual no [Supabase](https://supabase.com/dashboard).
2. Abra **SQL Editor → New query**.
3. Copie o conteúdo completo de `supabase/migrations/202609170001_rpg_auth.sql`, cole no editor e execute **Run**.
4. Se aparecer um erro, guarde a mensagem antes de prosseguir. O arquivo usa uma transação: uma falha desfaz essa execução.

Ele cria `rpg_profiles`, funções com prefixo `rpg_`, o espaço privado `rpg_private` e o bucket privado `rpg-avatars`. Não apaga tabelas ou contas existentes. Um gatilho cria o perfil quando o Auth cria a conta; contas antigas ganham um perfil sem nome de usuário reservado. As senhas continuam exclusivamente no Supabase Auth.

As regras permitem consultar e editar somente o próprio perfil e enviar imagens somente à pasta do próprio usuário. O SQL pode ser repetido para os objetos desta versão. Se seu banco já tiver objetos `rpg_*` de outro projeto, revise a compatibilidade antes de executar. Políticas antigas muito permissivas em `storage.objects` também precisam ser revisadas, porque políticas permissivas se somam.

## 2. Endereços de retorno

Em **Authentication → URL Configuration**:

- **Site URL:** `https://zxcw339-cpu.github.io/Site-rpg-miraculous/`
- **Redirect URLs:** adicione exatamente esse mesmo endereço com a barra final.
- Para testes locais, adicione também `http://127.0.0.1:5173/`.

Não acrescente `#login` ou `#inicio`. O aplicativo recebe o retorno na raiz da subpasta e abre a tela correta. Confirmação de e-mail e recuperação usam PKCE: abra o link no mesmo navegador em que solicitou o acesso. A sessão e o comprovante temporário são compartilhados entre abas pelo SDK. Somente tokens de sessão são guardados no navegador, nunca senhas; use Sair para encerrar o acesso neste navegador. [URLs do Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

## 3. E-mail e senha

1. Em **Authentication → Sign In / Providers → Email**, mantenha o e-mail habilitado e a confirmação de e-mail ativada.
2. Defina o tamanho mínimo de senha como **8** ou mais.
3. Em **Authentication → Emails → SMTP Settings**, configure seu serviço de envio de e-mails para receber jogadores fora da equipe do Supabase.

O remetente padrão do Supabase é para testes e restringe o envio a endereços da equipe do projeto. Para cadastro público e recuperação de senha, configure SMTP. Não desative a confirmação de e-mail para contornar essa limitação. [Documentação de SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

No cadastro, o jogador escolhe um nome de exibição e um nome de usuário único, informa e-mail e senha. Depois entra pelo nome de usuário ou pelo e-mail. O nome de usuário tem 3–32 caracteres, começa com letra/número e aceita letras sem acentos, números, ponto, hífen e sublinhado. Maiúsculas viram minúsculas.

## 4. Discord, sem Google

1. No Supabase, abra **Authentication → Sign In / Providers → Discord** e copie a **Callback URL**. Formato: `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
2. Abra o [Discord Developer Portal](https://discord.com/developers/applications) e crie uma aplicação para o site.
3. Em **OAuth2 → Redirects → Add Redirect**, cole a Callback URL do Supabase e salve.
4. Copie **Client ID** e **Client Secret** da aplicação para os campos do provedor Discord no Supabase. Habilite o provedor e salve.
5. Mantenha Google desabilitado. Não crie bot e não solicite permissões de servidores: este fluxo usa somente identidade/e-mail.
6. Depois, defina `VITE_DISCORD_ENABLED=true` nas variáveis do site, conforme o passo 6.

O Client Secret do Discord fica somente no Supabase. Não coloque esse segredo no GitHub, em arquivos `VITE_*` ou na conversa. [Configuração oficial](https://supabase.com/docs/guides/auth/social-login/auth-discord).

Uma conta criada pelo Discord não recebe uma senha inventada. Para também usar nome/e-mail e senha, entre com Discord, escolha um nome de usuário em **Perfil → Editar perfil**, saia e use **Esqueci minha senha** com o e-mail da conta Discord para definir uma senha própria. O e-mail precisa estar acessível e o SMTP configurado.

## 5. Função de login por nome

O Supabase aceita e-mail/senha diretamente. O acesso por nome precisa da função `login-with-username` para resolver o e-mail no servidor. Não existe consulta pública de nomes para e-mails. [API de senha](https://supabase.com/docs/reference/javascript/auth-signinwithpassword).

Os arquivos são `supabase/functions/login-with-username/index.ts` e `handler.ts`. Para publicar pelo terminal na pasta do projeto:

```powershell
npx.cmd supabase login
npx.cmd supabase functions deploy login-with-username --project-ref teizrbsaocefxhtaqpxj --no-verify-jwt
```

O comando acima já usa o identificador do projeto `MiraculousRPGDB`. Use `npx.cmd` no PowerShell para evitar o bloqueio do script `npx.ps1`, sem alterar a política de execução do Windows. A publicação desta função foi concluída em 22/09/2026; só repita quando o código dela mudar. Esse comando publica somente a função; não executa migrações nem remove o banco. Ela aceita chamadas antes do login e verifica dados, origem e limites internamente. `supabase/config.toml` já registra essa configuração.

Em **Edge Functions → Secrets**, adicione:

| Nome | Valor |
| --- | --- |
| `ALLOWED_ORIGINS` | `https://zxcw339-cpu.github.io,http://127.0.0.1:5173` |
| `LOGIN_RATE_LIMIT_SECRET` | Segredo aleatório de pelo menos 32 caracteres, gerado uma vez e guardado somente no Supabase |

Para gerar o segredo localmente, use `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` e cole o resultado diretamente no Supabase. Não salve no código nem envie na conversa.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidos pelo ambiente hospedado das Edge Functions. A chave administrativa é usada apenas na função para resolver o usuário; a senha é conferida pelo Auth. Ela nunca vai para a interface.

Há limites persistentes inclusive para nomes inexistentes: 10 tentativas por nome em 15 minutos, 30 por grupo de cliente em 15 minutos e 120 por minuto no total. O agrupamento de IP é complementar e pode representar um proxy compartilhado. Os limites de nome e global funcionam independentemente dele. Contadores antigos são limpos em chamadas posteriores, depois de um dia. Senhas e e-mails não são gravados nesses contadores.

## 6. Conectar o site e publicar

No Supabase, use **Connect** ou as configurações de API para copiar a URL e a chave **Publishable** (a antiga chave pública `anon` também é aceita). Nunca use `service_role` ou `sb_secret_*` na interface.

Para testar neste computador, copie `.env.example` para `.env.local`, preencha os valores públicos e reinicie a prévia. `.env.local` é ignorado pelo Git.

Para o site público, no GitHub vá a **Settings → Secrets and variables → Actions → Variables → New repository variable**:

| Nome | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | URL do seu projeto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública Publishable ou anon |
| `VITE_DISCORD_ENABLED` | `true` depois de habilitar o Discord; antes, `false` |

Esses valores públicos entram na compilação. As regras de acesso do banco protegem os dados, não o sigilo da chave pública. [Chaves do Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

No GitHub Desktop, faça **Commit to main → Push origin**. Aguarde a publicação no GitHub Actions. Se alterar variáveis depois de publicar, rode novamente o workflow para gerar uma nova versão.

Sem configuração válida, o site informa que as contas estão sendo preparadas e mantém os botões reais desabilitados. **Explorar demonstração sem criar conta** abre apenas os exemplos, sem pedir senha nem autenticar alguém.

## Conferência no projeto hospedado

Teste uma conta por e-mail, confirme a mensagem, saia e entre por e-mail e por nome. Faça uma recuperação de senha. Teste Discord e o retorno à subpasta do site. Edite nome/biografia/foto e recarregue. Confira com duas contas que uma não acessa perfil/foto da outra.

Os testes locais estão em `VERIFICACOES.md`. Eles não substituem a conferência real de e-mail, Discord e políticas no seu projeto hospedado.

O PC pode ficar desligado. O login depende dos serviços hospedados; no plano gratuito, o Supabase pode pausar projetos por inatividade. [Disponibilidade](https://supabase.com/docs/guides/deployment/going-into-prod#availability).
