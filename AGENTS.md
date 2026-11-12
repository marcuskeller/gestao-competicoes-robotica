# Orientações para agentes

## Escopo do produto

- Este repositório implementa o **Desafio 02 — Gestão das Competições** do Hackathon ADS/UNISENAI, conforme `docs/PLANO-MVP-GESTAO-COMPETICOES.md`, o regulamento/briefing em `docs/Regulamento e Briefing - Hackathon Campeonato Joinvilense de Robótica.pdf` e os dados do campeonato em `docs/Campeonato Joinvilense de Robóticca 2026.pdf`.
- A orientação atual do produto amplia o frontend para quatro áreas: Administração, Voluntariado, Participantes/Escolas e Empresas apoiadoras. A Administração gerencia modalidades, editais, usuários, permissões e vagas voluntárias; escolas podem cadastrar equipes e integrantes; empresas podem enviar propostas de apoio.
- O escopo de implementação atual é somente o frontend Angular. Use dados fictícios; a store local e o `localStorage` servem à demonstração e não devem ser descritos como backend, autenticação real ou persistência compartilhada.
- Priorize uma jornada demonstrável e coerente: edição e inscrições → disputas → pontuação rastreável → classificação → homologação → publicação. Resultados só aparecem no portal público após publicação.
- Voluntários selecionam cargos com vagas configuradas pela Administração. Participantes criam uma conta como pessoa física ou escola; depois do login, criam equipes e alunos. Empresas criam uma conta; no protótipo, o checkout simulado oferece Pix, boleto e cartão sem coletar dados de cartão ou processar pagamento. Doações em bens/serviços seguem para análise.
- Não implemente pagamentos reais, integração com Stripe, gestão financeira completa, prestação de contas ou histórico institucional completo sem nova decisão de produto.

## Arquitetura simples (MVC adaptado ao Angular)

- **Model/domínio:** tipos e regras puras em `frontend/src/app/core/models.ts` e `domain.ts`.
- **Controller/aplicação:** ações, validações, permissões e estado de demonstração em `StoreService` e serviços do `core`.
- **View:** páginas, layout e componentes compartilhados em `pages/`, `layouts/` e `shared/`.
- Componentes de tela devem cuidar da apresentação e interação, delegando regras ao domínio/serviços. Não coloque regras de negócio em templates.
- Mantenha dependências apontando para dentro: domínio não importa Angular, páginas não acessam `localStorage` diretamente e componentes compartilhados não conhecem detalhes de páginas.
- Prefira a estrutura e bibliotecas já existentes. Só introduza camadas, abstrações ou dependências quando resolverem uma necessidade concreta do MVP.
- Todo ícone novo deve vir da biblioteca Lucide (`@lucide/angular`), usando o componente compartilhado `app-icon`. Não desenhe nem adicione ícones em SVG, imagens, caracteres Unicode ou outras bibliotecas; escolha o ícone Lucide equivalente.

## Padrões obrigatórios

- **UX/UI:** interface em português claro, consistente e orientada à tarefa; **todas as telas e fluxos devem se adaptar a celulares, tablets e desktops, incluindo telas largas**. Evite rolagem horizontal e mantenha controles confortáveis ao toque no mobile e layouts bem distribuídos no desktop. Priorize o fluxo principal e estados de carregamento, vazio, sucesso e erro. Dê feedback após ações e confirme operações destrutivas ou irreversíveis.
- **Acessibilidade:** HTML semântico, navegação por teclado, foco visível, rótulos associados aos campos, contraste adequado e mensagens de estado anunciáveis. Não dependa apenas de cor para comunicar status.
- **Clean Code:** nomes explícitos, funções pequenas com uma responsabilidade, tipos fortes, validação próxima da entrada e ausência de duplicação evitável. Remova código morto quando alterar a área.
- **Clean Architecture:** preserve a separação entre apresentação, aplicação e domínio; regras importantes devem ser testáveis sem renderizar componentes nem depender do navegador.
- **TDD:** para regra ou comportamento novo, escreva primeiro um teste que falha, implemente o mínimo para fazê-lo passar e refatore mantendo os testes verdes. Cubra especialmente pontuação, desempates, permissões, homologação/publicação e preservação de snapshots.
- **KISS e YAGNI:** resolva a necessidade presente com a solução mais simples. Não adicione funcionalidades, frameworks, padrões ou abstrações para necessidades hipotéticas.
- **SOLID:** aplique os princípios de forma proporcional; componentes e serviços devem ter responsabilidades claras, depender de contratos estáveis quando necessário e permitir extensão sem condicionais espalhadas. Não crie interfaces ou classes sem benefício concreto.
- **Privacidade e segurança:** somente dados fictícios ou anonimizados. Guards e permissões do frontend são demonstração; nunca os apresente como controle de segurança de servidor.
- Cadastro administrativo aberto é apenas uma conveniência local de demonstração. Em produção, a criação de administradores e a concessão de permissões exigem autenticação e autorização no servidor.
- Dados de estudantes, especialmente menores, não devem ser expostos no portal público. Colete apenas os dados necessários ao fluxo demonstrado.

## Convenções de implementação

- Preserve Angular standalone, TypeScript estrito, Signals, Angular Router, Tailwind/DaisyUI e Bun já adotados.
- Mantenha as regras de negócio fora de templates e componentes visuais genéricos.
- Atualize documentação quando mudar fluxo, limites da demonstração ou comandos de execução.
- Antes de adicionar um módulo/tela, confirme que ele apoia o Desafio 02 e a jornada fim a fim do MVP.
