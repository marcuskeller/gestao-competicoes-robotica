# Gestão das Competições — Campeonato Joinvilense de Robótica

MVP do Desafio 02 do Hackathon ADS/UNISENAI: sistema para consolidar pontuações,
classificações e resultados das competições do Campeonato Joinvilense de Robótica,
substituindo planilhas e papéis por um fluxo auditável.

## Estrutura

```
docs/contexto/   Regulamento e briefing do hackathon (PDF)
frontend/        Aplicação Angular (standalone components, signals, Tailwind)
PLANO-MVP-GESTAO-COMPETICOES.md   Plano mestre: escopo, modelo de dados,
                                  regras de negócio, roadmap e segurança
```

## Frontend

```bash
cd frontend
bun install
bun start     # http://localhost:4200
```

Requisitos: Node 22.22.3+ (linha 22), 24.15.0+ (linha 24) ou 26+, e Bun 1.4.4.
Build de produção: `bun run build`. Testes no Chrome: `bun run test:e2e`.

## Status

Frontend MVP navegável: login de demonstração, painel, cadastros, inscrições,
chaveamento por grupos, pontuação, classificação, homologação, publicação,
retificação, auditoria e portal público. Dados fictícios salvos em `localStorage`;
backend e persistência compartilhada continuam pendentes.

Consulte [frontend/README.md](frontend/README.md) para estrutura, rotas,
roteiro de demonstração e limitações.
