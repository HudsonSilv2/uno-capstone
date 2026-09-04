# Automated tests - Backend CRUDs

Unit tests (Jest + ts-jest) for the four CRUDs already implemented in the
backend: **Players** (users), **Games** (matches), **Cards** and **Scores**.

## Why these services

These are the services in the capstone's current scope with real business
rules to test (not just trivial CRUD): duplicate email validation, card
color/value validation, "not found" errors and output formatting. The game
engine (EPIC 4) had not been implemented yet at the time this suite was
first written, so there were no UNO rules (deck, turns, special cards) to
test in this stage.

## How to run

```bash
npm test              # run all tests
npm run test:coverage # run tests with a coverage report
```

## What is tested

The tests use `jest.mock` to replace the Sequelize models (`Player`, `Game`,
`Card` and `Score`) with mocks. This means no real database is needed — the
tests only verify the services' logic, isolated from the persistence layer.

### `player.service.test.ts`

| Method          | Scenarios covered                                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createPlayer`  | creates the player when the email is free; throws a 400 error when the email already exists                                                                                                            |
| `getPlayerById` | returns the player when found; throws a 404 error when it does not exist                                                                                                                               |
| `updatePlayer`  | updates while keeping the same email; updates by switching to a free email; throws a 400 error when the new email already belongs to another player; throws a 404 error when the player does not exist |
| `deletePlayer`  | removes the player when it exists; throws a 404 error when it does not exist                                                                                                                           |

### `game.service.test.ts`

| Method                 | Scenarios covered                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `createGame`           | creates the match and returns it in the standard output shape                                      |
| `getGameById`          | returns the match instance when found; throws a 404 error when it does not exist                   |
| `getGameByIdFormatted` | returns the already-formatted match                                                                |
| `getAllGames`          | returns the formatted list of matches; returns an empty list when there are none                   |
| `updateGame`           | updates the match and returns it in the standard format; throws a 404 error when it does not exist |
| `deleteGame`           | removes the match when it exists; throws a 404 error when it does not exist                        |

### `card.service.test.ts`

| Method             | Scenarios covered                                                                                                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createCard`       | creates the card with a valid color/value; throws a 400 error when color, value or gameId is missing; throws a 400 error when the color is invalid; throws a 400 error when the value is invalid                                        |
| `getCardById`      | returns the card when found; throws a 404 error when it does not exist                                                                                                                                                                  |
| `updateCard`       | updates a valid color and value; throws a 400 error when the new color is invalid; throws a 400 error when the new value is invalid; throws a 400 error when `gameId` is set to `null`; throws a 404 error when the card does not exist |
| `deleteCard`       | removes the card when it exists; throws a 404 error when it does not exist                                                                                                                                                              |
| `getCardsByGameId` | returns the cards of a match; returns an empty list when the match has no cards                                                                                                                                                         |

### `score.service.test.ts`

| Method         | Scenarios covered                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `createScore`  | creates the score and returns it with the ids converted to string                                  |
| `getScoreById` | returns the score when found; throws a 404 error when it does not exist                            |
| `updateScore`  | updates the score and returns it in the standard format; throws a 404 error when it does not exist |
| `deleteScore`  | removes the score when it exists; throws a 404 error when it does not exist                        |

## Mocking strategy

- `jest.mock` on each `../../models/*.model` replaces Sequelize's static
  methods (`findOne`, `findByPk`, `findAll`, `create`) with `jest.fn()`.
- For instance methods (`update`, `destroy`), the object returned by the
  `findByPk` mock already includes those methods as `jest.fn()`, so tests
  can assert how and with what arguments they were called.
- `clearMocks: true` (configured in `jest.config.js`) guarantees that every
  test starts with clean mocks, with no state leaking from one test to the
  next.

## Coverage

Running `npm run test:coverage`, the four services (`player.service.ts`,
`game.service.ts`, `card.service.ts` and `score.service.ts`) reach 100% line,
branch and function coverage — above the 70% minimum defined for this stage.
