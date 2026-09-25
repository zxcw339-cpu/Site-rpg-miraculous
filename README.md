# Miraculous · Painel de campanhas

Site de RPG para PC feito com React, TypeScript e Vite. O desenho para celular será uma interface própria; a direção inicial está em [MOBILE.md](MOBILE.md). As aparências Aranha e Kitsune continuam provisórias e a preferência visual fica no navegador.

## O que funciona

Com o Supabase configurado, cadastro e login por nome ou e-mail, senha e Discord usam contas reais. O perfil, as fichas e as campanhas são salvos no Supabase. [AUTENTICACAO.md](AUTENTICACAO.md) documenta a configuração.

- Cada campanha tem um código de convite único e permanente. O jogador pode vincular uma ficha pessoal à campanha em que participa; o mestre cria NPCs no painel da mesa.
- O jogador edita seus dados civis. O mestre pode corrigir a ficha vinculada, configurar bônus de transformação e habilidades. Dados civis e bônus da forma são somados nas rolagens.
- Retratos e imagens de aparência das fichas, fotos de NPCs e arquivos do mural são guardados em armazenamento privado. O mural aceita textos, imagens, GIFs e vídeos nos formatos indicados na interface.
- O mestre organiza categorias, itens, notas e mídias; pode revisar publicações e mensagens. A Comunidade mostra o chat com nome e foto atuais dos participantes.
- Rolagens da campanha ficam no histórico. O mestre tem uma área de registros das ações da mesa. Os avisos de rolagem e confirmação desaparecem automaticamente.
- Fichas e mesas podem ser excluídas por seus respectivos donos. Excluir uma mesa remove seus dados vinculados.

O chat recebe mudanças em tempo real e faz uma atualização periódica de reserva enquanto a mesa está aberta. São exibidas as 200 mensagens mais recentes; o histórico completo do chat ainda não tem paginação. Os registros da mesa mostram até 200 ações recentes. A migração de banco é aditiva e preserva os dados existentes; não é preciso recriar contas nem repetir a configuração de Discord ou SMTP.

Sem a configuração local do Supabase, **Explorar demonstração** abre exemplos em memória. A demonstração não salva dados reais e desaparece ao recarregar.

## Banco e publicação

O projeto usa as migrações [de autenticação](supabase/migrations/202609170001_rpg_auth.sql), [da base de campanhas](supabase/migrations/202609240001_rpg_campaigns_sheets.sql) e [das melhorias V1](supabase/migrations/202609250001_rpg_v1_fixes.sql), nesta ordem. Cada arquivo novo é aplicado **uma vez**. Consulte [PUBLICAR.md](PUBLICAR.md) para o estado do projeto público e as verificações de implantação.

O site publicado fica em [GitHub Pages](https://zxcw339-cpu.github.io/Site-rpg-miraculous/) e funciona com o computador do criador desligado. O build é feito pelo GitHub Actions; não envie a pasta `dist` manualmente.

## Executar localmente

Requer Node.js 22.12+ (testado com Node 24):

```sh
npm ci
npm run dev
npm test
npm run build
```

Para testar contas reais localmente, crie `.env.local` a partir de `.env.example` com **somente** a URL e a chave publicável do Supabase. Nunca use uma chave administrativa em `VITE_*`.

O teste isolado de regras SQL usa PostgreSQL/WASM e não acessa o projeto remoto:

```sh
npm install --prefix .preview/backend-check --no-save --ignore-scripts @electric-sql/pglite
node tests/campaign-sql.integration.mjs .preview/backend-check/node_modules/@electric-sql/pglite/dist/index.js
```
