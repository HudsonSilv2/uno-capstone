import { Router } from 'express';
import { CardController } from '../controllers/card.controller';

const router = Router();
const cardController = new CardController();

router.post('/', cardController.create);
router.get('/:id', cardController.getById);
router.put('/:id', cardController.update);
router.delete('/:id', cardController.delete);
router.get('/game/:gameId', cardController.getByGameId);

export default router;
