import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

/*
  Class representing the Game entity in the database.
  Following the same structure as the Player model, attributes are typed here.
*/
export class Game extends Model {
  public id!: number;
  public title!: string;
  public status!: string;
  public maxPlayers!: number;
  public currentPlayerId!: number | null;
  public direction!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

/*
  Sequelize schema configuration.
  Defines constraints (such as allowNull) and data types for each column in the database.
*/
Game.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'waiting',
    },
    maxPlayers: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    currentPlayerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'players',
        key: 'id',
      },
    },
    direction: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'clockwise',
    },
  },
  {
    sequelize,
    modelName: 'Game',
    tableName: 'games',
  }
);

export default Game;
