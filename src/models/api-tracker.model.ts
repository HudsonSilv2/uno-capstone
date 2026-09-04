import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export interface ApiTrackerAttributes {
  id?: number;
  responseTime: number;
  endpointAccess: string;
  requestMethod: string;
  statusCode: number;
  timestamp?: Date;
  userId?: string | null;
}

export class ApiTracker
  extends Model<ApiTrackerAttributes, ApiTrackerAttributes>
  implements ApiTrackerAttributes
{
  public id!: number;
  public responseTime!: number;
  public endpointAccess!: string;
  public requestMethod!: string;
  public statusCode!: number;
  public timestamp!: Date;
  public userId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ApiTracker.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    responseTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    endpointAccess: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    requestMethod: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'ApiTracker',
    tableName: 'api_trackers',
  }
);

export default ApiTracker;
