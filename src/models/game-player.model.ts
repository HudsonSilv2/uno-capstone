import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Player from './player.model';

/*
  Junction table connecting players (Player) to games (Game).
  Enables the many-to-many relation between the two entities.
*/
export class GamePlayer extends Model {
  public id!: number;
  public gameId!: number;
  public playerId!: number;
  public joinedAt!: Date;
  public saidUno!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GamePlayer.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    gameId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'games',
        key: 'id',
      },
    },
    playerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'players',
        key: 'id',
      },
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    saidUno: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'GamePlayer',
    tableName: 'game_players',
  }
);

// Direct association for use with include
GamePlayer.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });

export default GamePlayer;
