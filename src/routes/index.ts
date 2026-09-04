import { Router } from 'express';
import playerRoutes from './player.routes';
import cardRoutes from './card.routes';
import gameRoutes from './game.routes';
import scoreRoutes from './score.routes';
import authRoutes from './auth.routes';
import statsRoutes from './stats.routes';

const router = Router();

router.use('/players', playerRoutes);
router.use('/cards', cardRoutes);
router.use('/games', gameRoutes);
router.use('/scores', scoreRoutes);
router.use('/auth', authRoutes);
router.use('/stats', statsRoutes);

export default router;

