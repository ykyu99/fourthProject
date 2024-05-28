// src/routes/apply.router.js

import express from 'express';
import { prisma } from '../utils/prisma/prisma.util.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/** 이력서 생성 API **/
router.post('/posts', authMiddleware, async (req, res, next) => {
  const { userId } = req.user;
  const { title, content } = req.body;

  if(!title || !content){
    let str = "";
      if(!title) str = "제목을";
      if(!content) str = "자기소개를";
      return res
      .status(403)
      .json({ message: `${str} 입력해주세요.` })
  }

  if(content.length < 150){
    return res
      .status(403)
      .json({ message: "자기소개는 150자 이상 작성해야 합니다."})
  }

  const post = await prisma.apply.create({
    data: {
      userId: +userId,
      title,
      content,
      state : "APPLY",
    },
  });

  return res.status(201).json({ data: post });
});

/** 이력서 목록 조회 API **/
router.get('/posts', authMiddleware, async (req, res, next) => {
    const { userId } = req.user

    const posts = await prisma.apply.findMany({
      where: { userId: +userId },
      select: {
        applyId: true,
        user: 
        { select : 
          {
            userInfos: {
              select: {
                name: true,
              },
           },
          }
        },
        title: true,
        content: true,
        state: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc', // 이력서을 최신순으로 정렬합니다.
      },
    });
  
    return res.status(200).json({ data: posts });
  });

  /** 이력서 상세 조회 API **/
router.get('/posts/:applyId', authMiddleware,async (req, res, next) => {
    const { applyId } = req.params;
    const { userId } = req.user
    const post = await prisma.apply.findFirst({
      where: { userId: +userId,
               applyId: +applyId,
       },
      select: {
        applyId: true,
        user: 
        { select : 
          {
            userInfos: {
              select: {
                name: true,
              },
           },
          }
        },
        title: true,
        content: true,
        state: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  
    return res.status(200).json({ data: post });
  });

  /** 이력서 수정 API **/
router.patch('/posts/:applyId', authMiddleware, async (req, res, next) => {
  const { userId } = req.user;
  const { applyId } = req.params;
  const { title, content } = req.body;

  const isExistApply = await prisma.apply.findFirst({
    where: {
        applyId: +applyId ,
    },
  })

  if(!title && !content){
      return res
      .status(403)
      .json({ message: "수정 할 정보를 입력해 주세요." })
  }

  if(content.length < 150){
    return res
      .status(403)
      .json({ message: "자기소개는 150자 이상 작성해야 합니다."})
  }

  if (!isExistApply) {
    return res
        .status(409)
        .json({ message: "이력서가 존재하지 않습니다." })
}

  const post = await prisma.apply.update({
    where: { userId: +userId,
             applyId: +applyId,
    },
    data: {
      title,
      content,
    },
  });

  return res.status(201).json({ data: post });
});

 /** 이력서 삭제 API **/
 router.delete('/posts/:applyId', authMiddleware, async (req, res, next) => {
  const { userId } = req.user;
  const { applyId } = req.params;

  const isExistApply = await prisma.apply.findFirst({
    where: {
        applyId: +applyId ,
    },
  })


  if (!isExistApply) {
    return res
        .status(409)
        .json({ message: "이력서가 존재하지 않습니다." })
  }

  const post = await prisma.apply.delete({
    where: { userId: +userId,
             applyId: +applyId,
    },
  });

  return res.status(201).json({ applyId: post.applyId });
});


export default router;