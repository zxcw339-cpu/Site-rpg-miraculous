# Verificações do protótipo

## Publicação da função de login por nome — 22/09/2026

- CLI autenticada pelo usuário. Projeto identificado: MiraculousRPGDB, `teizrbsaocefxhtaqpxj`, ativo.
- Configurações públicas de Auth consultadas: e-mail e Discord habilitados, cadastro habilitado e confirmação de e-mail exigida. Isso não verifica o envio por SMTP nem o callback completo do Discord.
- Endpoint de perfis existe e negou consulta anônima com HTTP 401 / permission denied, conforme esperado. Nenhum SQL remoto aplicado por esta etapa.
- Configurados ALLOWED_ORIGINS e LOGIN_RATE_LIMIT_SECRET (novo valor criptograficamente aleatório, sem exposição em logs; arquivo temporário removido após envio).
- Publicada login-with-username versão 1, status ACTIVE. Requisição com usuário aleatório inexistente e origem do site retornou HTTP 401 com erro neutro, confirmando passagem pela função e pela consulta de login, sem criar conta.
- npm.cmd test: 17 testes passaram. Login com conta válida, cadastro, SMTP, retorno do Discord e publicação da interface no GitHub Pages ainda não verificados nesta etapa.

## Contas Supabase e Discord — 21/09/2026

- Integração local preparada para e-mail/senha, nome/senha via Edge Function e Discord via OAuth. Cadastro com confirmação, recuperação/troca de senha e perfil com foto privada. Nenhuma chave administrativa incluída no cliente.
- Build TypeScript/Vite aprovado. npm test: 17 testes passaram, cobrindo configuração pública, validação, limites/erros do login por nome e regra de vínculo das fichas.
- SQL executado em PostgreSQL isolado (PGlite): 28 verificações passaram. Estruturas Auth e Storage simuladas. Conferidos reaplicação sem perda de dados, perfis de e-mail/Discord, nomes únicos, acesso somente ao próprio perfil, rejeição de consulta anônima ao e-mail, políticas por pasta de fotos e contadores persistentes de tentativas.
- Revisão estática independente levou a corrigir sincronização entre abas (armazenamento compartilhado padrão do SDK), reinicialização do formulário ao trocar o modo de recuperação e aviso para callback PKCE expirado/sem comprovante. Senhas não são persistidas; tokens de sessão e PKCE usam o armazenamento do SDK. Banco real e fluxo entre duas contas reais ainda não foram testados.
- Navegador: formulários verificados em página local isolada, com respostas simuladas e sem rede. Campos vazios focaram o primeiro erro; Enter enviou o login, a recusa manteve o formulário e limpou a senha; confirmação diferente bloqueou cadastro; confirmação corrigida chamou o envio uma vez e exibiu retorno; solicitação de recuperação mostrou aviso neutro, e troca de modo abriu campos novos sem mensagem de senha alterada.
- Aplicativo sem configuração: botões reais desabilitados, mensagem clara, acesso direto a #fichas retorna ao login; botão explícito de demonstração abre boas-vindas. Tab/Enter abriu o início, Fichas abriu o hub e recarregar voltou ao login. Mostrar/ocultar senha também conferido.
- Cadastro inspecionado em 1920 × 1080 e 1366 × 768: cartão centralizado e documento sem transbordamento. Console sem erros/avisos na verificação final. Prévia local disponível na porta 5173.
- AUTENTICACAO.md contém aplicação do SQL, função, URLs, SMTP, Discord e variáveis do GitHub; PUBLICAR.md/README atualizados. Workflow incorpora somente valores públicos VITE_* na compilação.

Limites: não houve conexão ao Supabase do usuário, aplicação remota de SQL, publicação da função, configuração de provedor Discord/SMTP, envio de e-mails, upload real de foto, login real ou push/publicação do código. Essas verificações aguardam configuração do projeto hospedado. Fichas/campanhas/convites continuam temporários e identificados como demonstração. Mobile permanece adiado.


## Local do repositório — 17/09/2026

- Confirmado que o repositório criado pelo GitHub Desktop estava em uma subpasta e continha apenas `.gitattributes` e um README inicial.
- Metadados Git e `.gitattributes` movidos para a raiz real do site, com verificação prévia dos caminhos e sem sobrescrever arquivos. Histórico, branch main e origin preservados. O README inicial foi guardado em `.preview/repository-setup-backup-20260917/`.
- Status do Git passou a listar os fontes, assets e workflow do site. Confirmado que node_modules, dist e o backup local são ignorados.
- Nenhum commit ou push executado nesta correção. Não foi necessário repetir a compilação: o código da aplicação não mudou.

## Restrição de fichas e preparação de publicação — 15/09/2026

- Regra compartilhada permite vincular fichas pessoais somente a campanhas em que o usuário é jogador. Aplicada nos dois seletores, na classificação dos cartões e nas atualizações de estado.
- `npm test`: quatro testes passaram, cobrindo jogador permitido, mestre rejeitado, vínculo ausente/removido e alteração do papel de jogador para mestre.
- No navegador, criação e alteração de vínculo mostraram somente Campanha de exemplo 01 (jogador); Campanha de exemplo 02 (mestre) ficou ausente. Uma ficha foi criada vinculada à mesa de jogador e depois desvinculada, com atualização dos grupos.
- Build TypeScript/Vite aprovado com base relativa. A versão compilada foi servida localmente em `/teste-publicacao/`: JavaScript, CSS e as duas fontes carregaram; navegação para Campanhas e recarga funcionaram. Console sem erros ou avisos.
- Fluxo GitHub Pages e guia PUBLICAR.md preparados com base na documentação oficial. O workflow remoto não foi executado; nenhum repositório, site público ou integração Supabase foi criado. Não houve alterações em banco de dados.

## Hubs de fichas e campanhas — 15/09/2026

Os registros abaixo desta seção descrevem entregas anteriores. Os antigos avisos dos atalhos Fichas e Campanhas foram substituídos pelos hubs navegáveis.

- Compilação TypeScript estrita e build de produção aprovados após a integração e os ajustes finais.
- Navegação Início → Fichas → Campanhas e retorno pelo menu: título, foco no cabeçalho e seleção da área atual corretos. Menu expandido permanece expandido ao trocar de área. Voltar/avançar do navegador conferidos entre início e fichas.
- Fichas: nome vazio rejeitado com aviso e foco no campo; criação por Enter adicionou a ficha a Não vinculadas e Todas as fichas. Vincular e desvincular uma ficha moveram o cartão entre os grupos e atualizaram os contadores.
- Busca de fichas sem resultados apresentou estados vazios. Limpar busca restaurou os cartões e devolveu o foco ao campo. Busca de campanhas por TESTE encontrou a campanha temporária criada com nome em minúsculas.
- Campanhas: nome vazio rejeitado; criação por Enter adicionou a campanha a Mestrando. O resumo exibiu o papel de mestre e seu link abriu Fichas sem perder os itens temporários.
- Convite: código curto e código de seis dígitos diferente de 123456 receberam os avisos previstos. O código demonstrativo adicionou uma campanha a Jogando. Nova tentativa mostrou que o exemplo já estava presente, sem duplicá-lo.
- Campanhas criadas e o exemplo de convite apareceram nas opções de vínculo das fichas.
- Teclado: Tab a partir do título alcançou a busca com contorno visível, depois o convite, aberto por Enter. Escape fechou os diálogos. Criação e cancelamento retornaram o foco aos botões de abertura; quando o cartão mudou de grupo, o foco voltou ao título do hub. Corrigida a restauração de foco ao desmontar diálogos e verificada sua abertura com React StrictMode.
- Perfil editado no hub de campanhas preservou o nome no início e no hub de fichas. O editor continuou abrindo e aplicando alterações após a mudança no componente compartilhado de diálogos.
- Recarga descartou perfil e novos itens, restaurando Visitante e os exemplos iniciais. Sair voltou ao login vazio; retornar pelo histórico mostrou somente as campanhas iniciais.
- Aparência mostrou apenas Aranha. Escape retornou o foco ao botão Aparência. O tema Aranha permaneceu após recarga. Catálogo conferido separadamente: 18 espaços e uma aparência disponível; identificadores antigos de Prata/Esmeralda resolvem para Aranha.
- Inspeção visual dos dois hubs em 1920 × 1080 e 1366 × 768. Em 1920 × 1080, após o ajuste de espaçamento, as três seções iniciais ficaram completas, sem rolagem do conteúdo. Em 1366 × 768, documento sem transbordamento e conteúdo com rolagem interna. A seta de Todas as fichas deslocou horizontalmente a linha de quatro cartões.
- Consulta ao console sem erros ou avisos. Revisão do código confirmou somente a preferência de tema em localStorage, sem envio de formulários à rede ou persistência dos hubs.

Testes no navegador integrado do Codex, com dados fictícios. Criação, vínculos e convite são demonstrações em memória. Não foram testados mobile, outros navegadores, leitores de tela ou autenticação real nesta etapa. Não há editor completo de personagem nem painéis de campanha implementados.

## Página inicial e perfil — 15/09/2026

- Compilação TypeScript e build de produção aprovados após a integração.
- Login fictício → boas-vindas → início: saudação preserva o nome e recebe foco. Cadastro fictício → boas-vindas → início: biografia confirmada no perfil.
- Menu lateral expandido com rótulos visíveis. Fichas e Campanhas abriram avisos distintos sobre as próximas áreas. Escape fecha o aviso e devolve o foco ao atalho; o botão de retorno também fecha.
- Perfil compacto abriu no canto inferior. Tab alcançou Editar perfil com contorno de foco; Escape fechou o perfil e retornou o foco ao avatar.
- Editor: nome vazio rejeitado com mensagem e foco no campo. Aplicação de nome e biografia atualizou a saudação e o perfil. Cancelar preservou os dados anteriores.
- Foto PNG fictícia selecionada no editor, aplicada e confirmada carregada no avatar por URL temporária. Remoção aplicada confirmou ausência da imagem no avatar.
- Perfil → Sair voltou ao login vazio. Recarga do início descartou o perfil e mostrou Visitante; tema Vinho preservado.
- Inspeção visual em 1920 × 1080 e 1366 × 768. Em 1366 × 768, painel principal de 1254 × 600, sem rolagem do documento e com o perfil compacto dentro da janela.
- Consulta ao console da prévia final sem erros ou avisos.
- Revisão independente da navegação e do ciclo das URLs temporárias. Adicionado fallback de ícone para falha no carregamento dos avatares e limite de altura do perfil considerando sua distância da borda inferior.

Dados fictícios, navegador integrado do Codex. Fichas e campanhas ainda são atalhos demonstrativos. Sem banco, autenticação ou persistência de perfil. Não foram executados testes mobile, em outros navegadores ou de todos os formatos de foto nesta etapa.

## Boas-vindas — 15/09/2026

- Compilação TypeScript e build de produção aprovados.
- Login com campos vazios permanece no formulário com mensagens de validação. Login preenchido com dados fictícios e enviado por Enter abre `#boas-vindas`, mostra o nome informado e leva o foco ao título.
- Cadastro com senhas diferentes permanece no formulário. Com confirmação corrigida e foto PNG fictícia, abre as boas-vindas com nome e foto carregada por uma URL temporária própria.
- Teclado: Tab a partir do título alcança Entrar e depois Sair, ambos com contorno de foco. Enter aciona os dois controles.
- Entrar mostra o aviso de que o painel de campanhas será a próxima etapa. Sair volta ao login vazio. Voltar pelo histórico depois de Sair mostra Visitante, sem recuperar o perfil anterior.
- Recarregar as boas-vindas descarta nome/foto e exibe Visitante com ícone padrão; o tema Vinho permanece.
- Em 1920 × 1080, centro do cartão em (960, 540), sem transbordamento. Em 1366 × 768, inclusive com o aviso de Entrar, centro em (683, 384), marca visível e documento sem rolagem.
- Nome com 80 caracteres sem espaços quebrou em linhas e permaneceu dentro do cartão em 1366 × 768.
- Inspeção visual da nova tela nas duas resoluções; consulta ao console sem erros ou avisos.
- Revisão independente do código de navegação, foco, dados temporários e clareza da demonstração. Senhas não são encaminhadas à tela; foto e nome ficam apenas em memória. Apenas o tema é persistido.

Os testes acima substituem o antigo comportamento de permanecer no formulário após envio válido. Nenhuma conta ou sessão é criada. Sem testes mobile ou de autenticação real nesta etapa.

## Cadastro e composição para PC — 14/09/2026

Escopo atual: login e cadastro navegáveis. Os registros abaixo das etapas anteriores são históricos; o antigo diálogo de cadastro foi substituído por uma página. O refinamento para mobile foi adiado a pedido do usuário.

- Build final de produção e verificação TypeScript concluídos com sucesso.
- Login medido em 1920 × 1080: centro do cartão em (960, 540), sem transbordamento do documento.
- Cadastro conferido visualmente em 1920 × 1080 e 1366 × 768, com perfil Vinho e os fios independentes existentes.
- Com mensagem de demonstração e biografia expandida até 145 px, o cartão permaneceu centralizado em ambas as resoluções. Marca e rodapé continuaram visíveis; documento sem rolagem horizontal ou vertical.
- Campos obrigatórios vazios: mensagens específicas e foco no nome. Senhas diferentes: mensagem de confirmação e foco no campo correspondente.
- Os dois controles de mostrar/ocultar alternaram os tipos dos respectivos campos.
- Biografia: tentativa de preencher 320 caracteres resultou em 300 caracteres e contador 300/300 após o ajuste do limite.
- Foto PNG de teste: prévia carregada por URL local temporária; remoção voltou o foco ao seletor. Arquivo de texto, arquivo acima de 5 MB e imagem que não pode ser decodificada receberam os avisos correspondentes.
- Cadastro enviado por Enter com nome e senhas fictícios, sem foto e sem biografia: feedback explícito de que nenhuma conta foi criada, e as duas senhas foram limpas.
- Sequência de Tab a partir da foto: Nome → Senha → Mostrar senha → Confirmar senha → Mostrar confirmação → Sobre mim → Criar conta → Entrar. Todos os controles dessa sequência mostraram contorno de foco.
- Links de cadastro/login e voltar/avançar do navegador: telas e títulos corretos, foco no título da nova tela e descarte dos dados temporários ao sair do formulário.
- Seletor de aparência no cadastro: seleção de Vinho e fechamento por “Concluir” mantendo a tela de cadastro.
- Recarga do cadastro: nome, senha, confirmação e biografia vazios; preferência Vinho preservada.
- Consulta ao console da aba de testes: nenhum erro ou aviso retornado.
- Revisão do código de persistência: apenas a preferência de tema é gravada. Não há backend, envio de cadastro, upload da foto ou validação real de nomes duplicados.
- Revisão independente do formulário e dos estados de foco; README atualizado para a entrega atual.

Testes conduzidos no navegador integrado do Codex com dados e arquivos fictícios locais. Não foram repetidos testes mobile nesta etapa nem executados testes em outros navegadores ou leitores de tela.

## Fios independentes e perfil Vinho — 14/09/2026

- Removidos os anéis e os raios que formavam o desenho de teia; os quatro cantos usam seis fios curvos independentes.
- Brilhos e penduricalhos reposicionados sobre esses fios, com revisão independente das coordenadas.
- Perfil Vinho selecionado pelo controle de Aparência e confirmado na interface.
- Inspeção visual no navegador da composição com fios e perfil Vinho; build TypeScript/Vite aprovado.

## Refinamento das teias — 14/09/2026

- Build TypeScript/Vite aprovado após adicionar as teias, os reflexos e os penduricalhos.
- Inspeção visual da moldura no desktop e em 390 × 844.
- Confirmados quatro cantos e seis penduricalhos no desktop; os dois menores são ocultados no celular.
- O deslocamento calculado do brilho variou entre amostras, confirmando a animação no navegador. O balanço usa animação CSS própria.
- Em 320 × 568, documento sem rolagem horizontal e cristais laterais dentro da largura visível.
- Clique nos campos, Tab de Nome para Senha, abertura do seletor e Escape continuaram funcionando. A decoração tem `pointer-events: none` e não recebe foco.
- Console sem erros ou avisos durante essa verificação.
- Regra de movimento reduzido revisada no código: brilhos ficam estáticos e o balanço é desativado. Não foi emulada essa preferência no navegador.

Data: 14/09/2026. Ambiente: Windows, Node.js 24.18.0, navegador integrado do Codex. Foram utilizados dados fictícios em uma página de teste local separada.

## Executadas

- Compilação TypeScript estrita e build de produção concluídos com `npm run build`.
- Servidor local respondeu HTTP 200 e a página foi aberta no navegador.
- Envio com dois campos vazios: mensagens específicas e foco em Nome.
- Envio com Nome preenchido e Senha vazia: foco em Senha e mensagem específica.
- Mostrar/ocultar: tipo do campo alternou entre `text` e `password`.
- Envio por Enter com dados fictícios: exibiu aviso de que não houve autenticação, limpou a senha e manteve a URL do login.
- Cadastre-se: abriu o diálogo informativo, sem criar conta; Escape fechou e devolveu o foco ao link.
- Sequência de Tab no formulário: Nome → Senha → Mostrar senha → Entrar → Cadastre-se. Os cinco controles apresentaram contorno de foco.
- Setas para a direita no grupo de temas: Vinho → Prata → Esmeralda, com seleção e foco correspondentes.
- Tema Esmeralda permaneceu selecionado depois de recarregar; Nome e Senha voltaram vazios.
- Retorno do seletor ao login por botão e fechamento por Escape.
- Layout conferido em larguras de 320, 390, 768 e 1366 pixels; nenhum transbordamento horizontal encontrado nas medições do documento.
- Conferência final em 1366 × 768 após o ajuste de espaçamento: documento de 1366 × 768, sem rolagem horizontal ou vertical no estado inicial.
- Em 320 × 568, o diálogo permaneceu dentro da tela com rolagem interna e o botão de retorno foi acionado com sucesso.
- Inspeção visual da tela de login no tamanho normal do navegador e em 390 × 844; inspeção visual da caixa de temas no celular.
- Consulta ao console durante os testes de formulário e temas: nenhum aviso ou erro retornado.
- Revisão independente do código de foco, diálogos, demonstração e catálogo. O catálogo foi ajustado para que o seletor e a recuperação da preferência compartilhem as mesmas 18 posições.
- Revisão do código de persistência: somente `miraculous.theme` é escrito em `localStorage`; não há armazenamento de senhas, cookies, chamadas de autenticação ou envio de formulário à rede.
- Fontes WOFF2 locais e licenças conferidas; a aplicação não depende do Google Fonts em tempo de execução.

## Limites da verificação

Não foram executados testes em aparelhos físicos, Safari/Firefox, leitores de tela ou uma auditoria completa WCAG. Os caminhos de armazenamento bloqueado e preferência inválida foram revisados no código, sem simulação no navegador. Não há autenticação nem banco de dados para testar nesta fase. As verificações de interface foram conduzidas no navegador; não foi criada uma suíte automatizada permanente.
