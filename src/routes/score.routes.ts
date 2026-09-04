import { Router } from 'express';
import { ScoreController } from '../controllers/score.controller';

const router = Router();
const scoreController = new ScoreController();

router.post('/', scoreController.create);
router.get('/:id', scoreController.getById);
router.put('/:id', scoreController.update);
router.delete('/:id', scoreController.delete);

export default router;
