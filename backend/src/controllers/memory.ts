import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../utils/prisma';

export const getMemories = async (req: AuthRequest, res: Response) => {
  try {
    const memories = await prisma.memory.findMany({
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(memories);
  } catch (error) {
    res.status(500).json({ message: '메시지를 불러오는 도중 오류가 발생했습니다.' });
  }
};

export const createMemory = async (req: AuthRequest, res: Response) => {
  const { text, toName, type } = req.body;
  const file = req.file;
  const authorId = req.userId!;

  try {
    const photoUrl = file ? `/uploads/${file.filename}` : null;
    const memory = await prisma.memory.create({
      data: { text, toName, type, photoUrl, authorId },
      include: { author: { select: { id: true, name: true } } }
    });
    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({ message: '메시지 저장 도중 오류가 발생했습니다.' });
  }
};
