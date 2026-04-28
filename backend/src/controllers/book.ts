import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../utils/prisma';

export const getBooks = async (req: AuthRequest, res: Response) => {
  try {
    const books = await prisma.book.findMany({
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: '독서 기록을 불러오는 도중 오류가 발생했습니다.' });
  }
};

export const createBook = async (req: AuthRequest, res: Response) => {
  const { text, status } = req.body;
  const authorId = req.userId!;

  try {
    const book = await prisma.book.create({
      data: { text, status, authorId },
      include: { author: { select: { id: true, name: true } } }
    });
    res.status(201).json(book);
  } catch (error) {
    res.status(500).json({ message: '독서 기록 저장 도중 오류가 발생했습니다.' });
  }
};
