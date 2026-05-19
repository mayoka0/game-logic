# Nexus | Game Logic Agent Instructions

## Overview
Nexus is the central brain of Neon Surge. It integrates all other systems and manages the game lifecycle, difficulty scaling, and state transitions.

## Core Components
- `main.js`: The entry point and master state machine.
- `CentralEventBus`: Facilitates communication between decoupled systems.
- `Game Systems`: (Collision, Input, UI, Audio) handled via specialized classes.

## Coding Standards
- **Orchestration**: `main.js` should focus on *what* happens and *when*, delegating the *how* to specialized systems.
- **Event-Driven**: Use the `CentralEventBus` for global signals (e.g., `SCORE_UPDATE`, `GAME_OVER`).
- **State Machine**: Adhere to the `GameState` enum when managing game flow.

## Project Structure
- `js/core`: Foundational systems like the Engine and Event Bus.
- `js/entities`: Game objects like Player and Obstacle.
- `js/systems`: Logic-heavy systems like Collision and Input.

## Future Improvements
- [ ] Move UI overlay creation from `main.js` to `UIManager.js`.
- [ ] Implement a `TunnelSystem` to handle the procedural environment logic currently in `main.js`.
- [ ] Add persistence for high scores beyond local storage save states.
