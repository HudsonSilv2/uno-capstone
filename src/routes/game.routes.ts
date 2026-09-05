import { Router } from 'express';
import { GameController } from '../controllers/game.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const gameController = new GameController();

router.post('/', gameController.create);
router.get('/', gameController.getAll);
router.get('/:id', gameController.getById);
router.put('/:id', gameController.update);
router.delete('/:id', gameController.delete);

router.post('/:id/join', authMiddleware, gameController.join);
router.post('/:id/leave', authMiddleware, gameController.leave);
router.post('/:id/end', authMiddleware, gameController.endGame);
router.post('/:id/start', gameController.startGame);
router.get('/:id/players', gameController.getPlayers);
router.get('/:id/state', authMiddleware, gameController.getState);
router.get('/:id/turn', authMiddleware, gameController.getTurn);
router.get('/:id/scores', authMiddleware, gameController.getScoresByGame);
router.post('/:id/turn/next', authMiddleware, gameController.advanceTurn);
router.get('/:id/discard', gameController.getTopDiscard);
router.post('/:id/play', authMiddleware, gameController.playCard);
router.post('/:id/draw', authMiddleware, gameController.drawCard);
router.post('/:id/uno', authMiddleware, gameController.callUno);
router.post('/:id/challenge', authMiddleware, gameController.challenge);
router.post('/:id/ready', authMiddleware, gameController.ready);


export default router;
