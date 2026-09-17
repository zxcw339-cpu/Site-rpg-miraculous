# Miraculous · Painel de campanhas

Protótipo navegável das telas de login, cadastro, boas-vindas, início e dos hubs de fichas e campanhas do Fluxograma V1. A composição atual prioriza o uso em PC, com referência de 1920 × 1080 e conteúdo que se ajusta à janela. A adaptação específica para celulares ficou para uma próxima etapa.

A pasta estava vazia quando a implementação começou. Nenhum projeto, banco de dados ou serviço externo foi migrado ou removido.

## Executar

Requer Node.js 20.19+ ou 22.12+ (validado com Node 24.18.0).

```sh
npm ci
npm run dev
```

Acesse [a prévia local](http://127.0.0.1:5173/). Também é possível abrir diretamente [o login](http://127.0.0.1:5173/#login), [o cadastro](http://127.0.0.1:5173/#cadastro), [as boas-vindas](http://127.0.0.1:5173/#boas-vindas), [o início](http://127.0.0.1:5173/#inicio), [as fichas](http://127.0.0.1:5173/#fichas) ou [as campanhas](http://127.0.0.1:5173/#campanhas). O acesso direto às áreas da prévia usa o perfil “Visitante”. A prévia depende de o servidor permanecer em execução.

```sh
npm run build
npm run preview
```

O build verifica os tipos e gera a pasta `dist`. Não há backend.

O passo a passo para publicar a prévia está em [PUBLICAR.md](PUBLICAR.md). O fluxo de GitHub Pages já está preparado, e os arquivos compilados usam caminhos relativos para funcionar na subpasta do repositório. Nada foi publicado externamente nesta preparação.

Com Node.js 24, `npm test` executa as verificações da regra de vínculo das fichas, sem dependências extras.

## O que funciona

- Login com nome e senha, validação de campos vazios, foco no primeiro erro e opção de mostrar/ocultar senha.
- Navegação entre login (`#login`), cadastro (`#cadastro`), boas-vindas (`#boas-vindas`), início (`#inicio`), fichas (`#fichas`) e campanhas (`#campanhas`), incluindo o histórico do navegador.
- Cadastro com nome de quem joga, senha e confirmação obrigatórios. As duas senhas têm controles independentes de mostrar/ocultar; a confirmação precisa ser igual à senha.
- Foto de perfil opcional com prévia local, troca e remoção. São aceitas imagens PNG, JPEG ou WebP de até 5 MB; arquivos incompatíveis ou que não podem ser abertos recebem um aviso.
- Biografia opcional em “Sobre mim”, com limite e contador de 300 caracteres.
- Envio por botão ou Enter com aviso explícito de demonstração. Um envio válido de login ou cadastro abre diretamente as boas-vindas e descarta as senhas; nenhuma conta ou sessão é criada. A disponibilidade de nomes e a rejeição de nomes duplicados dependem de um backend futuro.
- Boas-vindas simples com “Bem-vindo(a)”, nome, foto circular ou ícone de usuário, Entrar e Sair. Entrar abre a página inicial; Sair retorna ao login.
- [Página inicial](http://127.0.0.1:5173/#inicio) com saudação e símbolo provisório central. Início, Fichas e Campanhas compartilham o menu lateral recolhível e o perfil no canto inferior; a navegação indica a área atual e mantém o menu aberto ou recolhido ao trocar de hub.
- [Hub de fichas](http://127.0.0.1:5173/#fichas) com as linhas “Não vinculadas”, “Vinculadas a campanhas” e “Todas as fichas”, contadores, busca por nome da ficha ou campanha e estados sem resultados.
- Nova ficha abre um formulário de nome e campanha opcional, mostrando apenas campanhas em que você é jogador. A regra também é conferida ao atualizar os dados. Fichas pessoais não podem ser vinculadas a mesas em que você é mestre; NPCs e vilões serão criados pelo futuro hub do mestre. Vincular ou desvincular reorganiza as linhas; vínculos com campanhas ausentes ou de mestre aparecem como não vinculados. O editor completo de personagem ainda não faz parte desta etapa.
- [Hub de campanhas](http://127.0.0.1:5173/#campanhas) com as linhas “Jogando”, “Mestrando” e “Todas as campanhas”, contadores e busca por nome. Os cartões abrem uma visão geral com o papel do usuário e um atalho para as fichas.
- Criar campanha adiciona um cartão temporário a “Mestrando”. Entrar por convite usa exclusivamente o código demonstrativo **123456**, de seis dígitos, para adicionar uma campanha de exemplo a “Jogando”. Outros códigos recebem um aviso; repetir a demonstração não duplica a campanha. Nenhum convite real é gerado ou validado.
- Os hubs começam com exemplos neutros identificados nos cartões, sem personagens ou lore inventados. Cada linha pode ser percorrida horizontalmente quando houver mais cartões; o conteúdo do hub tem rolagem vertical quando necessário.
- O perfil abre um painel compacto com nome, foto e biografia. Editar perfil abre um formulário completo para alterar esses dados apenas na prévia; Cancelar descarta o rascunho. A foto tem os mesmos formatos e limite do cadastro, com carregamento verificado antes da aplicação.
- O login passa somente o nome. O cadastro passa nome, biografia e foto opcional, mantidos em memória durante a navegação entre boas-vindas, início e hubs. Fichas, campanhas e vínculos da prévia também permanecem em memória durante essa navegação. As senhas são descartadas.
- Sair, retornar a login/cadastro ou recarregar a página descarta o perfil e as alterações temporárias dos hubs, restaurando os exemplos iniciais. O acesso direto às telas mostra “Visitante”. As fotos não são enviadas à rede; suas URLs temporárias são liberadas quando deixam de ser usadas.
- Aparência abre a caixa com somente **Aranha**, em grafite, prata e detalhes em vinho, com símbolo provisório. As antigas opções Prata e Esmeralda foram retiradas do menu; os demais espaços continuam reservados.
- Somente a preferência de tema persiste em `localStorage`, na chave `miraculous.theme`. Não há cookies, gravação de dados de cadastro ou envio de formulários à rede.
- O seletor de aparência e os formulários dos hubs usam o elemento nativo `dialog`. Escape fecha o diálogo e devolve o foco ao controle que o abriu; se o cartão mudar de grupo, o foco volta ao título do hub.
- Composição escalável para PC, tomando 1920 × 1080 como referência: login, cadastro e boas-vindas ficam centralizados; início e hubs usam uma área ampla com menu lateral. O refinamento para mobile está adiado.
- Fontes locais, arte vetorial própria e respeito à preferência de movimento reduzido.

Use apenas dados fictícios nesta versão.

## Temas e estrutura

- `src/App.tsx`: navegação entre as seis áreas, perfil e dados temporários dos hubs, tema, foco e escala da composição para PC.
- `src/components/LoginForm.tsx`: campos, validação e envio demonstrativo do login.
- `src/components/RegistrationForm.tsx`: campos de cadastro, prévia da foto, validação e envio demonstrativo.
- `src/components/WelcomeScreen.tsx`: saudação, nome e foto temporários, entrada no início e saída para o login.
- `src/components/HomeScreen.tsx` e `src/home.css`: página inicial e estrutura compartilhada (`WorkspaceShell`) com menu lateral e perfil para início e hubs.
- `src/components/SheetsHub.tsx`: busca, agrupamento, criação temporária e alteração dos vínculos de fichas.
- `src/components/CampaignHub.tsx` e `src/campaign-hub.css`: busca, agrupamento, criação temporária, visão geral e demonstração de convite de campanhas.
- `src/components/HubParts.tsx` e `src/hubs.css`: cabeçalho, busca, botões, linhas com rolagem, cartões e apresentação compartilhada dos hubs.
- `src/hub-data.ts`: tipos de fichas e campanhas, exemplos iniciais e busca sem distinção de maiúsculas ou acentos.
- `src/components/HomeProfile.tsx` e `src/home-profile.css`: perfil compacto e edição temporária de nome, foto e biografia.
- `src/components/Modal.tsx`: comportamento compartilhado dos diálogos.
- `src/components/ThemePicker.tsx`: seletor por símbolos.
- `src/themes/themes.ts`: paletas, catálogo e 18 espaços reservados, de `miraculous-01` até `miraculous-18`.
- `src/components/Icons.tsx`: ícones de interface e símbolos provisórios, incluindo Aranha.
- `src/components/Atmosphere.tsx`: arcos, colunas e ornamentos decorativos.
- `src/components/WebFrame.tsx`: fios independentes nos quatro cantos, reflexos animados e cristais/estrelas pendurados. Os cantos se adaptam à largura da tela e as animações respeitam movimento reduzido.
- `src/styles.css`: estilos compartilhados, cores por variáveis, fios e ornamentos.
- `src/auth.css`: composição centralizada de login e cadastro, escala para PC e apresentação dos campos de cadastro.
- `src/welcome.css`: apresentação das boas-vindas, foto circular, nomes longos e botões.
- `public/fonts`: fontes e suas licenças SIL Open Font License.

O estudo inicial tinha as variações Vinho, Prata e Esmeralda. A aparência atual concentra o desenvolvimento em Aranha, conforme a orientação do usuário, mantendo a paleta vinho já aprovada. Seu símbolo e sua paleta continuam provisórios; não definem lore. O identificador interno `preview-wine` foi preservado para compatibilidade com a preferência anterior.

A arquitetura dos 18 espaços permanece preparada. As definições oficiais podem ficar em arquivos individuais dentro de `src/themes` e ser importadas para `miraculousThemes`. O seletor e `getTheme` consomem o mesmo catálogo derivado dos espaços. Uma definição substitui o estudo provisório do respectivo espaço. Símbolos definitivos devem ser acrescentados a `ThemeSymbol` e ao componente de símbolos quando forem fornecidos.

As variáveis de cada tema controlam botão, foco, brilho, fundo ambiente e ornamentos. A estrutura de navegação não muda. Se a preferência estiver indisponível, tiver um identificador antigo de Prata/Esmeralda ou não existir no catálogo, o protótipo usa Aranha. Se o navegador bloquear a gravação, a aparência continua na página e o seletor informa a limitação.

## Fora desta entrega

Autenticação real, criação de contas, verificação de nomes duplicados, upload e persistência de fotos, perfis salvos, persistência de fichas/campanhas, convites reais, editor completo de ficha e painéis de mestre/jogador. Os hubs disponíveis organizam somente os dados temporários da demonstração. A experiência específica para mobile também ficou para uma próxima etapa.

Supabase continua como uma possibilidade sem integração ou decisão de banco nesta fase. Os blocos compactos do futuro painel do mestre serão atalhos para áreas completas, conforme a orientação do usuário.

## Referências

- Fluxograma V1 e imagem visual fornecidos pelo usuário.
- PDF de pesquisa tratado como contexto técnico, não como autorização para ampliar o escopo.
- [Documentação do React](https://react.dev/versions) e [compatibilidade do Vite](https://vite.dev/guide/). Versões estáveis consultadas no registro npm em 14/09/2026 e fixadas com `package-lock.json`: React 19.3.0, Vite 8.3.0, TypeScript 7.0.2, plugin React 6.1.1.

As verificações executadas estão em `VERIFICACOES.md`.
