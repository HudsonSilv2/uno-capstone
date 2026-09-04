import { Router } from 'express';
import { statsController } from '../controllers/stats.controller';

const router = Router();

router.get('/requests', statsController.getRequests);
router.get('/response-times', statsController.getResponseTimes);
router.get('/status-codes', statsController.getStatusCodes);
router.get('/popular-endpoints', statsController.getPopularEndpoints);

export default router;
