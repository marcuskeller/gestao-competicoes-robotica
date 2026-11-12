# Plano do MVP — Gestão das Competições

| Documento | Detalhes |
|---|---|
| Projeto | Desafio 02 · Hackathon ADS/UNISENAI · Campeonato Joinvilense de Robótica |
| Versão | 2.2 · Novembro de 2026 |
| Regulamento e briefing | [Abrir PDF](<Regulamento e Briefing - Hackathon Campeonato Joinvilense de Robótica.pdf>) |
| Dados do campeonato | [Abrir PDF](<Campeonato Joinvilense de Robóticca 2026.pdf>) |
| Objetivo | Resumir produto, tecnologias, arquitetura, roadmap e custos em um documento. |

## 1. Tecnologias

| Área | Tecnologia/decisão | Uso, estado ou observação |
|---|---|---|
| Frontend | **Angular + TypeScript**, standalone e Signals | Aplicação atual; interface responsiva por perfil. |
| Interface visual | **Tailwind CSS + DaisyUI** | Estilos e componentes para desktop e mobile. |
| API | **Kotlin + Spring Boot**, REST/JSON em `/api/v1` | Backend escolhido; regras e validações no servidor. |
| Autenticação | **Spring Security** | Autenticar usuários e aplicar permissões no servidor; decidir sessão/token antes da implementação. |
| Persistência | **PostgreSQL + Spring Data JPA + Flyway** | Banco relacional e migrations versionadas; produção em Amazon RDS. |
| Contrato da API | **OpenAPI** | Documentar a integração Angular/API. |
| Testes | **JUnit 5, MockK, Testcontainers, Vitest e Playwright** | Domínio, API e jornadas; aplicar TDD nas regras críticas. |
| Build backend | **Gradle Kotlin DSL** | Compilar, testar e empacotar o backend Kotlin. |
| Infraestrutura paga | **AWS:** S3, CloudFront, ECS Fargate, ALB, RDS PostgreSQL, CloudWatch | Frontend, API, banco privado, logs, alarmes e backups. |
| CI/CD | GitHub Actions + OIDC para AWS | Publicar sem armazenar chaves permanentes da AWS no GitHub. |
| Infraestrutura como código | Terraform, após validar o primeiro ambiente | Reproduzir infraestrutura e revisar mudanças. |
| Arquitetura | Monólito modular | Adiar microserviços, Kubernetes, Redis e filas até haver necessidade medida. |
| Protótipo atual | Angular + dados fictícios em `localStorage` | Sem API, autenticação real ou banco compartilhado; não usar para dados reais. |

## 2. Produto e escopo

### Problema e objetivo

| Problema | Resultado esperado |
|---|---|
| Pontuações e resultados consolidados manualmente podem divergir e têm pouca rastreabilidade. | Registrar e auditar o campeonato de ponta a ponta; o portal exibe somente resultados homologados e publicados. |
| Fluxo do campeonato | Edição → regras/inscrições → disputas → pontuação → classificação → homologação → publicação. |
| Priorização e impacto | Prioridade: reduzir divergências em resultados oficiais e permitir rastrear correções. Medir no piloto o tempo de publicação e a quantidade de correções; definir metas após medir a situação atual. |

### Perfis e jornadas

| Perfil | Ações |
|---|---|
| Administração | Configurar campeonato, modalidades, regras, cargos, usuários e permissões. |
| Organização | Analisar inscrições e organizar etapas/disputas. |
| Mesário/voluntário | Consultar tarefas permitidas e lançar pontuação. |
| Homologação | Conferir, homologar, publicar e retificar resultados com justificativa. |
| Participante pessoa física ou escola | Criar a conta; após login, cadastrar equipes/integrantes e acompanhar inscrições. |
| Empresa apoiadora | Criar a conta; após login, descrever apoio/doação e acompanhar a proposta. |
| Público | Consultar resultados publicados. |

### Escopo

| Dentro do MVP | Fora do primeiro MVP |
|---|---|
| Edições, modalidades, critérios, regras/editais e desempates versionados. | Pagamentos e prestação de contas. |
| Escolas, contas, equipes, integrantes e inscrições analisadas pela organização. | Aplicativo nativo e streaming ao vivo. |
| Cargos/vagas de voluntariado e propostas de apoio empresarial. | Integração real com sistemas municipais e SSO. |
| Etapas, disputas, pontuação, penalidades e classificação. | Múltiplas redes/municípios e analytics avançado. |
| Homologação, publicação, retificação, auditoria e portal público. | Reavaliar após o piloto. |

## 3. Arquitetura e dados

| Componente | Conexão | Responsabilidade |
|---|---|---|
| Navegador (Angular) | HTTPS para CloudFront; `/api/*` para ALB | Interface e chamadas REST/JSON. |
| S3 privado + CloudFront | CloudFront entrega arquivos do S3 | Hospedar/distribuir o frontend. |
| ALB + ECS Fargate | ALB encaminha para API Kotlin/Spring Boot | Receber chamadas da API; serviço em rede privada. |
| Amazon RDS PostgreSQL | Conexão privada a partir da API | Persistência relacional, integridade e transações. |
| API e domínio | A API executa casos de uso e regras | Validar, autorizar, auditar e calcular pontuação/classificação. |
| Snapshots | API grava versões no banco | Preservar resultados oficiais publicados. |
| GitHub Actions + OIDC | Deploy autenticado para AWS | Publicar sem chaves permanentes no GitHub. |
| CloudWatch | Recebe logs/métricas dos serviços | Alarmes e diagnóstico operacional. |

### Módulos de domínio

| Módulo | Responsabilidade |
|---|---|
| Edições e regras | Edições, modalidades, critérios, desempates, editais e versões. |
| Participação | Escolas, contas, equipes, integrantes e inscrições. |
| Operação | Cargos/vagas de voluntariado, etapas, grupos e disputas. |
| Resultados | Pontuação, penalidades, classificação, homologação, publicação e retificação. |
| Acesso e auditoria | Usuários, papéis, permissões e histórico de alterações. |
| Portal público | Consulta somente leitura aos snapshots publicados. |

### Interoperabilidade futura

| Informação | Produtor | Consumidor futuro | Fonte da verdade proposta | Compartilhamento |
|---|---|---|---|---|
| Identificador da edição | Desafio 02 | Desafios 01 e 03 | Desafio 02 para os dados competitivos; confirmar ownership institucional. | UUID estável. |
| Escola | Desafio 01, se confirmado na integração | Desafio 02 | Cadastro institucional; no protótipo, cópia fictícia/local. | Referência estável; sem sincronização neste MVP. |
| Equipe e modalidade | Desafio 02 | Desafio 03 | Desafio 02 | UUID e referências coerentes à escola e à edição. |
| Resultado oficial | Desafio 02 | Desafio 03 / histórico público | Desafio 02 após homologação | Snapshot JSON somente leitura, publicado após validação. |
| Estado da integração | Não implementada | Checkpoint futuro entre os três desafios | Acordo institucional futuro | O briefing não exige integração funcional durante o hackathon. |

## 4. Regras do campeonato

| Regra | Comportamento esperado |
|---|---|
| Inscrição | Modalidade pertence à edição, período está aberto e equipe respeita os limites. Organização aprova/rejeita; rejeição exige justificativa. |
| Pontuação | Total deriva dos critérios e penalidades configurados; desempates têm ordem explícita. |
| Publicação | Bloqueada enquanto houver disputas/pendências; publicar somente resultados homologados. |
| Retificação | Exige justificativa, cria nova versão e preserva o snapshot anterior. |
| Permissões | API confere usuário, papel, permissão e acesso ao registro em cada operação protegida. |
| Privacidade | Dados de estudantes não aparecem no portal público. |
| Auditoria | Registrar autor, horário, operação e alterações relevantes; nunca senhas ou tokens. |

## 5. Qualidade, UX e segurança

| Prática | Aplicação |
|---|---|
| UX/UI e acessibilidade | Mobile-first, português claro, teclado, foco visível, contraste e estados de erro/sucesso/vazio. |
| Clean Code, SOLID e Clean Architecture | Responsabilidades claras; regras no domínio; abstrações somente quando úteis. |
| KISS/YAGNI | Resolver o necessário para o MVP; adiar complexidade hipotética. |
| TDD | Testar primeiro pontuação, desempate, permissões, publicação e retificação. |
| Privacidade | Dados fictícios no desenvolvimento; antes do piloto, aprovar finalidade, base legal, retenção e acesso, com revisão especial para dados de menores. |
| Dados atuais | A seed contém nomes identificáveis de escolas; não tratar o conjunto inteiro como anonimizado até substituí-los. |
| Segurança de produção | HTTPS, banco privado, IAM mínimo, segredos protegidos, backups testados, alarmes de custo e rollback. |
| Autorização | Guards do frontend ajudam a navegação; a API aplica a segurança real. |

## 6. Estado do protótipo

| Demonstrado no frontend | Pendente no sistema real |
|---|---|
| Fluxos locais dos módulos com dados fictícios. | API Kotlin, PostgreSQL compartilhado e autenticação real. |
| Criação de conta e áreas por perfil. | Autorização por endpoint, auditoria no servidor e proteção de dados. |
| Cadastro pós-login de equipes/alunos e propostas de apoio. | Backups, observabilidade, integração e validação operacional. |
| Snapshot local de resultado publicado. | Concorrência, transações e publicação atômica no servidor. |
| Execução, rotas e detalhes | Consultar `frontend/README.md`. |
| Validação atual | `bun run build` passou; os 12 testes e2e passaram após alinhar cenários aos fluxos atuais. | Reexecutar build e e2e a cada mudança relevante. |
| Dados de demonstração | Seeds locais incluem nomes identificáveis de escolas. | Anonimizar/substituir antes de apresentação pública, conforme o regulamento. |

### Backlog de continuidade

| Prioridade | Próxima entrega | Escopo previsto |
|---|---|---|
| P0 · antes da demo pública | Anonimizar os nomes de escolas na seed. | Dados de demonstração; sem backend. |
| P1 · evolução real | Especificar schema/migrations, contrato da API Kotlin, autenticação/autorização e auditoria de servidor. | Trabalho futuro, após aprovação institucional; não faz parte do código atual. |
| P1 · piloto | Validar regras com a organização, privacidade, backup/restore e carga. | Preparação e critérios de operação. |
| P2 · após o piloto | Integrar fontes dos outros desafios, ampliar formatos de disputa e avaliar SSO/relatórios. | Avançar somente mediante necessidade e acordo entre responsáveis. |

## 7. Plano de evolução — seis meses

| Período | Entrega | Critério para avançar |
|---|---|---|
| Mês 1 · Fundação | Confirmar requisitos, papéis, modelo, privacidade e OpenAPI; preparar Angular, Kotlin/Spring Boot e PostgreSQL local via Docker. | Fluxos/permissões aprovados; ambiente reproduzível; dados sintéticos definidos. |
| Mês 2 · Cadastros e acesso | API, contas, Spring Security, políticas, edições, modalidades, regras, escolas, equipes e inscrições. | Testes de validação e permissões por papel. |
| Mês 3 · Competição | Etapas, disputas, pontuação, classificação, auditoria, homologação e snapshots. | Fluxo completo aprovado em testes de domínio/integração, incluindo desempates e retificação. |
| Mês 4 · Piloto AWS | Integrar Angular/API; criar ambientes, deploy automatizado, backups e CloudWatch. | Deploy repetível, restauração testada e revisão de segurança/privacidade concluída. |
| Mês 5 · Ensaio | Validar com organização/escolas, portal público e carga prevista. | Casos sintéticos conferidos; carga, rollback e incidentes ensaiados. |
| Mês 6 · Lançamento | Congelar funcionalidades, aprovar orçamento, preparar suporte e operar em AWS paga. | Checklist aprovado, custos dentro do limite, responsáveis definidos e backup restaurado. |
| Após mês 6 | Considerar multi-região, Redis, filas, microserviços, Kubernetes, SSO ou app nativo. | Só avançar se requisitos ou métricas justificarem custo/complexidade. |
| Contagem | Seis meses a partir da autorização para iniciar o backend. | Cada fase avança após cumprir seu critério. |

## 8. Infraestrutura e custos

| Opção | Uso | Configuração | Custo estimado | Trade-off/limite |
|---|---|---|---:|---|
| Gratuita contínua | Desenvolvimento | Angular + Kotlin/Spring Boot + PostgreSQL em Docker Compose; dados fictícios. | **US$ 0** | Não é hospedagem pública nem serviço para o dia do evento. |
| AWS Free Tier | Prova de conceito remota | Serviços elegíveis cobertos pelos créditos da conta. | Até **US$ 200 em créditos por até 6 meses** para novos clientes elegíveis. | Temporário e sujeito a termos; sem garantia de produção; usar apenas dados fictícios. |
| AWS paga · Piloto | Validação institucional | S3/CloudFront, ECS Fargate/ALB, RDS PostgreSQL Single-AZ, CloudWatch e backups. | **US$ 80–180/mês** (estimativa). | Menor custo; API ou banco podem ser ponto único de falha. |
| AWS paga · Evento | Operação do campeonato | CDN, pelo menos 2 tarefas ECS, ALB, RDS Multi-AZ, alarmes e backups. | **US$ 180–450/mês** (estimativa). | Mais continuidade; exige teste de carga e orçamento aprovado. |
| Decisão | Desenvolver localmente; créditos somente para protótipo; AWS paga para dados reais/evento. | Aprovar orçamento e testar restauração de backup antes da operação. | Recalcular em [AWS Pricing Calculator](https://calculator.aws/). | Estimativas em USD; impostos, câmbio, domínio, suporte, região, horas, tráfego, armazenamento e rede alteram o total. Configurar alarmes de custo. |

## 9. Riscos, aceite e fontes

### Riscos prioritários

| Risco | Resposta |
|---|---|
| Divergência na classificação | Regra centralizada, transações e testes de desempate. |
| Publicação antes da homologação | Portal consulta somente snapshots publicados; testar autorização/vazamento. |
| Exposição de dados de menores | Minimizar dados, restringir acesso e não publicar dados pessoais. |
| Falha/lentidão no evento | Teste de carga, monitoramento, rollback, backup restaurável e contingência. |
| Custo AWS inesperado | Orçamento, alertas, revisão do uso e remoção de recursos ociosos. |

### Critérios de conclusão

| Área | Aceite |
|---|---|
| Fluxo | Edição → inscrição → disputa → pontuação → classificação → homologação → publicação funciona ponta a ponta. |
| Testes | Cobrem regras críticas, perfis, endpoints, retificação e snapshot público. |
| Produto | Interface responsiva/acessível; API documentada em OpenAPI. |
| Operação | Backup restaurado em ensaio; logs e alertas configurados. |
| Governança | Segurança, privacidade, orçamento e responsáveis aprovados pela instituição. |

### Fontes oficiais

| Tema | Fonte |
|---|---|
| Atualização | Preços/ofertas consultados em novembro de 2026; confirmar antes da implementação. |
| AWS | [Free Tier](https://aws.amazon.com/free/) · [Planos de conta](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html) · [Pricing Calculator](https://calculator.aws/) |
| Preços AWS | [ECS/Fargate](https://aws.amazon.com/fargate/pricing/) · [RDS PostgreSQL](https://aws.amazon.com/rds/postgresql/pricing/) · [CloudFront](https://aws.amazon.com/cloudfront/pricing/) |
| Kotlin/Spring Boot | [Kotlin para backend](https://kotlinlang.org/docs/server-overview.html) · [Kotlin no Spring Boot](https://docs.spring.io/spring-boot/reference/features/kotlin.html) |

## 10. Entregáveis do briefing

| Entregável | Evidência no repositório | Estado |
|---|---|---|
| Problema priorizado, público-alvo e justificativa | Seção 2: problema, atores, prioridade e impacto a medir. | Documentado. |
| Proposta, escopo e fluxo principal | Seção 2 e jornada de edição a publicação. | Documentado. |
| UX e MVP demonstrável com dados de teste | Frontend Angular, seeds, fluxo em `frontend/README.md`; build e 12/12 testes e2e passaram. | Demonstrável; anonimização das escolas seed permanece pendente antes de demo pública. |
| Arquitetura e modelo de dados | Seções 1 e 3; tipos TypeScript em `frontend/src/app/core/models.ts`. | Parcial: modelo do protótipo existe; schema/migrations de backend ficam para depois. |
| Interoperabilidade e fontes compartilhadas | Seção 3: produtores, consumidores, fontes da verdade e contrato futuro. | Documentado como proposta; integração não implementada nem exigida no evento. |
| Repositório, README, limitações e backlog | Git, `README.md`, `frontend/README.md` e backlog da seção 6. | Documentado; testes e caminhos de execução foram conferidos. |
| Uso de ferramentas de IA | Declaração na tabela abaixo. | Documentado; equipe deve validar e responder pelas entregas. |
| Pitch/apresentação | Preparado fora do repositório, conforme decisão da equipe. | Fora desta checagem de código/documentação. |
| Dados fictícios ou anonimizados | Regra do briefing; estado atual descrito nas seções 5 e 6. | Pendente: nomes de escolas na seed devem ser substituídos/anônimos antes da demo pública. |

### Declaração de uso de IA

| Ferramenta | Finalidade | Revisão e responsabilidade |
|---|---|---|
| Codex (OpenAI) | Apoio à análise do repositório, implementação/revisão do frontend e elaboração/revisão da documentação. | A equipe deve revisar, compreender, validar e assumir responsabilidade pelo código e pelas decisões apresentados. |
