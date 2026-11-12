# Arena Robótica — frontend MVP

Angular 22 com componentes standalone, Signals, Forms, Tailwind CSS 4 e DaisyUI.
Baseado nos módulos M1–M14 do plano mestre. A decisão de manter Angular aproveita
a implementação existente; as referências a React no desenho original são históricas.

## Executar o MVP

Requisitos: Node `22.22.3+` na linha 22, `24.15.0+` na linha 24 ou `26+`, e Bun 1.4.4.

```sh
bun install
bun start
```

Abra http://localhost:4200 e escolha um dos quatro perfis de demonstração.
O login seleciona uma conta fictícia, sem senha. Os dados ficam em `localStorage`;
não existe autenticação de servidor, banco compartilhado ou API nesta entrega.
Uma janela anônima inicia sua própria base de demonstração.

## Estrutura do MVP

```text
src/app/
  core/          modelos, seed, domínio, permissões, guards e store local
  layouts/       shell responsivo, menu e seletor de perfil
  pages/
    login.component.ts       entrada por perfil de demonstração
    overview.component.ts    indicadores e atalhos
    records.config.ts        definição dos módulos e colunas
    records.component.ts     consultas, filtros e ações de workflow
    record-form.component.ts formulários de cadastro dos módulos
    scoring.component.ts     pontuação por critério e penalidades
    public.component.ts      consulta dos snapshots publicados
  shared/        componentes visuais reutilizáveis
e2e/             testes no navegador
```

## Rotas do MVP

`/` redireciona ao painel ou ao login. `/publico` não exige login.
`/app/dashboard` é o painel. Os módulos ficam em `/app/edicoes`, `/app/modalidades`,
`/app/criterios`, `/app/desempates`, `/app/regras`, `/app/escolas`, `/app/equipes`,
`/app/participantes`, `/app/inscricoes`, `/app/etapas`, `/app/disputas`,
`/app/resultados`, `/app/classificacao`, `/app/publicacao`, `/app/auditoria`
e `/app/interop`. `/app/pontuar/:id` abre a súmula da disputa.

## Fluxo de demonstração

1. Entre como Administração para percorrer o fluxo completo, ou alterne os perfis no cabeçalho.
2. Consulte os dados iniciais: 69 equipes, 35 escolas, modalidades e disputas.
3. Para começar uma edição nova: cadastre-a e avance seu status para inscrições.
4. Cadastre modalidade, critérios, desempates, equipes e participantes antes de submeter inscrições.
5. Aprove as inscrições e crie uma etapa de grupos. Gere o chaveamento uma única vez.
6. Em Disputas, abra Pontuação e salve os valores das duas equipes. Administração ou Organização conclui a disputa.
7. Consulte a classificação, homologue a etapa e publique. Disputas pendentes impedem a homologação.
8. Abra o portal público para consultar o snapshot publicado ou exporte JSON em Interoperabilidade.
9. Para corrigir: em Publicação, escolha Retificar e informe a justificativa. Corrija os pontos, conclua as disputas e homologue/publique novamente. O snapshot anterior permanece público até a nova publicação e fica preservado no histórico.

O mesário lança pontos; o organizador conclui disputas; o homologador homologa,
publica e reabre etapas. Administração possui todas essas permissões.
Auditoria é restrita a Administração e Homologação. As permissões locais demonstram
o comportamento esperado; o backend deverá aplicar a autorização em cada endpoint.

## Verificação do MVP

```sh
bun run build
bun run test:e2e
```

Os testes usam Google Chrome instalado (`channel: chrome`) e iniciam o servidor na
porta 4200 quando necessário. Cobrem navegação, persistência, perfis, publicação,
retificação com preservação do snapshot, bloqueio de pendências, portal público,
menu móvel e cadastro de uma edição com duas equipes até gerar um confronto.

## Limites desta entrega

O MVP do frontend permite cadastros e o fluxo principal local. Ainda faltam edição
e exclusão completas dos cadastros, gestão avançada de grupos e agendamento,
chaves eliminatórias/finais, backend Laravel, PostgreSQL, Sanctum, auditoria real,
API pública e sincronização entre dispositivos/abas já abertas. IPs da auditoria
são simulados. A geração de chaveamento oferecida pela UI é somente por grupos.
