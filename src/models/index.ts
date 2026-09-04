/*
  Centralized file for associations between models.
  Importing this file guarantees that all relations
  are configured before sequelize.sync().
*/

import Player from './player.model';
import Game from './game.model';
import GamePlayer from './game-player.model';
import Card from './card.model';
import Score from './score.model';
import ApiTracker from './api-tracker.model';

// Many-to-many relation: Game <-> Player via GamePlayer
Game.belongsToMany(Player, {
  through: GamePlayer,
  foreignKey: 'gameId',
  otherKey: 'playerId',
  as: 'players',
});

Player.belongsToMany(Game, {
  through: GamePlayer,
  foreignKey: 'playerId',
  otherKey: 'gameId',
  as: 'games',
});

// One-to-many relation: Game -> Cards
Game.hasMany(Card, { foreignKey: 'gameId', as: 'cards' });
Card.belongsTo(Game, { foreignKey: 'gameId', as: 'game' });

// Optional one-to-many relation: Player -> Cards (cards in player's hand)
Player.hasMany(Card, { foreignKey: 'playerId', as: 'cards' });
Card.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });

// Relation: Score -> Player, Score -> Game
Score.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });
Score.belongsTo(Game, { foreignKey: 'gameId', as: 'gameRef' });

export { Player, Game, GamePlayer, Card, Score, ApiTracker };
