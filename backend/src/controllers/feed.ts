import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../utils/prisma';

export const getFeeds = async (req: AuthRequest, res: Response) => {
  try {
    const feeds = await prisma.feed.findMany({
      include: {
        author: { select: { id: true, name: true } },
        comments: { include: { author: { select: { id: true, name: true } } } },
        likes: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(feeds);
  } catch (error) {
    res.status(500).json({ message: '피드를 불러오는 도중 오류가 발생했습니다.' });
  }
};

export const createFeed = async (req: AuthRequest, res: Response) => {
  const { text, tag } = req.body;
  const files = req.files as Express.Multer.File[];
  const authorId = req.userId!;

  try {
    const photoUrls = files ? files.map(file => `/uploads/${file.filename}`) : [];
    const feed = await prisma.feed.create({
      data: {
        text,
        tag,
        photos: JSON.stringify(photoUrls),
        authorId
      },
      include: {
        author: { select: { id: true, name: true } },
        comments: true,
        likes: true
      }
    });
    res.status(201).json(feed);
  } catch (error) {
    res.status(500).json({ message: '피드 작성 도중 오류가 발생했습니다.' });
  }
};

export const toggleLike = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;
  const feedId = parseInt(id);

  try {
    const existingLike = await prisma.like.findUnique({
      where: { userId_feedId: { userId, feedId } }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { userId_feedId: { userId, feedId } }
      });
    } else {
      await prisma.like.create({
        data: { userId, feedId }
      });
    }
    
    const updatedLikes = await prisma.like.findMany({ where: { feedId } });
    res.json(updatedLikes);
  } catch (error) {
    res.status(500).json({ message: '좋아요 처리 도중 오류가 발생했습니다.' });
  }
};

export const addComment = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { text } = req.body;
  const userId = req.userId!;
  const feedId = parseInt(id);

  try {
    const comment = await prisma.comment.create({
      data: {
        text,
        feedId,
        authorId: userId
      },
      include: {
        author: { select: { id: true, name: true } }
      }
    });
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: '댓글 작성 도중 오류가 발생했습니다.' });
  }
};
