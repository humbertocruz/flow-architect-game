# Flow Architect Game

Primeiro jogo-prova do Game Architect.

Este repo e o jogo em si: uma aplicacao Vite + TypeScript + PixiJS que carrega um arquivo `.game.yaml` e transforma a estrutura em uma cena jogavel simples.

## Objetivo Inicial

- carregar `src/game/flow-architect-teo-apartamento.game.yaml`
- renderizar uma room 2D com PixiJS
- mostrar Teo, objetos e area caminhavel com placeholders
- permitir mover Teo com teclado
- clicar em objetos para disparar interacoes e dialogos
- provar o formato `.game.yaml` antes de construir o editor Game Architect

## Rodando

```bash
npm install
npm run dev
```

## Separacao

- `flow-architect-game`: jogo real, leve, Vite + PixiJS
- `game-architect-blueprint`: contrato, docs, schema e exemplos
- `game-architect-app`: futuro editor/gerador em Next.js
