import { Router } from 'express';
import { getBooks, createBook } from '../controllers/book';
import { auth } from '../middlewares/auth';

const router = Router();

router.get('/', auth, getBooks);
router.post('/', auth, createBook);

export default router;
