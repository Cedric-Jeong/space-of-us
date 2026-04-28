import { Router } from 'express';
import { getGoals, createGoal, addSubGoal, toggleSubGoal } from '../controllers/goal';
import { auth } from '../middlewares/auth';

const router = Router();

router.get('/', auth, getGoals);
router.post('/', auth, createGoal);
router.post('/:id/subgoals', auth, addSubGoal);
router.post('/subgoals/:subGoalId/toggle', auth, toggleSubGoal);

export default router;
