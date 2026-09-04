import app from './app';
import sequelize from './config/database';
import { applyPendingColumns } from './config/schema-updates';
// Imported to ensure associations are registered before sync
import './models/index';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await sequelize.sync();
    await applyPendingColumns(sequelize);
    console.log('Database connected and synced.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start the server:', error);
    process.exit(1);
  }
};

startServer();
