import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../utils/prisma';

export const getGoals = async (req: AuthRequest, res: Response) => {
  try {
    const goals = await prisma.goal.findMany({
      include: {
        author: { select: { id: true, name: true } },
        subGoals: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: '목표를 불러오는 도중 오류가 발생했습니다.' });
  }
};

export const createGoal = async (req: AuthRequest, res: Response) => {
  const { title, subGoalText } = req.body;
  const authorId = req.userId!;

  try {
    const goal = await prisma.goal.create({
      data: {
        title,
        authorId,
        subGoals: subGoalText ? { create: { text: subGoalText } } : undefined
      },
      include: { subGoals: true, author: { select: { name: true } } }
    });
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: '목표 추가 도중 오류가 발생했습니다.' });
  }
};

export const addSubGoal = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { text } = req.body;
  const goalId = parseInt(id);

  try {
    const subGoal = await prisma.subGoal.create({
      data: { text, goalId }
    });
    res.status(201).json(subGoal);
  } catch (error) {
    res.status(500).json({ message: '세부 목표 추가 도중 오류가 발생했습니다.' });
  }
};

export const toggleSubGoal = async (req: AuthRequest, res: Response) => {
  const { subGoalId } = req.params;
  const id = parseInt(subGoalId);

  try {
    const subGoal = await prisma.subGoal.findUnique({ where: { id } });
    if (!subGoal) return res.status(404).json({ message: '세부 목표를 찾을 수 없습니다.' });

    const updated = await prisma.subGoal.update({
      where: { id },
      data: { done: !subGoal.done }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: '세부 목표 상태 변경 도중 오류가 발생했습니다.' });
  }
};
