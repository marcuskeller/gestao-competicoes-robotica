# PLANO DE IMPLEMENTAÇÃO — MVP "Gestão das Competições"

**Projeto:** Hackathon ADS/UNISENAI — Desafio 02 do Campeonato Joinvilense de Robótica
**Documento:** plano mestre de implementação, regras de negócio, padrões, segurança, roadmap e custos
**Versão:** 1.0 · Novembro/2026
**Fonte de contexto:** `Regulamento e Briefing - Hackathon Campeonato Joinvilense de Robótica.pdf` (nesta pasta)

---

## 0. Como usar este documento

- **Seções 1–5:** entendimento do problema, escopo, stack e arquitetura.
- **Seção 6:** modelo de dados (implementar migrations a partir daqui).
- **Seção 7:** regras de negócio por módulo — **tabela** (o que é a regra) + **checklist** (o que já foi implementado). É o documento de acompanhamento diário.
- **Seções 8–10:** padrões de projeto, TDD e plano de segurança.
- **Seções 11–14:** backlog, roadmap AWS, custos.
- **Seção 15–17:** riscos, Definition of Done e declaração de IA.

### Legenda de status
| Símbolo | Significado |
|---|---|
| ⬜ | Não iniciado |
| 🟨 | Em andamento |
| ✅ | Concluído |
| ⛔ | Fora do MVP |

> **Regra de atualização:** toda vez que um item mudar de estado, atualize **as duas** visões do módulo (tabela de regra + checklist de implementação) e a Seção 8 (painel de progresso).

---

## 1. Contexto, problema e objetivo

### 1.1 Contexto institucional
O Campeonato Joinvilense de Robótica é iniciativa da Rede Municipal de Ensino de Joinville. Na 6ª edição (2026): **69 equipes, 35 escolas, +250 estudantes**. A condução das competições é predominantemente manual, com inscrições, regras, pontuações, classificações e resultados mantidos em planilhas e papéis.

### 1.2 Problema priorizado (nosso recorte)
> **A consolidação manual de pontuações e a ausência de trilha de auditoria fazem o resultado oficial divergir do resultado publicado.**

Sintomas concretos:
1. Pontuação lançada em papel e reconsolidada depois → erro de digitação vira classificação errada.
2. Ninguém sabe quem lançou, quem alterou e por quê → contestação sem resposta.
3. Regra muda entre edições e ninguém sabe qual regra valeu em cada disputa.
4. Resultado divulgado antes da conferência → retrabalho e desgaste público.

### 1.3 Objetivo do MVP
Um fluxo único, demonstrável e auditável que vá de **edição → inscrição → disputa → pontuação → classificação → homologação → publicação**, com autorização por perfil e trilha de auditoria de toda escrita.

### 1.4 Público-alvo e dores
| Ator | Perfil no sistema | Dor atual | O que o MVP entrega |
|---|---|---|---|
| Coordenação do campeonato | `organizador` | Planilhas paralelas, versões conflitantes | Configuração de edição/modalidade/critérios + painel único |
| Secretaria de Educação | `administrador`, `homologador` | Não consegue validar antes de divulgar | Workflow homologar → publicar com snapshot versionado |
| Mesário / juiz de pista | `mesario` | Lança em papel, sem conferência | Lançamento por critério direto na disputa, com rastreio |
| Escolas e famílias | público | Divulgação informal, retrabalho | Portal público só com resultado **publicado** |
| Secretaria (histórico) | integração | Retrabalho para montar histórico | Resultado publicável com identificador estável (UUID) |

### 1.5 Interoperabilidade com os outros desafios (exigida pelo briefing)
| Dado | Produzimos | Consumimos | Fonte de verdade | Regra de publicação |
|---|---|---|---|---|
| Identificação da edição | ✅ UUID `identificador_publico` | — | Desafio 02 | publicável |
| Escola | referência | Desafio 01 (cadastro institucional) | Desafio 01 | publicável |
| Equipe / Modalidade | ✅ | Desafio 01 (equipe) | Desafio 02 | publicável |
| Resultado oficial | ✅ | Desafio 03 (histórico) | Desafio 02 | **só após homologação + publicação** |
| Inscrição | ✅ | Desafio 01 (evento) | Desafio 02 | interno |

Não há integração funcional no MVP (não exigida). O contrato é: **UUID estável + endpoint público somente-leitura + snapshot imutável de resultado publicado**.

---

## 2. Escopo do MVP

### 2.1 Dentro do escopo
| # | Escopo | Justificativa no briefing |
|---|---|---|
| E1 | Cadastro de edições, modalidades e critérios de pontuação/desempate por edição | "regras, critérios e editais contextualizados por edição e modalidade" |
| E2 | Regras/editais versionados por edição e modalidade | "como registrar alterações de regras entre edições?" |
| E3 | Escolas, equipes e participantes (dados fictícios) | base de participação |
| E4 | Inscrição de equipe em modalidade com workflow de aprovação | "inscrições e participação de equipes em modalidades" |
| E5 | Etapas (grupos/eliminatória/final), grupos e disputas com chaveamento | "disputas e chaveamentos quando aplicáveis" |
| E6 | Lançamento de pontuação por critério + penalidades | "pontuações" |
| E7 | Classificação automática com critérios de desempate | "classificações" |
| E8 | Homologação e publicação versionada de resultado | "como evitar divergência entre oficial e publicado?" |
| E9 | Trilha de auditoria de toda escrita | "rastreabilidade da origem de registros e correções" |
| E10 | Portal público de resultados publicados | interop com Desafio 03 |
| E11 | Autorização por 4 perfis | "privacidade, controle de acesso, segurança" |
| E12 | README executável + arquitetura + modelo de dados + backlog | entregáveis mínimos |

### 2.2 Fora do escopo (explícito)
| # | Item | Por quê |
|---|---|---|
| N1 | Gestão do evento, inscrição de escolas, logística, alimentação | é o Desafio 01 |
| N2 | Portal histórico completo, linha do tempo, galeria, impacto educacional | é o Desafio 03 |
| N3 | App mobile nativo | SPA responsiva cobre a demo |
| N4 | Pagamento, autenticação social, SSO institucional | complexidade sem retorno na banca |
| N5 | Streaming/placar ao vivo em tempo real (WebSocket) | roadmap, não MVP |
| N6 | Integrações reais com sistemas da Prefeitura | proibido usar dados reais |
| N7 | BI/dashboards analíticos avançados | roadmap |
| N8 | Multi-tenant real (múltiplas redes) | roadmap Fase 3 |

### 2.3 Decisões críticas do MVP (não negociáveis)
1. **Um fluxo fim-a-fim funcionando** vale mais que 20 telas soltas (o briefing penaliza explicitamente "conjunto extenso de telas sem fluxo funcional consistente").
2. **Resultado público ≠ resultado oficial** resolvido por versionamento, não por convenção.
3. **Toda escrita é auditada** — sem auditoria o problema priorizado não é resolvido.
4. **Autorização testada por perfil** — 4 perfis, negado por padrão.
5. **Seeders com dados fictícios realistas** (69 equipes/35 escolas simuláveis) — a demo precisa parecer um campeonato de verdade.
6. **README que um terceiro executa em < 15 min** — é entregável avaliado.
7. **`pontos_finais` calculado no banco** (coluna gerada) — determinismo.
8. **Testes do fluxo principal** (TDD nas regras de classificação/desempate).

---

## 3. Resultado esperado

### 3.1 Demonstração do Demo Day (roteiro de 7 minutos)
1. Login como `organizador` → abre edição **2026 – 6ª edição** com 69 equipes semeadas.
2. Modalidade "Robô Seguidor – Nível 2" com 3 critérios de pontuação e 2 critérios de desempate.
3. Inscrições pendentes → aprova 2 equipes.
4. Etapa "Fase de Grupos" com 2 grupos e 6 disputas geradas.
5. Login como `mesario` → lança pontos por critério + penalidade em uma disputa.
6. Classificação atualiza na hora; empate resolvido pelo critério de desempate → mostra o desempate aplicado.
7. Login como `homologador` → homologa a etapa → publica (gera v1 + snapshot).
8. Abre aba anônima no portal público → vê **apenas** o resultado publicado.
9. `mesario` corrige a pontuação → sistema exige justificativa, gera **v2** e novo log de retificação.
10. Abre trilha de auditoria → mostra autor, IP, horário, valor anterior e novo.

### 3.2 Critérios de aceite do MVP
| # | Critério | Como verificar |
|---|---|---|
| A1 | Fluxo completo roda do zero em um comando de banco + dois comandos de app | README + execução cronometrada |
| A2 | Pontuação lançada recalcula classificação sem ação manual | teste de feature |
| A3 | Desempate aplicado na ordem configurada | teste unitário do service |
| A4 | Resultado não publicado não aparece em nenhum endpoint público | teste de integração |
| A5 | Retificação gera nova versão e log | teste de integração |
| A6 | Perfil sem permissão recebe 403 em todos os endpoints protegidos | teste por perfil |
| A7 | Nenhuma query SQL concatenada | revisão + regra automatizada |
| A8 | Build do front e suíte do back passam em CI local | comandos documentados |

### 3.3 Mapeamento com a rubrica da banca (0–100)
| Critério | Peso | Como o MVP pontua |
|---|---|---|
| Compreensão do problema | 20% | Seção 1.2 + regras de negócio rastreáveis ao briefing |
| Impacto | 20% | Elimina retrabalho de consolidação e contestação sem prova |
| Viabilidade técnica | 15% | Stack padrão de mercado, infra local em Docker, roadmap AWS |
| Qualidade e coerência | 15% | Clean Architecture, TDD, contratos de API documentados |
| UX e acessibilidade | 10% | Fluxo por perfil, WCAG AA, teclado, contraste |
| Engenharia, documentação e interoperabilidade | 10% | README, auditoria, UUID público, snapshot |
| Pitch e demonstração | 10% | Roteiro da Seção 3.1 |

---

## 4. Tecnologias

| Camada | Tecnologia | Versão alvo | Justificativa |
|---|---|---|---|
| Banco | PostgreSQL | 18 (`postgres:18-alpine`) | requisito do desafio; `jsonb` p/ snapshot e auditoria; coluna gerada p/ `pontos_finais`; window functions p/ classificação |
| Runtime back | PHP | 8.5 | requisito (PHP) |
| Framework back | Laravel | última estável | migrations, Eloquent, Policies, Sanctum, Form Requests, queues |
| Auth | Laravel Sanctum | — | token Bearer para SPA, sem cookie cross-site |
| Frontend | React | 19 | menor cerimônia que Angular no prazo; ecossistema maduro |
| Linguagem front | TypeScript | 5.x | tipagem forte, refactor seguro |
| Package manager / runner (front) | **Bun** | 1.2+ | `bun install` 10–30× mais rápido que npm, lockfile binário, `bun run`/`bun test` nativos |
| Build front | Vite | última | HMR rápido, build simples, roda sob Bun |
| Estilo | Tailwind CSS | v4 | design consistente sem CSS morto |
| Roteamento | React Router | v7 | rotas aninhadas + guards |
| Dados no front | TanStack Query | v5 | cache, retry, invalidação, estados de loading/erro |
| Formulários | React Hook Form + Zod | — | validação tipada espelhando o back |
| HTTP client | Axios | — | interceptors de token e 401 |
| Testes back | Pest / PHPUnit | — | TDD das regras |
| Testes front | Vitest + Testing Library | — | componentes e hooks |
| E2E | Playwright | — | fluxo principal do Demo Day |
| Qualidade | PHPStan/Larastan, ESLint, Prettier | — | análise estática bloqueante |
| Infra local | Docker Compose | — | Postgres em container; app nativo |
| CI | GitHub Actions | — | lint + testes + build em PR |

### 4.1 Por que React e não Angular
| Critério | React + TS | Angular |
|---|---|---|
| Setup até a primeira tela | ~1 h | ~4–6 h (módulos, DI, RxJS) |
| Curva para 6 dias de hackathon | baixa | média/alta |
| Tabelas/formulários (nosso caso) | direto | mais boilerplate |
| Tipagem | forte | forte |
| Risco de prazo | baixo | médio |

> Angular é defensável em projeto institucional de longo prazo (é até preferível para a Prefeitura). **Decisão registrada:** React no MVP por prazo; a API REST desacoplada permite trocar o front depois sem tocar no domínio. Ver Seção 14.4 (roadmap de migração).

### 4.2 Bun — o que muda e o que não muda

**Decisão:** Bun como **package manager e runner** do frontend. Vite continua sendo o bundler.

| Camada | Antes (npm) | Depois (Bun) | Impacto |
|---|---|---|---|
| Instalação de dependências (front) | `npm install` | `bun install` | 10–30× mais rápido; `bun.lock` binário versionado |
| Scripts (dev/build/test) | `npm run x` | `bun run x` | mesmo comportamento, execução mais rápida |
| Testes de componente | `npx vitest` | `bun run test` (Vitest sob Bun) | funciona; Vitest roda no runtime do Bun via script |
| E2E | `npx playwright` | executar com Node (`npx playwright`) | **exceção**: Playwright não é suportado oficialmente sob Bun; manter Node só para E2E |
| Dockerfile do front | `node:22-alpine` | `oven/bun:1-alpine` | imagem menor, instalação mais rápida no CI |

**O que Bun NÃO faz neste projeto**
| Item | Por quê |
|---|---|
| Backend Laravel (build/execução) | Laravel é PHP. Bun é runtime JavaScript/TypeScript — **impossível** substituir PHP/Composer. O backend segue PHP 8.5 + Composer + PHP-FPM/Artisan. |
| Substituir Vite como bundler (`bun build`) | o ecossistema de plugins do Vite (React Fast Refresh + `@tailwindcss/vite` + proxy de API) é maduro e documentado; `bun build` não cobre esse conjunto com a mesma estabilidade. Ganho não compensa risco no prazo. |
| Servir a API em produção | a API é Laravel; Bun não executa PHP. |

**Regras práticas**
1. Todo comando do front no README usa `bun` (`bun install`, `bun run dev`, `bun run build`, `bun run test`).
2. `bun.lock` é commitado; `package-lock.json` e `yarn.lock` ficam proibidos (lockfile único).
3. CI usa `oven-sh/setup-bun` com cache de dependências; E2E usa `actions/setup-node` apenas para Playwright.
4. Não introduzir `bun:sqlite`, `Bun.serve` nem APIs exclusivas do runtime no código do front — o front deve continuar executável sob Node, para não criar dependência de runtime na demo.
5. `engines`/`packageManager` no `package.json` declara `bun@1.x` para reprodutibilidade.

---

## 5. Arquitetura

### 5.1 Estilo arquitetural
**API REST + SPA**, organizada em **Clean Architecture pragmática** (adaptada a Laravel, sem over-engineering):

```
┌───────────────────────────────────────────────────────────────┐
│ PRESENTATION                                                  │
│  React SPA (features/)  │  Laravel Controllers + Resources     │
│  Router, Query, UI      │  Form Requests, Policies             │
├───────────────────────────────────────────────────────────────┤
│ APPLICATION (Casos de uso / Services)                         │
│  CriarEdicao, SubmeterInscricao, GerarChaveamento,            │
│  LancarResultado, CalcularClassificacao, HomologarEtapa,      │
│  PublicarResultado, RetificarPublicacao                       │
├───────────────────────────────────────────────────────────────┤
│ DOMAIN (regras puras — sem framework)                         │
│  Models Eloquent, Enums, Value Objects (Pontuacao),           │
│  Estrategias de Desempate, Invariantes, Exceptions de domínio │
├───────────────────────────────────────────────────────────────┤
│ INFRASTRUCTURE                                                │
│  Repositórios, Observers de auditoria, PostgreSQL,            │
│  Mail/Queue (futuro), Filesystem                              │
└───────────────────────────────────────────────────────────────┘
```

Regra de dependência: **de fora para dentro**. Domínio não conhece HTTP, Eloquent é aceito como mecanismo de persistência, mas **regra de negócio nunca mora em Controller**.

### 5.2 Estrutura de pastas

```
hackaton/
├─ docker-compose.yml                 # postgres:18-alpine, volume, healthcheck
├─ README.md
├─ docs/
│  ├─ arquitetura.md
│  ├─ modelo-de-dados.md
│  ├─ api.md
│  ├─ seguranca.md
│  └─ contexto/*.pdf
├─ backend/                            # Laravel
│  ├─ app/
│  │  ├─ Models/*.php
│  │  ├─ Enums/{Perfil,StatusEdicao,StatusInscricao,StatusDisputa,StatusEtapa,StatusPublicacao,AcaoAuditoria}.php
│  │  ├─ Domain/Competicoes/{Pontuacao,Desempate,Exceptions}/
│  │  ├─ Services/{Cadastro,Competicao,Resultado,Auditoria}/
│  │  ├─ Http/Controllers/Api/V1/{Auth,Cadastros,Competicoes,Resultados,Publico}/
│  │  ├─ Http/{Requests,Resources,Policies,Middleware}/ 
│  │  ├─ Observers/AuditoriaObserver.php
│  │  └─ Providers/
│  ├─ database/{migrations,factories,seeders}/
│  ├─ routes/{api.php,v1/*.php}
│  └─ tests/{Unit,Feature}/
└─ frontend/                           # React + TS + Vite
   ├─ src/
   │  ├─ lib/{api.ts,queryClient.ts,auth.tsx,format.ts}
   │  ├─ types/dominio.ts
   │  ├─ components/ui/*
   │  ├─ layouts/{AppShell,AuthLayout}.tsx
   │  ├─ router.tsx
   │  └─ features/{auth,dashboard,edicoes,modalidades,criterios,regras,
   │              escolas,equipes,inscricoes,etapas,disputas,resultados,
   │              classificacao,publicacao,auditoria,publico}/
   └─ e2e/
```

### 5.3 Ambientes
| Ambiente | Banco | App | Uso |
|---|---|---|---|
| Local dev | Docker Compose Postgres 18 (`localhost:5433`) | `php artisan serve` :8000 + `vite` :5173 | desenvolvimento e demo |
| CI | Postgres service container | — | pipelines de teste |
| Piloto (AWS) | RDS PostgreSQL | ECS Fargate | pós-hackathon (Seção 13) |

---

## 6. Modelo de dados

Convenções: nomes em `snake_case` português; `id` bigint autoincrement interno; `identificador_publico` UUID para entidades interoperáveis; `timestamps` em todas; FKs com `constrained()`; valores monetários/pontos em `numeric(8,2)`.

### 6.1 Tabelas

| # | Tabela | Colunas principais | Constraints / Índices |
|---|---|---|---|
| 1 | `users` | id, nome, email, password, perfil, ativo | unique(email); perfil ∈ {administrador, organizador, mesario, homologador} |
| 2 | `escolas` | id, identificador_publico, nome, rede, municipio, uf, ativo, deleted_at | unique(identificador_publico); rede ∈ {municipal, estadual, federal, privada} |
| 3 | `campeonato_edicoes` | id, identificador_publico, ano, numero, nome, tema, data_inicio, data_fim, local, status | unique(ano), unique(identificador_publico); status ∈ {planejada, inscricoes, em_andamento, encerrada, cancelada} |
| 4 | `modalidades` | id, identificador_publico, edicao_id, nome, slug, descricao, tipo, min_integrantes, max_integrantes, ativo, ordem | unique(edicao_id, slug); FK edicao cascade; tipo ∈ {individual, dupla, equipe} |
| 5 | `regras` | id, edicao_id, modalidade_id, versao, titulo, conteudo, status, publicada_em, publicada_por, substitui_regra_id | index(edicao_id, modalidade_id, versao); status ∈ {rascunho, publicada, revogada} |
| 6 | `equipes` | id, identificador_publico, edicao_id, escola_id, nome, status, observacoes | unique(identificador_publico); FK escola restrict; status ∈ {inscrita, confirmada, desclassificada, desistente} |
| 7 | `participantes` | id, equipe_id, nome, papel, serie, data_nascimento | FK equipe cascade; papel ∈ {capitao, integrante, tecnico} |
| 8 | `inscricoes` | id, identificador_publico, edicao_id, equipe_id, modalidade_id, status, submetida_em, avaliada_em, avaliada_por, motivo_rejeicao | unique(edicao_id, equipe_id, modalidade_id); status ∈ {submetida, em_analise, aprovada, rejeitada, cancelada} |
| 9 | `etapas` | id, edicao_id, modalidade_id, nome, tipo, ordem, data_inicio, data_fim, status | FK edicao/modalidade cascade; status ∈ {planejada, em_andamento, concluida, homologada, publicada, cancelada} |
| 10 | `grupos` | id, etapa_id, nome, ordem | unique(etapa_id, nome); FK etapa cascade |
| 11 | `equipe_grupo` | grupo_id, equipe_id | PK composta; FKs cascade |
| 12 | `disputas` | id, etapa_id, grupo_id, codigo, rodada, ordem, arena, data_hora, status, equipe_a_id, equipe_b_id, vencedor_equipe_id, disputa_origem_a_id, disputa_origem_b_id | unique(etapa_id, codigo); status ∈ {agendada, em_andamento, concluida, cancelada, wo} |
| 13 | `criterios_pontuacao` | id, modalidade_id, nome, descricao, peso, ordem, ativo | FK modalidade cascade; peso numeric(5,2) |
| 14 | `criterios_desempate` | id, modalidade_id, nome, campo, direcao, ordem | campo ∈ {pontos_finais, penalidades, vitorias, saldo, tempo}; direcao ∈ {asc, desc} |
| 15 | `resultados_disputa` | id, disputa_id, equipe_id, pontos, penalidades, pontos_finais, posicao, observacao, registrado_por, registrado_em | unique(disputa_id, equipe_id); `pontos_finais` **GENERATED ALWAYS AS (pontos - penalidades) STORED** |
| 16 | `pontuacoes_criterio` | id, resultado_disputa_id, criterio_pontuacao_id, valor, observacao | unique(resultado_disputa_id, criterio_pontuacao_id) |
| 17 | `publicacoes_resultado` | id, edicao_id, etapa_id, modalidade_id, versao, status, snapshot, homologado_por, homologado_em, publicado_em, motivo_retificacao | unique(etapa_id, versao); snapshot `jsonb`; status ∈ {pendente, homologada, publicada, retificada} |
| 18 | `logs_auditoria` | id, tabela, registro_id, acao, campo, valor_anterior, valor_novo, user_id, ip, origem, created_at | índices (tabela, registro_id), (acao), (created_at); sem updated_at |

### 6.2 Relacionamentos (texto)
```
escolas 1─N equipes 1─N participantes
campeonato_edicoes 1─N modalidades 1─N criterios_pontuacao
campeonato_edicoes 1─N modalidades 1─N criterios_desempate
campeonato_edicoes 1─N regras (N─1 modalidades opcional)
campeonato_edicoes 1─N equipes
equipes N─N modalidades  (via inscricoes)
campeonato_edicoes 1─N etapas 1─N grupos N─N equipes (via equipe_grupo)
etapas 1─N disputas N─1 grupos (opcional)
disputas 1─N resultados_disputa N─1 equipes
resultados_disputa 1─N pontuacoes_criterio N─1 criterios_pontuacao
etapas 1─N publicacoes_resultado (versões)
* → logs_auditoria (polimórfico por tabela+registro_id)
```

### 6.3 Decisões de modelagem
| Decisão | Motivo |
|---|---|
| `pontos_finais` como coluna gerada | impede divergência entre app e banco; RN10 |
| `snapshot jsonb` na publicação | imutabilidade histórica mesmo se a fonte for corrigida |
| `versao` em `publicacoes_resultado` + unique(etapa_id, versao) | retificação vira nova versão, nunca sobrescrita |
| `identificador_publico` UUID | interoperabilidade estável com Desafios 01/03 sem expor IDs sequenciais |
| `logs_auditoria` desnormalizado (sem FK para tabela) | genérico e barato; `registro_id` + `tabela` |
| Modalidade pertence à edição | regras variam por edição (briefing) |
| Sem soft delete em `logs_auditoria` | trilha é imutável |

---

## 7. Módulos: regras de negócio + checklist de implementação

### M1 — Edições do campeonato

| ID | Regra de negócio | Critério de aceite | Status |
|---|---|---|---|
| RN-1.1 | Toda edição tem `ano` único e `numero` de edição | criar 2026 duas vezes → 422 | ⬜ |
| RN-1.2 | Edição nasce com status `planejada` e só avança na ordem planejada → inscricoes → em_andamento → encerrada | transição inválida → 422 | ⬜ |
| RN-1.3 | Só `administrador` cria/edita/exclui edição; `organizador` lê e atualiza status | teste por perfil | ⬜ |
| RN-1.4 | Edição recebe `identificador_publico` UUID imutável, não sequencial | endpoint público por UUID | ⬜ |
| RN-1.5 | `data_fim` ≥ `data_inicio` | validação 422 | ⬜ |
| RN-1.6 | Excluir edição com modalidade/equipe vinculada é bloqueado | 409/422 com mensagem | ⬜ |
| RN-1.7 | Toda criação/alteração/exclusão gera log de auditoria | 1 log por operação | ⬜ |

**Checklist M1**
- [ ] ⬜ Migration `campeonato_edicoes`
- [ ] ⬜ Model `CampeonatoEdicao` + enum `StatusEdicao` + cast
- [ ] ⬜ `StoreEdicaoRequest` / `UpdateEdicaoRequest` (validação RN-1.1, RN-1.5)
- [ ] ⬜ `EdicaoController` (index, store, show, update, destroy) + `EdicaoResource`
- [ ] ⬜ `EdicaoPolicy` (RN-1.3)
- [ ] ⬜ Regra de transição de status (RN-1.2)
- [ ] ⬜ Log de auditoria via Observer (RN-1.7)
- [ ] ⬜ Testes: feature CRUD, transição inválida, autorização
- [ ] ⬜ UI: listagem, formulário, badge de status, seletor de edição ativa

---

### M2 — Modalidades e critérios (pontuação e desempate)

| ID | Regra de negócio | Critério de aceite | Status |
|---|---|---|---|
| RN-2.1 | Modalidade pertence a exatamente uma edição | FK NOT NULL | ⬜ |
| RN-2.2 | `slug` único dentro da edição | criar duplicado → 422 | ⬜ |
| RN-2.3 | `min_integrantes ≤ max_integrantes` e ambos ≥ 1 | validação | ⬜ |
| RN-2.4 | Critério de pontuação pertence a uma modalidade; `peso > 0` | validação | ⬜ |
| RN-2.5 | Critérios de desempate têm `ordem` única por modalidade e direção asc/desc | unique(modalidade_id, ordem) | ⬜ |
| RN-2.6 | Classificação aplica desempates **na ordem configurada**, até resolver | teste com empate triplo | ⬜ |
| RN-2.7 | Empate persistente após todos os critérios = posições empatadas (mesma `posicao`) | teste | ⬜ |
| RN-2.8 | Modalidade só pode ser excluída se não houver inscrição/aprovada em disputa | 409 | ⬜ |

**Checklist M2**
- [ ] ⬜ Migrations `modalidades`, `criterios_pontuacao`, `criterios_desempate`
- [ ] ⬜ Models + relations (`modalidade->criteriosPontuacao`, `->criteriosDesempate`)
- [ ] ⬜ Requests com validações RN-2.2, RN-2.3, RN-2.4, RN-2.5
- [ ] ⬜ Controllers CRUD aninhados (`/edicoes/{edicao}/modalidades`, `/modalidades/{m}/criterios-*`)
- [ ] ⬜ `PoliticaDesempate` como Strategy (uma classe por `campo`)
- [ ] ⬜ UI: modalidades por edição; editor de critérios com reordenação
- [ ] ⬜ Testes unitários do comparator de desempate (TDD)

---

### M3 — Regras e editais versionados

| ID | Regra de negócio | Critério de aceite | Status |
|---|---|---|---|
| RN-3.1 | Regra tem `versao` incremental por (edição, modalidade); nunca reutiliza número | unique composto | ⬜ |
| RN-3.2 | Regra nasce `rascunho`; só `publicada` é vigente | status default rascunho | ⬜ |
| RN-3.3 | Publicar nova versão marca a anterior como `revogada` e preenche `substitui_regra_id` | teste transacional | ⬜ |
| RN-3.4 | Regra publicada é **imutável** — correção = nova versão | tentativa de update → 422 | ⬜ |
| RN-3.5 | Regra sem `modalidade_id` vale para toda a edição | filtro de vigência | ⬜ |
| RN-3.6 | Consulta "qual regra valeu?" retorna a vigente na data | endpoint com `?data=` | ⬜ |
| RN-3.7 | Publicação registra autor e data e gera log `publicacao` | 1 log | ⬜ |

**Checklist M3**
- [ ] ⬜ Migration `regras`
- [ ] ⬜ Model + relation `substituiRegra`/`revogadaPor`
- [ ] ⬜ `RegraService::publicar()` transacional (RN-3.3)
- [ ] ⬜ Bloqueio de edição de regra publicada (RN-3.4)
- [ ] ⬜ Endpoint de vigência por data (RN-3.6)
- [ ] ⬜ UI: lista de versões, comparação, botão publicar
- [ ] ⬜ Testes: versionamento, revogação, imutabilidade

---

### M4 — Escolas, equipes e participantes

| ID | Regra de negócio | Critério de aceite | Status |
|---|---|---|---|
| RN-4.1 | Escola existe uma vez; `rede` e `uf` obrigatórios | validação | ⬜ |
| RN-4.2 | Equipe pertence a uma edição e a uma escola da mesma rede de ensino | FK + validação | ⬜ |
| RN-4.3 | Equipe tem 1 `capitao` no máximo, e no mínimo 1 participante | validação | ⬜ |
| RN-4.4 | Equipe é bloqueada (409) de exclusão se tiver inscrição aprovada | teste | ⬜ |
| RN-4.5 | Dados são fictícios/anonimizados; sem campo de documento/CPF | revisão de schema | ⬜ |
| RN-4.6 | Escola e equipe expõem `identificador_publico` | endpoint público | ⬜ |
| RN-4.7 | Só `administrador`/`organizador` escrevem; demais só leem | Policy | ⬜ |

**Checklist M4**
- [ ] ⬜ Migrations `escolas`, `equipes`, `participantes`
- [ ] ⬜ Models + factories com nomes fictícios brasileiros
- [ ] ⬜ Requests (RN-4.2, RN-4.3)
- [ ] ⬜ Controllers CRUD + Resources
- [ ] ⬜ Policies
- [ ] ⬜ Seeder: 35 escolas, 69 equipes, ~250 participantes fictícios
- [ ] ⬜ UI: escolas, equipes por edição, gestão de participantes

---

### M5 — Inscrições

| ID | Regra de negócio | Critério de aceite | Status |
|---|---|---|---|
| RN-5.1 | Uma equipe só pode ter uma inscrição por modalidade | unique(edicao, equipe, modalidade) | ⬜ |
| RN-5.2 | Inscrição nasce `submetida` com `identificador_publico` como protocolo | 201 com protocolo | ⬜ |
| RN-5.3 | Fluxo: submetida → em_analise → aprovada/rejeitada; rejeitada exige `motivo_rejeicao` | 422 sem motivo | ⬜ |
| RN-5.4 | Só `organizador`/`administrador` avalia inscrição | Policy/teste | ⬜ |
| RN-5.5 | Aprovação registra `avaliada_por` e `avaliada_em` | teste | ⬜ |
| RN-5.6 | Equipe desclassificada/desistente não pode ser aprovada | 422 | ⬜ |
| RN-5.7 | Inscrição só é alocável em grupo/disputa se `aprovada` | 422 ao alocar | ⬜ |
| RN-5.8 | Cancelamento após aprovada gera log `alteracao` com motivo | teste | ⬜ |

**Checklist M5**
- [ ] ⬜ Migration `inscricoes`
- [ ] ⬜ Máquina de estados de status (enum + transições permitidas)
- [ ] ⬜ `InscricaoController` (index por edição, store, show, patch status)
- [ ] ⬜ `AvaliarInscricaoRequest` com validação condicional de motivo
- [ ] ⬜ Policy + testes de autorização
- [ ] ⬜ UI: lista com filtro por status, aprovar/rejeitar com modal de motivo

---

### M6 — Etapas, grupos e chaveamento

| ID | Regra de negócio | Critério de aceite | Status |
|---|---|---|---|
| RN-6.1 | Etapa pertence a uma edição e a uma modalidade | FK | ⬜ |
| RN-6.2 | `tipo` ∈ {grupos, eliminatoria, avaliacao_tecnica, final} | enum | ⬜ |
| RN-6.3 | Grupo pertence a uma etapa; nome único na etapa | unique | ⬜ |
| RN-6.4 | Só equipe com inscrição `aprovada` entra em grupo | 422 | ⬜ |
| RN-6.5 | Chaveamento eliminatório exige nº de equipes potência de 2 ou aplica "bye" automático | teste com 6 equipes → 2 byes | ⬜ |
| RN-6.6 | Geração de chaveamento cria disputas com `disputa_origem_a/b` encadeados | grafo fechado | ⬜ |
| RN-6.7 | Geração é idempotente: reexecutar sem disputas concluídas recria; com concluídas → 409 | teste | ⬜ |
| RN-6.8 | Avanço de vencedor para a próxima fase é automático ao concluir disputa | teste | ⬜ |

**Checklist M6**
- [ ] ⬜ Migrations `etapas`, `grupos`, `equipe_grupo`, `disputas`
- [ ] ⬜ `ChaveamentoService` (potência de 2, byes, encadeamento)
- [ ] ⬜ Controllers de etapas/grupos/disputas
- [ ] ⬜ Endpoint `POST /etapas/{id}/gerar-chaveamento`
- [ ] ⬜ Teste unitário do chaveamento (cenários 4, 6, 8, 16 equipes)
- [ ] ⬜ UI: etapas por modalidade, quadro de chaveamento, alocação em grupos

---

### M7 — Disputas e agendamento

| ID | Regra de negócio | Critério de aceite | Status |
|---|---|---|---|
| RN-7.1 | `codigo` de disputa único dentro da etapa | unique | ⬜ |
| RN-7.2 | `equipe_a ≠ equipe_b` | validação | ⬜ |
| RN-7.3 | Status ∈ {agendada, em_andamento, concluida, cancelada, wo} com transições válidas | máquina de estados | ⬜ |
| RN-7.4 | Disputa `concluida` exige resultado para as duas equipes | 422 | ⬜ |
| RN-7.5 | `wo` exige `vencedor_equipe_id` definido | validação | ⬜ |
| RN-7.6 | Disputa de etapa homologada/publicada não pode ser editada | 409 | ⬜ |
| RN-7.7 | Conclusão de disputa elimina o perdedor da etapa | efeito no bracket | ⬜ |

**Checklist M7**
- [ ] ⬜ Máquina de estados de `disputas`
- [ ] ⬜ `DisputaController` (CRUD + mudança de status)
- [ ] ⬜ Regras de conclusão e WO
- [ ] ⬜ UI: agenda de pistas, filtros por etapa/status, ação de iniciar/concluir

---

### M8 — Lançamento de resultados

| ID | Regra de negócio | Critério de aceite | Status |
|---|---|---|---|
| RN-8.1 | Só `mesario`/`administrador` lançam resultado | 403 para organizador/homologador | ⬜ |
| RN-8.2 | Lançamento é upsert por (disputa, equipe) e é transacional | rollback em erro | ⬜ |
| RN-8.3 | `pontos` e `penalidades` ≥ 0, 2 casas decimais | validação | ⬜ |
| RN-8.4 | `pontos_finais` nunca enviado pelo cliente — calculado pelo banco | campo ignorado/rejeitado | ⬜ |
| RN-8.5 | Pontuação por critério exige `criterio_pontuacao_id` da modalidade da etapa | 422 se critério de outra modalidade | ⬜ |
| RN-8.6 | Resultado registra `registrado_por` e `registrado_em` | preenchidos sempre | ⬜ |
| RN-8.7 | Alterar resultado de etapa não publicada é livre (com log) | log `alteracao` | ⬜ |
| RN-8.8 | Alterar resultado de etapa publicada exige retificação com motivo | 422 sem motivo | ⬜ |
| RN-8.9 | Concluir disputa sem resultado completo é bloqueado | 422 | ⬜ |

**Checklist M8**
- [ ] ⬜ Migration `resultados_disputa` com coluna gerada
- [ ] ⬜ Migration `pontuacoes_criterio`
- [ ] ⬜ `LancarResultadoRequest` (validação aninhada)
- [ ] ⬜ `ResultadoService::lancar()` transacional + upsert
- [ ] ⬜ `ResultadoController@update`
- [ ] ⬜ Policy `lancarResultado`
- [ ] ⬜ UI: formulário por equipe com campos por critério, penalidade, total em tempo real (leitura do retorno)
- [ ] ⬜ Testes: upsert, transação, autorização, critério de outra modalidade

---

### M9 — Classificação e desempate

| ID | Regra de negócio | Critério de aceite | Status |
|---|---|---|---|
| RN-9.1 | Classificação soma `pontos_finais` apenas de disputas `concluida` | teste | ⬜ |
| RN-9.2 | Desempate aplicado na ordem de `criterios_desempate`, respeitando direção | teste unitário | ⬜ |
| RN-9.3 | Sem critérios configurados, ordena por pontos desc e nome asc (determinístico) | teste | ⬜ |
| RN-9.4 | Empate total persiste empatado (mesma posição; próxima posição pula) | teste (1,1,3) | ⬜ |
| RN-9.5 | Classificação é calculada por consulta (não tabela física) | sem tabela `classificacoes` | ⬜ |
| RN-9.6 | Cálculo usa `numeric`, nunca float | revisão de código | ⬜ |
| RN-9.7 | Endpoint existe por modalidade e por etapa | 2 rotas | ⬜ |
| RN-9.8 | Classificação de etapa não publicada só visível a perfis internos | 403 no público | ⬜ |

**Checklist M9**
- [ ] ⬜ `ClassificacaoService` com SQL agregado (window function `ROW_NUMBER`/`DENSE_RANK`)
- [ ] ⬜ `PoliticaDesempate` (Strategy por `campo`)
- [ ] ⬜ Testes unitários com datasets de empate (TDD, primeiro)
- [ ] ⬜ `ClassificacaoController` (modalidade e etapa)
- [ ] ⬜ UI: tabela de classificação com colunas de desempate e destaque de empate

---

### M10 — Homologação e publicação de resultado

| ID | Regra de negócio | Critério de aceite | Status |
|---|---|---|---|
| RN-10.1 | Só `homologador`/`administrador` homologam e publicam | Policy/teste | ⬜ |
| RN-10.2 | Homologar exige todas as disputas da etapa `concluida` | 422 listando pendentes | ⬜ |
| RN-10.3 | Publicar gera `publicacoes_resultado` com `snapshot` jsonb imutável | snapshot igual ao cálculo no momento | ⬜ |
| RN-10.4 | `versao` incrementa a cada nova publicação/retificação da etapa | v1, v2, v3 | ⬜ |
| RN-10.5 | Publicar exige homologação prévia | 422 | ⬜ |
| RN-10.6 | Retificar exige `motivo_retificacao` e nova versão; anterior vira `retificada` | teste | ⬜ |
| RN-10.7 | Snapshot publicado nunca é alterado (append-only) | update bloqueado | ⬜ |
| RN-10.8 | Etapa publicada atualiza `etapas.status` para `publicada` | teste | ⬜ |
| RN-10.9 | Cada homologação/publicação/retificação gera log próprio | 3 tipos de log | ⬜ |

**Checklist M10**
- [ ] ⬜ Migration `publicacoes_resultado`
- [ ] ⬜ `HomologacaoService` (validar pendências → homologar)
- [ ] ⬜ `PublicacaoService` (snapshot + versionamento)
- [ ] ⬜ `RetificacaoService`
- [ ] ⬜ Controllers `POST /etapas/{e}/homologar`, `/publicar`, `POST /publicacoes/{p}/retificar`
- [ ] ⬜ Policies
- [ ] ⬜ UI: painel de pendências, botão homologar/publicar, histórico de versões, modal de retificação
- [ ] ⬜ Testes: pré-condições, versionamento, imutabilidade

---

### M11 — Trilha de auditoria

| ID | Regra de negócio | Critério de aceite | Status |
|---|---|---|---|
| RN-11.1 | Toda escrita em tabela de domínio gera log (created/updated/deleted) | 1 log por operação | ⬜ |
| RN-11.2 | Log registra apenas campos alterados, com valor anterior e novo | diff correto | ⬜ |
| RN-11.3 | Log registra `user_id`, `ip`, `origem` e timestamp do servidor | preenchidos | ⬜ |
| RN-11.4 | Log é imutável — sem update/delete pela aplicação | nenhum endpoint de escrita | ⬜ |
| RN-11.5 | Login e logout geram log `login` | teste | ⬜ |
| RN-11.6 | Consulta com filtros (tabela, registro, ação, usuário, período) paginada | endpoint paginado | ⬜ |
| RN-11.7 | Consulta de auditoria restrita a `administrador`/`homologador` | 403 para mesario | ⬜ |
| RN-11.8 | Senhas e tokens nunca aparecem em log | revisão + teste | ⬜ |

**Checklist M11**
- [ ] ⬜ Migration `logs_auditoria`
- [ ] ⬜ `AuditoriaObserver` registrado nos 17 models de domínio
- [ ] ⬜ `AuditoriaService` (diff de campos, exclusão de campos sensíveis)
- [ ] ⬜ Middleware de contexto (ip, user, origem)
- [ ] ⬜ `AuditoriaController@index` com filtros + Resource
- [ ] ⬜ UI: tabela de auditoria com filtros, expansão de diff

---

### M12 — Portal público de resultados

| ID | Regra de negócio | Critério de aceite | Status |
|---|---|---|---|
| RN-12.1 | Endpoints públicos não exigem autenticação | 200 sem token | ⬜ |
| RN-12.2 | Só expõe conteúdo de `publicacoes_resultado.status = publicada` | teste de vazamento | ⬜ |
| RN-12.3 | Expõe apenas campos públicos (sem e-mail, sem dados de participante) | revisão de Resource | ⬜ |
| RN-12.4 | Consulta por `identificador_publico` (nunca ID sequencial) | 404 para ID numérico | ⬜ |
| RN-12.5 | Erro 404 não revela existência de recurso não publicado | mensagem genérica | ⬜ |
| RN-12.6 | Resposta inclui versão e data de publicação | campos presentes | ⬜ |
| RN-12.7 | Rate limit por IP nos endpoints públicos | 429 ao exceder | ⬜ |
| RN-12.8 | Página pública acessível (WCAG AA) e sem login | axe sem erros críticos | ⬜ |

**Checklist M12**
- [ ] ⬜ `PublicoController` (edicoes, edicao, classificacao, resultados)
- [ ] ⬜ `PublicacaoResource` (campos públicos apenas)
- [ ] ⬜ Middleware de rate limit
- [ ] ⬜ UI: página pública com classificação, pódio, últimas atualizações
- [ ] ⬜ Teste de vazamento (publicada vs não publicada)

---

### M13 — Acesso e perfis

| ID | Regra de negócio | Critério de aceite | Status |
|---|---|---|---|
| RN-13.1 | 4 perfis: administrador, organizador, mesario, homologador | enum + cast | ⬜ |
| RN-13.2 | Negado por padrão: rota nova exige Policy explícita | teste de cobertura de rotas | ⬜ |
| RN-13.3 | Autenticação por token Bearer (Sanctum) | header validado | ⬜ |
| RN-13.4 | Senha com hash Argon2id; mínimo 10 caracteres | verificação no hash | ⬜ |
| RN-13.5 | Login com rate limit (5 tentativas/min por e-mail+IP) | 429 | ⬜ |
| RN-13.6 | Usuário inativo não autentica | 401 | ⬜ |
| RN-13.7 | Logout revoga o token atual | 401 após logout | ⬜ |
| RN-13.8 | Token expira em 12 h de inatividade | config | ⬜ |
| RN-13.9 | Matriz de permissões documentada e testada | tabela em `docs/seguranca.md` | ⬜ |

**Matriz de permissões (referência)**
| Ação | administrador | organizador | mesario | homologador | público |
|---|---|---|---|---|---|
| CRUD edição | ✅ | ler + status | — | ler | ler publicado |
| CRUD modalidade/critérios | ✅ | ✅ | — | ler | — |
| Publicar/revogar regra | ✅ | ✅ | — | ler | — |
| CRUD escolas/equipes/participantes | ✅ | ✅ | ler | ler | — |
| Submeter inscrição | ✅ | ✅ | — | — | — |
| Avaliar inscrição | ✅ | ✅ | — | — | — |
| CRUD etapas/grupos/disputas | ✅ | ✅ | ler | ler | — |
| Lançar resultado | ✅ | — | ✅ | — | — |
| Ver classificação não publicada | ✅ | ✅ | ✅ | ✅ | — |
| Homologar | ✅ | — | — | ✅ | — |
| Publicar resultado | ✅ | — | — | ✅ | — |
| Retificar | ✅ | — | — | ✅ | — |
| Consultar auditoria | ✅ | — | — | ✅ | — |
| Ver resultado publicado | ✅ | ✅ | ✅ | ✅ | ✅ |

**Checklist M13**
- [ ] ⬜ Sanctum instalado + `HasApiTokens`
- [ ] ⬜ `AuthController` (login, logout, me)
- [ ] ⬜ Rate limiter de login
- [ ] ⬜ `Policies` para os 14 agregados
- [ ] ⬜ Seeder de 4 usuários demo (um por perfil)
- [ ] ⬜ Guard de rota no front por perfil
- [ ] ⬜ Teste: matriz de permissões completa (14 × 5)

---

### M14 — Interoperabilidade e API pública de leitura

| ID | Regra de negócio | Critério de aceite | Status |
|---|---|---|---|
| RN-14.1 | UUID público em edição, escola, equipe, modalidade | colunas únicas | ⬜ |
| RN-14.2 | Contrato de API versionado em `/api/v1` | prefixo | ⬜ |
| RN-14.3 | Resposta pública documentada em `docs/api.md` com exemplos | doc completa | ⬜ |
| RN-14.4 | Resultado publicado disponível com schema estável p/ Desafio 03 | exemplo validado | ⬜ |
| RN-14.5 | Breaking change exige `/api/v2` | regra de processo | ⬜ |
| RN-14.6 | Nenhum endpoint público expõe dado interno (IDs sequenciais, e-mails) | revisão | ⬜ |

**Checklist M14**
- [ ] ⬜ Colunas UUID + geração no model (`booted`)
- [ ] ⬜ `docs/api.md` com todos os endpoints, payloads e erros
- [ ] ⬜ Collection Postman/Insomnia exportada em `docs/`
- [ ] ⬜ Exemplo de payload de resultado publicado (contrato com Desafio 03)

---

## 8. Painel de progresso

| Módulo | Regras | Implementado | % |
|---|---|---|---|
| M1 Edições | 7 | 0 | 0% |
| M2 Modalidades e critérios | 8 | 0 | 0% |
| M3 Regras versionadas | 7 | 0 | 0% |
| M4 Escolas/equipes/participantes | 7 | 0 | 0% |
| M5 Inscrições | 8 | 0 | 0% |
| M6 Etapas/grupos/chaveamento | 8 | 0 | 0% |
| M7 Disputas | 7 | 0 | 0% |
| M8 Lançamento de resultados | 9 | 0 | 0% |
| M9 Classificação/desempate | 8 | 0 | 0% |
| M10 Homologação/publicação | 9 | 0 | 0% |
| M11 Auditoria | 8 | 0 | 0% |
| M12 Portal público | 8 | 0 | 0% |
| M13 Acesso e perfis | 9 | 0 | 0% |
| M14 Interoperabilidade | 6 | 0 | 0% |
| **Total** | **109** | **0** | **0%** |

---

## 9. Padrões de projeto e de código

### 9.1 Princípios
| Princípio | Como aplicamos | Onde se verifica |
|---|---|---|
| **Clean Code** | nomes de domínio em português, funções pequenas, sem comentário óbvio, sem número mágico | revisão de PR |
| **Clean Architecture** | camadas Presentation → Application → Domain → Infrastructure; regra de dependência para dentro | estrutura de pastas + code review |
| **SOLID** | Controllers finos; Services com uma responsabilidade; Strategy para desempate; interfaces para repositórios | `app/Services`, `app/Domain` |
| **KISS** | sem CQRS/Event Sourcing/microserviços no MVP; 1 banco, 1 API, 1 SPA | Seção 2.3 |
| **DRY** | Resources, Requests e componentes `ui/` reutilizados; regra de cálculo só em um lugar (`ClassificacaoService`) | grep por duplicação de soma de pontos |
| **YAGNI** | multi-tenant, WebSocket, app mobile e SSO só no roadmap | Seção 2.2 |
| **TDD** | regras de maior risco escritas com teste antes: desempate, chaveamento, versionamento, autorização | Seção 10 |
| **Fail Fast** | validação na borda (Form Request) + invariantes no domínio + constraints no banco | 3 camadas de defesa |
| **Immutability** | regra publicada e snapshot de publicação não são editáveis | RN-3.4, RN-10.7 |
| **Explicit over implicit** | sem `$guarded = []`; enums em vez de string solta | grep |
| **Boy Scout Rule** | PR que toca código paga pequena dívida técnica local | revisão |
| **Convention over configuration** | Laravel/Laravel Pint/ESLint/Prettier sem negociar estilo | CI |

### 9.2 Padrões aplicados
| Padrão | Uso no projeto |
|---|---|
| **MVC (Laravel)** | Model (domínio/persistência) + Controller (HTTP) + View (JSON Resource). SPA consome a API. |
| **Repository (leve)** | apenas onde há consulta complexa (classificação, auditoria); sem abstrair CRUD trivial (KISS) |
| **Service Layer / Use Case** | `InscricaoService`, `ChaveamentoService`, `ResultadoService`, `ClassificacaoService`, `HomologacaoService`, `PublicacaoService` |
| **DTO / Form Request** | entrada validada e tipada; controller nunca lê `$request->all()` |
| **API Resource** | serialização única e explícita; dois Resources para resultado (interno vs público) |
| **Policy / Gate** | autorização declarativa por agregado |
| **Observer** | `AuditoriaObserver` transversal a 17 models |
| **Strategy** | critérios de desempate (uma classe por `campo`) |
| **State Machine (simples)** | transições de status de edição, inscrição, disputa, etapa, publicação |
| **Factory + Seeder** | dados fictícios realistas e testes determinísticos |
| **Adapter** | `IdentificadorPublico` (UUID) encapsulado em trait |
| **Guard Clause** | validações de pré-condição no início dos serviços |

### 9.3 Proibições explícitas (lint/revisão bloqueia)
| Proibido | Motivo |
|---|---|
| `DB::raw`/`whereRaw` com interpolação de variável | SQL injection (Seção 11) |
| `$guarded = []` | mass assignment |
| `any` em TypeScript | perda de tipagem |
| `dd()`, `dump()`, `var_dump()` em código entregue | vazamento de dados |
| Regra de pontuação calculada no frontend | divergência de fonte de verdade |
| `float` para pontuação | erro de arredondamento em classificação |
| Lógica de negócio em Controller | testabilidade e Clean Architecture |
| Credencial/dado real em seeder | LGPD/briefing |
| `catch (Exception $e) {}` vazio | falha silenciosa |

---

## 10. Estratégia de testes (TDD)

### 10.1 Pirâmide e ferramentas
| Nível | Ferramenta | Alvo | Cobertura mínima |
|---|---|---|---|
| Unitário (domínio) | Pest/PHPUnit | desempate, chaveamento, transições de status, cálculo de pontos | **90%** |
| Integração (feature/API) | Pest + `RefreshDatabase` | cada endpoint: sucesso, 401, 403, 404, 422 | 100% dos endpoints |
| Contrato | Pest | shape de Resource (público vs interno) | 100% dos públicos |
| Componente (front) | Vitest + Testing Library | formulários e tabelas críticas | 60% |
| E2E | Playwright | fluxo do Demo Day (Seção 3.1) | 1 spec com 10 passos |
| Estático | Larastan nível 6, ESLint, `tsc --noEmit` | — | zero erro |
| Segurança | suíte dedicada de payloads | SQLi, XSS, IDOR, mass assignment | ver Seção 11.4 |

### 10.2 Ordem TDD (o que testar primeiro)
1. `PoliticaDesempate` — comparadores e ordem (puro, sem banco).
2. `ClassificacaoService` — agregação e posições empatadas.
3. `ChaveamentoService` — potência de 2, byes, encadeamento.
4. `PublicacaoService` — versão incremental e snapshot imutável.
5. `ResultadoService` — upsert transacional e bloqueio de edição publicada.
6. Matriz de autorização (14 ações × 5 perfis).

### 10.3 Definition of Done de teste
- [ ] Teste escrito antes da implementação nos 6 itens acima (TDD real).
- [ ] `php artisan test` verde; `npm run test` verde.
- [ ] E2E do fluxo principal verde.
- [ ] Nenhum teste deletado ou marcado `skip` para "passar".
- [ ] CI executa tudo em PR.

---

## 11. Plano de segurança

### 11.1 Modelo de ameaça (resumo)
Ativos: resultado oficial, classificação, dados de menores (fictícios), credenciais, trilha de auditoria.
Adversários plausíveis: aluno participante curioso, usuário interno com acesso excessivo, script automatizado, erro operacional do mesário.

### 11.2 Controles por vetor de ataque

| # | Ameaça | Risco | Controle obrigatório | Onde | Status |
|---|---|---|---|---|---|
| S1 | **SQL Injection** | crítico | Eloquent/Query Builder **sempre** com bindings; proibido `DB::raw` com variável; `ORDER BY`/`LIMIT` por whitelist; testes com payloads (`' OR 1=1--`, `;DROP TABLE`, unicode) | `app/`, `tests/Security` | ⬜ |
| S2 | **Mass Assignment** | alto | `$fillable` explícito em todos os models; entrada só por Form Request validado | `app/Models` | ⬜ |
| S3 | **Broken Access Control / IDOR** | crítico | Policy em toda rota; teste para cada perfil × recurso; nunca autorizar por ID vindo do cliente sem checar dono/permissão | `app/Policies` | ⬜ |
| S4 | **XSS** | alto | React escapa por padrão; **proibido** `dangerouslySetInnerHTML`; conteúdo de regra renderizado como texto ou sanitizado (DOMPurify) | `frontend/src` | ⬜ |
| S5 | **CSRF** | médio | auth por token Bearer (não cookie) → imune a CSRF clássico; se mudar para cookie, ativar `EnsureFrontendRequestsAreStateful` | Sanctum | ⬜ |
| S6 | **Força bruta / credential stuffing** | alto | rate limit 5/min por e-mail+IP no login, atraso progressivo, Argon2id, senha mínima 10 | `RateLimiter` | ⬜ |
| S7 | **Sequestro de sessão/token** | médio | token em `localStorage` com expiração 12 h, revogação no logout, HTTPS obrigatório em prod, sem log de token | `auth.tsx`, `AuthController` | ⬜ |
| S8 | **Enumeração de recursos** | médio | UUID público; 404 genérico; IDs sequenciais nunca expostos | `publico/*` | ⬜ |
| S9 | **Vazamento de resultado não publicado** | alto | filtro obrigatório `status = publicada` centralizado em `PublicacaoRepository`; teste de vazamento | `app/Services` | ⬜ |
| S10 | **Injeção em parâmetros de ordenação/filtro** | médio | whitelist de campos ordenáveis; casting de tipo | `Requests` | ⬜ |
| S11 | **CORS mal configurado** | médio | `allowed_origins` explícito (dev: `localhost:5173`; prod: domínio oficial), sem `*` com credenciais | `config/cors.php` | ⬜ |
| S12 | **Security headers** | médio | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`, HSTS em prod | middleware | ⬜ |
| S13 | **Secrets no repositório** | alto | `.env` gitignored; `.env.example` sem segredo; `gitleaks` no CI; Secrets Manager em prod | repo + CI | ⬜ |
| S14 | **Dependências vulneráveis** | médio | `composer audit`, `npm audit`, Dependabot semanal, lockfiles commitados | CI | ⬜ |
| S15 | **Erro expondo stack trace** | médio | `APP_DEBUG=false` em prod; handler padronizado `{message, errors?}` | `bootstrap/app.php` | ⬜ |
| S16 | **Log com dado sensível** | alto | exclusão de `password`, `token`, `remember_token` no `AuditoriaObserver`; teste | `app/Observers` | ⬜ |
| S17 | **DoS / abuso de endpoint público** | médio | throttle por IP em `/publico/*` e login; paginação obrigatória; limite de `per_page` | middleware | ⬜ |
| S18 | **Integridade de resultado** | crítico | transação + coluna gerada + imutabilidade de snapshot + auditoria | `Services` | ⬜ |
| S19 | **Backup/recuperação** | alto | `pg_dump` diário em dev/piloto; RDS automated backups (7–35 dias) em prod; teste de restore documentado | infra | ⬜ |
| S20 | **LGPD / dados de menores** | crítico | apenas dados fictícios no MVP; sem CPF/documento/foto; aviso na UI e no README | domínio | ⬜ |
| S21 | **Dependência de terceiros / licenças** | baixo | licenças verificadas e declaradas no README | docs | ⬜ |
| S22 | **Falha de autorização no front** | médio | guard de rota por perfil **e** verificação no back (front nunca é a única barreira) | `router.tsx` + Policies | ⬜ |

### 11.3 Regras de implementação segura (obrigatórias)
1. **Nenhuma query com string concatenada** — se precisar de SQL cru, usar `DB::select($sql, $bindings)` com placeholders.
2. **Validação em 3 camadas:** Form Request (borda) → invariante de domínio (service) → constraint no banco.
3. **Autorização negada por padrão:** rota nova sem Policy = teste falhando.
4. **Nunca confiar em `pontos_finais` do cliente** — coluna gerada, campo rejeitado.
5. **Nunca logar payload inteiro de login.**
6. **Produção:** `APP_DEBUG=false`, `APP_ENV=production`, HTTPS, headers, WAF.
7. **Toda correção de resultado exige motivo** (RN-8.8) — defesa contra alteração silenciosa.

### 11.4 Suíte de testes de segurança (obrigatória antes da entrega)
| # | Teste | Esperado |
|---|---|---|
| TS1 | SQLi em login, filtro de auditoria, ordenação de classificação | 422/200 sem erro de banco; nenhuma tabela dropada |
| TS2 | XSS via conteúdo de regra (`<script>alert(1)</script>`) | renderizado como texto, sem execução |
| TS3 | IDOR: mesario acessando auditoria; organizador lançando resultado | 403 |
| TS4 | Mass assignment: enviar `perfil=administrador` no update de usuário | ignorado |
| TS5 | Vazamento: GET público com etapa não publicada | 404 |
| TS6 | Rate limit de login com 6 tentativas | 429 |
| TS7 | Token expirado/revogado | 401 |
| TS8 | Payload enorme / `per_page=100000` | 422 ou truncado |
| TS9 | CORS de origem não autorizada | bloqueado |
| TS10 | `grep` por `whereRaw|DB::raw|dangerouslySetInnerHTML|guarded = \[\]` | zero ocorrências |

### 11.5 Segurança de infraestrutura (pós-MVP, detalhe na Seção 13)
WAF + rate limit de borda, Security Groups mínimos, RDS em subnet privada, IAM least privilege, Secrets Manager, CloudTrail ativo, alarmes CloudWatch, backup automatizado com teste de restore trimestral.

---

## 12. O que falta implementar (backlog priorizado)

### 12.1 Bloqueadores do MVP (P0 — sem isso não há demo)
| # | Item | Módulo | Status |
|---|---|---|---|
| P0-1 | Docker Compose Postgres + `.env.example` + healthcheck | Infra | ⬜ |
| P0-2 | Scaffold Laravel + conexão Postgres + 18 migrations | Back | ⬜ |
| P0-3 | Models + factories + seeders fictícios (35 escolas / 69 equipes / 250 participantes) | Back | ⬜ |
| P0-4 | Auth Sanctum + 4 perfis + Policies base | M13 | ⬜ |
| P0-5 | CRUD de edições, modalidades, critérios | M1, M2 | ⬜ |
| P0-6 | CRUD escolas, equipes, participantes | M4 | ⬜ |
| P0-7 | Inscrição + aprovação | M5 | ⬜ |
| P0-8 | Etapas/disputas + chaveamento | M6, M7 | ⬜ |
| P0-9 | Lançamento de resultado | M8 | ⬜ |
| P0-10 | Classificação + desempate | M9 | ⬜ |
| P0-11 | Homologação + publicação + retificação | M10 | ⬜ |
| P0-12 | Auditoria (Observer + consulta) | M11 | ⬜ |
| P0-13 | Scaffold React + shell + router + tipos | Front | ⬜ |
| P0-14 | Telas do fluxo (cadastros + competição) | Front | ⬜ |
| P0-15 | Portal público | M12 | ⬜ |
| P0-16 | README + docs (arquitetura, dados, API, segurança) | Docs | ⬜ |

### 12.2 Importantes (P1 — qualidade e nota)
| # | Item | Status |
|---|---|---|
| P1-1 | Regras/editais versionados (M3) | ⬜ |
| P1-2 | Suíte de testes de segurança (TS1–TS10) | ⬜ |
| P1-3 | E2E Playwright do fluxo principal | ⬜ |
| P1-4 | Acessibilidade: WCAG AA, navegação por teclado, contraste | ⬜ |
| P1-5 | Rate limiting + security headers + CORS restrito | ⬜ |
| P1-6 | CI GitHub Actions (lint + testes + build) | ⬜ |
| P1-7 | Collection Postman/Insomnia + `docs/api.md` | ⬜ |
| P1-8 | Backlog de continuidade priorizado (entregável do briefing) | ⬜ |
| P1-9 | Script de verificação de dados fictícios | ⬜ |

### 12.3 Evolução (P2 — pós-hackathon)
| # | Item | Quando |
|---|---|---|
| P2-1 | Placar ao vivo (WebSocket/Reverb) | Fase 2 |
| P2-2 | Relatórios PDF de súmula e classificação | Fase 2 |
| P2-3 | Notificações por e-mail/WhatsApp para escolas | Fase 2 |
| P2-4 | Multi-tenant (múltiplas redes/municípios) | Fase 3 |
| P2-5 | SSO institucional (Google Workspace / gov.br) | Fase 3 |
| P2-6 | Dashboard analítico e exportação CSV/XLSX | Fase 3 |
| P2-7 | App mobile para mesário em pista (offline-first) | Fase 3 |
| P2-8 | Integração efetiva com Desafios 01 e 03 | Fase 3 |

---

## 13. Roadmap de escalabilidade (próximos 12 meses)

### 13.1 Fases
| Fase | Janela | Objetivo | Arquitetura | Usuários/Concorrência |
|---|---|---|---|---|
| **F0 — Hackathon** | Semana 1 | MVP demonstrável, local | Docker Compose (1 Postgres) + app nativo | 1–5 |
| **F1 — Piloto** | M1–M2 | 1 rede municipal, uso real em 1 edição | AWS ECS Fargate + RDS + ALB | 50 usuários, picos 100 |
| **F2 — Edição ao vivo** | M3–M4 | 69 equipes, dia do evento | F2 + autoscaling + Redis + filas + WAF | 500 concorrentes, picos 1.000 |
| **F3 — Institucional** | M6–M12 | Múltiplas edições/redes, histórico | F3 + read replica + observabilidade + SSO + DR | 5.000 cadastros, 2.000 concorrentes |

### 13.2 Arquitetura AWS — Fase 1 (piloto)
```
                     Route 53 (dominio oficial)
                              │
                      ┌───────▼────────┐
                      │  CloudFront    │  (cache de assets do SPA + TLS)
                      └───┬────────┬───┘
                  S3 (SPA)│        │ /api
                          │   ┌────▼─────────┐
                          │   │   WAF        │  (rate limit + regras OWASP)
                          │   └────┬─────────┘
                          │   ┌────▼─────────┐
                          │   │     ALB      │  (TLS, health check)
                          │   └────┬─────────┘
                          │   ┌────▼──────────────────┐
                          │   │  ECS Fargate          │
                          │   │  Laravel API (2 tasks)│  autoscale 2→6
                          │   └────┬──────────────────┘
                          │        │ subnet privada
                          │   ┌────▼─────────┐   ┌──────────────┐
                          │   │ RDS Postgres │   │ Secrets Mgr  │
                          │   │ 17/18, Multi-AZ (prod)│ CloudWatch │
                          │   └──────────────┘   └──────────────┘
```
Só a borda é pública. RDS e tasks em subnet privada, sem IP público.

### 13.3 Decisões de infraestrutura e justificativa
| Decisão | Escolha | Alternativa descartada | Motivo |
|---|---|---|---|
| Compute | **ECS Fargate** | EC2 + ASG | sem servidor para patch, deploy imutável, escala rápida; EC2 só se custo apertar (Seção 14.3) |
| Banco | **RDS PostgreSQL** | Postgres em EC2/container | backup automático, Multi-AZ, PITR — auditoria exige durabilidade |
| SPA | **S3 + CloudFront** | servir SPA pelo Laravel | cache global, custo quase zero, separa deploy |
| Tarefas assíncronas | **Lambda** (relatório, e-mail, export) | worker dedicado 24/7 | custo zero quando ocioso; volume baixo e sazonal |
| Fila (F2) | **SQS + worker ECS** | RabbitMQ gerenciado | serverless, barato, integra com Lambda |
| Cache (F2) | **ElastiCache Redis** (t4g.micro) | sem cache | classificação pública é leitura quente no dia do evento |
| Segredos | **Secrets Manager** | `.env` no container | rotação e auditoria de acesso |
| Observabilidade | **CloudWatch** (logs/metrics/alarms) + Sentry free tier | Datadog | custo/benefício no volume atual |
| IaC | **Terraform** | CloudFormation | portátil, revisável em PR |
| CI/CD | **GitHub Actions + OIDC → AWS** | CodePipeline | sem chave estática, já usamos GitHub |
| Backup | RDS automated (7 d) + `pg_dump` semanal no S3 (Glacier após 30 d) | só RDS | teste de restore independente |
| Banco em prod | Multi-AZ a partir de F2 | single-AZ | tolerância a falha de AZ no dia do evento |

### 13.4 Progressão de escalabilidade (o que muda em cada fase)
| Dimensão | F0 | F1 | F2 | F3 |
|---|---|---|---|---|
| App instances | 1 local | 2 Fargate (0.5 vCPU/1 GB) | 2→6 autoscale | 4→10 |
| Banco | container | db.t4g.micro single-AZ | db.t4g.small Multi-AZ | db.r6g.large Multi-AZ + read replica |
| Cache | — | — | Redis t4g.micro | Redis cache.m6g.large |
| Fila | — | — | SQS + worker | SQS + 2 workers |
| CDN | — | CloudFront | CloudFront + cache de classificação 30 s | idem + WAF bot control |
| Multi-tenant | — | single-tenant | single-tenant | RLS por rede/município |
| Observabilidade | log local | CloudWatch básico | + alarmes SLO + Sentry | + tracing (X-Ray/OTel) |
| DR | — | backup diário | backup + restore testado | cross-region backup copy, RPO 15 min |

### 13.5 SLOs de referência
| Métrica | Meta F2 |
|---|---|
| Disponibilidade no dia do evento | 99,9% |
| Latência p95 da API (leitura) | < 300 ms |
| Latência p95 de lançamento de resultado | < 500 ms |
| RPO | ≤ 15 min |
| RTO | ≤ 1 h |

---

## 14. Custos AWS (média mensal)

> **Premissas:** preços on-demand, região `us-east-1`, nov/2026, sem descontos; câmbio **US$ 1 = R$ 5,60** (referência para orçamento). Piloto/MVP fora da AWS = **R$ 0** de infraestrutura.

### 14.1 Fase 1 — Piloto (baixo tráfego, 1 rede)
| Serviço | Especificação | US$/mês |
|---|---|---|
| ECS Fargate | 2 tasks × 0,5 vCPU / 1 GB, 730 h | 36 |
| RDS PostgreSQL | db.t4g.micro, 20 GB gp3, single-AZ | 15 |
| ALB | 1 ALB + ~5 LCU | 22 |
| S3 + CloudFront | SPA + assets, 10 GB, 50 GB tráfego | 6 |
| Lambda | 100 mil invocações, 128 MB | 1 |
| Secrets Manager | 3 segredos | 1 |
| CloudWatch | logs 5 GB + 5 alarmes | 6 |
| Route 53 | 1 hosted zone + queries | 1 |
| WAF | 1 ACL + 3 regras | 7 |
| ECR | 2 GB de imagem | 1 |
| **Total Fase 1** | | **≈ US$ 96/mês** → **R$ 538/mês** |

### 14.2 Fase 2 — Edição ao vivo + autoscaling
| Serviço | Especificação | US$/mês |
|---|---|---|
| ECS Fargate | média 4 tasks (pico 6) | 72 |
| RDS PostgreSQL | db.t4g.small, Multi-AZ, 50 GB | 95 |
| ElastiCache Redis | cache.t4g.micro | 13 |
| SQS | 5 M requisições | 2 |
| Lambda | 1 M invocações + relatórios | 5 |
| ALB + WAF | ALB + LCU + regras adicionais | 34 |
| S3 + CloudFront | 20 GB + 200 GB tráfego | 14 |
| CloudWatch + Sentry | logs 20 GB, alarmes, SLO | 22 |
| Secrets Manager + Route 53 + ECR | — | 4 |
| **Total Fase 2** | | **≈ US$ 261/mês** → **R$ 1.462/mês** |

### 14.3 Fase 3 — Institucional (multi-rede, histórico)
| Serviço | Especificação | US$/mês |
|---|---|---|
| ECS Fargate | média 6 tasks (pico 10) | 108 |
| RDS PostgreSQL | db.r6g.large Multi-AZ, 200 GB + read replica t4g.medium | 320 |
| ElastiCache Redis | cache.m6g.large | 90 |
| SQS + Lambda | 20 M + 5 M invocações | 20 |
| ALB + WAF (bot control) | — | 55 |
| S3 + CloudFront | 100 GB + 1 TB tráfego | 50 |
| Observabilidade | CloudWatch + X-Ray + Sentry team | 60 |
| Cognito (SSO) | 5.000 MAU | 25 |
| Secrets + Route 53 + ECR + backup cross-region | — | 20 |
| **Total Fase 3** | | **≈ US$ 748/mês** → **R$ 4.189/mês** |

### 14.4 Comparativo: Fargate × EC2 (mesma Fase 1)
| Item | ECS Fargate | EC2 `t4g.small` + Docker |
|---|---|---|
| Compute | US$ 36 | US$ 12 (on-demand) / US$ 8 (reservado 1 ano) |
| Patch/SO | zero | responsabilidade nossa |
| Escala | por task, segundos | ASG, minutos |
| Risco operacional | baixo | médio |
| **Total Fase 1** | **≈ US$ 96** | **≈ US$ 72** |
> **Decisão:** Fargate no piloto (+US$ 24/mês) porque a operação é mínima e o dia do evento é crítico. Se o orçamento apertar, `t4g.small` + RDS micro reduz ~30%.

### 14.5 Otimizações de custo
| Ação | Economia estimada |
|---|---|
| Savings Plans / Reserved Instance (1 ano) em Fargate e RDS | 30–40% |
| RDS single-AZ fora da janela do evento | ~45% do RDS |
| S3 Intelligent-Tiering / Glacier para backups > 30 d | 60–80% do storage |
| Desligar tasks extras fora do evento (schedule) | ~30% do compute em F2 |
| CloudFront cache agressivo do SPA e da classificação pública | reduz compute e tráfego |
| Sem NAT Gateway (tasks em subnet privada com VPC endpoints somente onde necessário) | evita US$ 32/mês |
| Sentry/observabilidade free tier até F2 | US$ 0→29 de diferença |

### 14.6 Resumo executivo de custo
| Fase | US$/mês | R$/mês | Custo anual (R$) |
|---|---|---|---|
| F0 Hackathon (local) | 0 | 0 | 0 |
| F1 Piloto | 96 | 538 | 6.456 |
| F2 Edição ao vivo | 261 | 1.462 | 17.544 |
| F3 Institucional | 748 | 4.189 | 50.268 |

> **Leitura para a banca:** o MVP custa **R$ 0** em infraestrutura (roda local) e o piloto institucional sai por **menos de R$ 550/mês** — viável para a Secretaria. O pico de custo é sazonal (dia do evento), o que favorece desligamento programado.

---

## 15. Riscos e mitigação

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | Escopo grande demais para o prazo | alta | alto | Seção 2.3: um fluxo fim-a-fim; P2 fora do MVP |
| R2 | Divergência de cálculo de classificação | média | crítico | coluna gerada + service único + TDD + testes de empate |
| R3 | Vazamento de resultado antes da publicação | média | crítico | filtro centralizado + teste de vazamento (TS5) |
| R4 | SQL injection / falha de autorização | média | crítico | Seção 11 + suíte TS1–TS10 |
| R5 | Front e back desalinhados no contrato | média | médio | `docs/api.md` como fonte única + tipos TS espelhando Resources |
| R6 | Dados reais em demo (LGPD) | baixa | crítico | seeders fictícios + script de verificação |
| R7 | Time sem experiência em Laravel ou React | média | médio | stack padrão, documentação oficial, revisão cruzada |
| R8 | Demo falhar no dia | média | alto | ensaio cronometrado + seed fixo + fluxo E2E automatizado |
| R9 | README não executável por terceiro | média | alto | teste real: alguém que não escreveu o código segue do zero |
| R10 | Custo AWS estourar | baixa | médio | alarmes de budget, arquitetura com scale-to-zero fora do evento |

---

## 16. Definition of Done (MVP)

Um item só é considerado pronto quando:
- [ ] Código revisado (nunca commitado direto na `main`)
- [ ] Testes automatizados cobrindo o caminho feliz e os erros previstos
- [ ] `lsp_diagnostics` / Larastan / `tsc --noEmit` sem erro
- [ ] `php artisan test` e `npm run test` verdes
- [ ] Autorização verificada por perfil (teste dedicado)
- [ ] Auditoria gerando log da operação
- [ ] Endpoint documentado em `docs/api.md`
- [ ] UI acessível (label, foco, contraste, teclado)
- [ ] Item marcado nas duas visões do módulo (tabela + checklist) e no painel da Seção 8
- [ ] README atualizado se mudou execução/configuração

---

## 17. Declaração de uso de ferramentas de IA

| Ferramenta | Finalidade | Responsável pela validação |
|---|---|---|
| Agente de IA para codificação (assistente no editor) | scaffolding, boilerplate, revisão de padrões, geração de testes | equipe (todo código revisado e compreendido) |
| Agente de IA para documentação | estruturação deste plano, README e docs técnicos | equipe |
| Busca/documentação técnica (Context7/Web) | consulta de APIs de Laravel, React, PostgreSQL | equipe |

Conforme o briefing: *"Ferramentas de IA podem apoiar a execução, mas os integrantes devem compreender e responder pelas entregas; o uso relevante deve ser declarado."* Nenhum dado real de pessoas, escolas ou servidores é usado no desenvolvimento ou nas demonstrações.
