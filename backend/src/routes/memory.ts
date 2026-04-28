import { Router } from 'express';
import { getMemories, createMemory } from '../controllers/memory';
import { auth } from '../middlewares/auth';
import { upload } from '../utils/upload';

const router = Router();

router.get('/', auth, getMemories);
router.post('/', auth, upload.single('photo'), createMemory);

export default router;
