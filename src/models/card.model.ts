import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Card extends Model {
  public id!: number;
  public color!: string;
  public value!: string;
  public gameId!: number;
  public playerId!: number | null;
  public location!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Card.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [['red', 'blue', 'yellow', 'green', 'wild']],
          msg: 'Color must be red, blue, yellow, green, or wild',
        },
      },
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [
            [
              '0',
              '1',
              '2',
              '3',
              '4',
              '5',
              '6',
              '7',
              '8',
              '9',
              'Skip',
              'Reverse',
              'Draw Two',
              'Wild Card',
              'Wild Draw Four',
            ],
          ],
          msg: 'Value must be a valid UNO card',
        },
      },
    },
    gameId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    playerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'players',
        key: 'id',
      },
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'deck',
    },
  },
  {
    sequelize,
    modelName: 'Card',
    tableName: 'cards',
  }
);

export default Card;
