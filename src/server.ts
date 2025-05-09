import dotenv from 'dotenv';
import app from './app';
import logger from './utils/logger';
// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info('Issues Backend service started');
});
