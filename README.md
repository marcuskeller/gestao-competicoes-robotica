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

Requisitos: Node 20+ (ou Bun). Build de produção: `bun run build`.

## Status

Em desenvolvimento — frontend com camada de domínio, store, permissões e telas
base já implementadas; backend e persistência no roadmap do plano mestre.
