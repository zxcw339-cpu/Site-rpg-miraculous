# Direção para a versão mobile

O usuário definiu que o celular terá um desenho próprio. A interface desktop atual, pensada para 1920 × 1080, continua como está até a etapa de mobile; não basta encolher o painel.

## Fluxos prioritários

1. **Entrada:** login e cadastro de uma coluna, com o mesmo Supabase, tema e conta do desktop.
2. **Início:** acesso direto às fichas e campanhas ativas.
3. **Ficha:** identidade e recursos primeiro; atributos e perícias com rolagem ao toque; inventário, habilidades, lore e aparência em seções. O resultado do dado deve sair sem cobrir os controles.
4. **Mesa:** comunidade e chat como caminho principal do jogador; mídia e categorias acessíveis sem menus profundos. O mestre recebe uma navegação própria para jogadores, NPCs, mídias, itens, dados e registros.
5. **Arquivos:** escolher foto ou vídeo da galeria, mostrar tamanho e progresso e permitir tentar novamente se o envio falhar.

## Regras compartilhadas

As duas interfaces usarão as mesmas fichas, permissões, convites permanentes, rolagens, histórico e armazenamento. O mestre poderá editar os dados da mesa também no celular. Mudanças de layout não devem criar um segundo modelo de dados nem duplicar as regras de acesso.

## Antes de implementar

Desenhar telas mobile específicas para login, hub, ficha, comunidade e painel do mestre; validar a ordem dos controles com o usuário. Depois, testar teclado virtual, toque, rolagem vertical, arquivos da câmera/galeria e conexões instáveis em aparelhos reais.
