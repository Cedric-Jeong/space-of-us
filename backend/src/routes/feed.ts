import { Router } from 'express';
import { getFeeds, createFeed, toggleLike, addComment } from '../controllers/feed';
import { auth } from '../middlewares/auth';
import { upload } from '../utils/upload';

const router = Router();

router.get('/', auth, getFeeds);
router.post('/', auth, upload.array('photos', 3), createFeed);
router.post('/:id/like', auth, toggleLike);
router.post('/:id/comment', auth, addComment);

export default router;
