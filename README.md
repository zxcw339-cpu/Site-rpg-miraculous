# Miraculous · Painel de campanhas

Site React + TypeScript + Vite, com login, cadastro, boas-vindas, início e hubs de fichas/campanhas. Visual Aranha em grafite e vinho, fios independentes com brilho e composição para PC com referência 1920 × 1080. A adaptação específica para celular está adiada.

## Contas e banco

A integração Supabase está implementada no código. A ativação no projeto hospedado e no Discord segue [AUTENTICACAO.md](AUTENTICACAO.md). Nada foi aplicado ao banco remoto nesta preparação.

- Login por nome de usuário ou e-mail e senha, sem Google; Discord opcional, habilitado por configuração.
- Cadastro com nome de exibição, nome de usuário único, e-mail, senha/confirmar senha e bio opcional.
- Confirmação de e-mail, recuperação/troca de senha, sessão e saída pelo Supabase Auth.
- Perfis persistentes com nome, nome de usuário e bio; fotos em bucket privado, PNG/JPEG/WebP até 5 MB, adicionadas depois de entrar.
- SQL com acesso somente ao próprio perfil/foto; e-mails e senhas não entram na tabela de perfis.
- Login por nome via Edge Function, consulta privada e limitação persistente de tentativas. Nenhum catálogo público de e-mails.
- Callback PKCE compatível com a subpasta do Pages. Sessão e comprovante temporário PKCE em localStorage, sincronizados entre abas pelo SDK; use Sair para encerrar o acesso neste navegador. Nenhuma senha armazenada pelo aplicativo.
- Tema em localStorage (miraculous.theme). Sem configuração pública válida, os botões reais ficam desabilitados; há um botão explícito para explorar a demonstração.

## O que continua demonstrativo

Fichas, campanhas e convites ficam em memória, mesmo quando uma conta real está conectada. O rodapé e os formulários informam isso. Recarregar ou sair descarta as alterações dos hubs. Exemplos neutros não definem lore.

Fichas têm busca e linhas Não vinculadas, Vinculadas a campanhas e Todas. Fichas pessoais só podem se vincular a campanhas em que o usuário é jogador. Mesas em que ele é mestre ficam fora dos seletores; NPCs/vilões pertencerão ao futuro hub do mestre.

Campanhas têm busca e linhas Jogando, Mestrando e Todas, criação temporária e convite demonstrativo 123456. Não há convites reais, editor completo de personagem ou painéis de mestre/jogador. Os blocos compactos do futuro painel do mestre serão atalhos para áreas completas.

## Executar e conferir

Requer Node.js 22.12+; use Node 24 para os testes TypeScript nativos (validado com 24.18.0).

```sh
npm ci
npm run dev
npm test
npm run build
```

Abra [a prévia local](http://127.0.0.1:5173/). Para integrar seu Supabase localmente, preencha .env.local conforme .env.example e reinicie a prévia. Nunca coloque uma chave administrativa em VITE_*.

Rotas: #login, #cadastro, #recuperar-senha, #nova-senha, #boas-vindas, #inicio, #fichas e #campanhas. As quatro últimas exigem sessão real ou entrada explícita no modo de demonstração. A autorização real dos dados é aplicada pelo banco.

npm test verifica validações, configurações públicas, comportamento da função de login e regra das fichas. O teste SQL isolado adicional roda sem tocar no Supabase:

```sh
npm install --prefix .preview/backend-check --no-save --ignore-scripts @electric-sql/pglite
node tests/backend-sql.integration.mjs .preview/backend-check/node_modules/@electric-sql/pglite/dist/index.js
```

Esse teste usa PostgreSQL/WASM com estruturas de Auth/Storage simuladas. Verificações e limitações reais estão em [VERIFICACOES.md](VERIFICACOES.md).

## Publicação

GitHub Pages com caminhos relativos e fluxo de compilação/testes. [PUBLICAR.md](PUBLICAR.md) explica o envio pelo Desktop. [AUTENTICACAO.md](AUTENTICACAO.md) explica SQL, função, e-mail, Discord e variáveis do GitHub. A versão hospedada não exige PC ligado.

## Organização

- src/auth: cliente Supabase, validações, serviço e estado da conta.
- supabase/migrations: SQL aditivo de perfis, acesso, fotos e limite de tentativas.
- supabase/functions/login-with-username: função hospedada para login por nome.
- src/App.tsx: navegação, tema e dados temporários dos hubs.
- src/components: telas, perfil, formulários, diálogos e ornamentos.
- src/hub-data.ts: exemplos e regra das fichas pessoais.
- src/themes/themes.ts: arquitetura para 18 espaços; somente Aranha disponível, símbolo/paleta provisórios. preview-wine preservado por compatibilidade.
- public/fonts: fontes locais e licenças SIL Open Font License.

React 19.3.0, Vite 8.3.0, TypeScript 7.0.2, plugin React 6.1.1 e Supabase JS 2.116.0, fixados no lockfile. O SDK oficial do Supabase é a única nova dependência de execução nesta etapa.
