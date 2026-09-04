import app from './app';
import sequelize from './config/database';
import { applyPendingColumns } from './config/schema-updates';
import { createServer } from 'http';
import { initGameSocket } from './realtime/game.socket';
// Imported to ensure associations are registered before sync
import './models/index';

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);
initGameSocket(httpServer);

const startServer = async () => {
  try {
    await sequelize.sync();
    await applyPendingColumns(sequelize);
    console.log('Database connected and synced.');

    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start the server:', error);
    process.exit(1);
  }
};

startServer();
