# Miraculous · Painel de campanhas

Site React + TypeScript + Vite, com login, cadastro, boas-vindas, início, hubs, ficha completa e visões internas de campanha para jogador e mestre. Composição para PC com referência 1920 × 1080. A adaptação específica para celular está adiada.

## Aparências

O menu Aparência permite alternar entre Aranha (grafite, vinho e fios com brilho) e Kitsune (grafite, vermelho profundo, portal e lanternas douradas). Kitsune segue a referência fornecida, com luz suave nas lanternas e balanço de papéis, sinos e fios ao vento. As animações respeitam a preferência de movimento reduzido do sistema. A escolha fica salva neste navegador e acompanha a navegação; símbolos e paletas continuam provisórios.

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

Fichas têm busca e linhas Não vinculadas, Vinculadas a campanhas e Todas. Fichas pessoais só podem se vincular a campanhas em que o usuário é jogador. A ficha interna inclui identidade (nome, gênero, idade, altura e retrato PNG), quatro barras, atributos em dados inteiros, perícias fixas em bônus de 5, inventário, habilidades em seção própria, lore e aparência com imagens PNG. A ficha mostra somente os valores da forma atual; ao transformar, exibe civil mais bônus daquela forma. O menu Miraculous inclui as 19 formas e conceitos fornecidos para o projeto; as duas aparências visuais do site continuam provisórias e são escolhidas separadamente. Os botões de dados rolam diretamente e mostram o resultado sem deslocar a página; as perícias usam o atributo escolhido na sua seção. O botão do cabeçalho rola um d20 livre. O mestre configura os bônus em um diálogo acessado pelo menu Miraculous, separado dos valores da ficha, e pode editar as habilidades dos participantes e NPCs temporários. Não há controles de adicionar/remover perícias nem seção de anotações da ficha. As fichas novas começam sem números e sem habilidades fictícias.

Campanhas têm busca e linhas Jogando, Mestrando e Todas, criação temporária e convite demonstrativo 123456. A visão de jogador abre fichas pessoais vinculadas e mídias compartilhadas; a visão de mestre usa atalhos para áreas completas de participantes, NPCs/inimigos, mídias, itens, notas e rolagens. O mestre pode abrir a ficha temporária de cada participante para configurar os bônus de cada forma e suas habilidades. Fichas de NPC ficam dentro da campanha do mestre, separadas das fichas pessoais. Os conteúdos da campanha são demonstrativos em memória. Ainda não há convites reais, vínculo real de fichas de outros jogadores, envio de conteúdos ou persistência no banco.

Dentro de cada campanha, a área Comunidade reúne um mural de imagens e anotações e um chat. O mestre escolhe em Mídias e Notas quais conteúdos ficam visíveis no mural; anotações privadas e antigas sem marcação permanecem fora dele. Imagens podem ser ampliadas. O chat aceita Enter para enviar e Shift + Enter para quebrar linha, com mensagens separadas por campanha. Nesta prévia, só a pessoa usando a aba vê as mensagens; não há envio entre contas e recarregar descarta a conversa. O próximo passo para uso em grupo é conectar campanhas, conteúdos e chat ao Supabase com permissões por participante.

## Executar e conferir

Requer Node.js 22.12+; use Node 24 para os testes TypeScript nativos (validado com 24.18.0).

```sh
npm ci
npm run dev
npm test
npm run build
```

Abra [a prévia local](http://127.0.0.1:5173/). Para integrar seu Supabase localmente, preencha .env.local conforme .env.example e reinicie a prévia. Nunca coloque uma chave administrativa em VITE_*.

Rotas: #login, #cadastro, #recuperar-senha, #nova-senha, #boas-vindas, #inicio, #fichas, #ficha/:id, #campanhas, #campanha/:id, #campanha/:id/npc/:id e #campanha/:id/jogador/:id. As páginas internas exigem sessão real ou entrada explícita no modo de demonstração. A autorização real dos perfis é aplicada pelo banco; fichas e campanhas não são enviadas a ele nesta fase.

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
- src/themes/themes.ts: arquitetura para 18 espaços; Aranha e Kitsune disponíveis, símbolos/paletas provisórios. preview-wine preservado por compatibilidade.
- src/components/LanternAtmosphere.tsx e src/lantern-theme.css: desenho vetorial e animações do tema Kitsune, sem dependências adicionais.
- public/fonts: fontes locais e licenças SIL Open Font License.

React 19.3.0, Vite 8.3.0, TypeScript 7.0.2, plugin React 6.1.1 e Supabase JS 2.116.0, fixados no lockfile. O SDK oficial do Supabase é a única nova dependência de execução nesta etapa.
