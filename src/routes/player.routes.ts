import { Router } from 'express';
import { PlayerController } from '../controllers/player.controller';

/* Careful if you change this:
   new routes need to import their controllers and services
   and be created below.
*/

const router = Router();
const playerController = new PlayerController();

router.post('/', playerController.create);
router.get('/:id', playerController.getById);
router.put('/:id', playerController.update);
router.delete('/:id', playerController.delete);

export default router;
