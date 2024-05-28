// src/routes/users.router.js

import express from "express"
import { prisma } from "../utils/prisma/prisma.util.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import authMiddleware from "../middlewares/auth.middleware.js"
import { Prisma } from "@prisma/client"

const router = express.Router()

/** 사용자 회원가입 API 트랜잭션 **/
router.post("/sign-up", async (req, res, next) => {
    try {
        const { email, password, rePassword, name } = req.body
        const isExistUser = await prisma.users.findFirst({
            where: {
                email,
            },
        })
        const email_regex = new RegExp('[a-z0-9]+@[a-z]+\.[a-z]{2,3}');
        if(!email_regex.test(email)){
          return res
          .status(403)
          .json({ message: "이메일 형식이 올바르지 않습니다.”"})
        }

        if(password.length < 6){
          return res
          .status(403)
          .json({ message: "비밀번호는 6자리 이상이어야 합니다."})
        }

        if(!email || !password || !rePassword || !name){
          let str = "";
          if(!email) str = "이메일을";
          if(!password || !rePassword) str = "비밀번호를";
          if(!name)  str = "이름을";
          return res
          .status(403)
          .json({ message: `${str} 입력해주세요.` })
        }


        if(password !== rePassword){
          return res
          .status(403)
          .json({ message: "입력 한 두 비밀번호가 일치하지 않습니다." })
        }

        if (isExistUser) {
            return res
                .status(409)
                .json({ message: "이미 가입된 사용자입니다." })
        }

        // 사용자 비밀번호를 암호화합니다.
        const hashedPassword = await bcrypt.hash(password, 10)

        // MySQL과 연결된 Prisma 클라이언트를 통해 트랜잭션을 실행합니다.
        const [user, userInfo] = await prisma.$transaction(
            async (tx) => {
                // 트랜잭션 내부에서 사용자를 생성합니다.
                const user = await tx.users.create({
                    data: {
                        email,
                        password: hashedPassword, // 암호화된 비밀번호를 저장합니다.
                    },
                })

                // 트랜잭션 내부에서 사용자 정보를 생성합니다.
                const userInfo = await tx.userInfos.create({
                    data: {
                        userId: user.userId, // 생성한 유저의 userId를 바탕으로 사용자 정보를 생성합니다.
                        name,
                        role: "APPLICANT",
                    },
                })

                // 콜백 함수의 리턴값으로 사용자와 사용자 정보를 반환합니다.
                return [user, userInfo]
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
            }
        )
        return res.status(201).json({ userId : user.userId ,email: user.email, name:userInfo.name,  role:userInfo.role, createdAt:user.createdAt , updatedAt:user.updatedAt})
    } catch (err) {
        next(err)
    }
})


/** 로그인 API **/
router.post("/sign-in", async (req, res, next) => {
    try {
        const { email, password } = req.body
        const user = await prisma.users.findFirst({ where: { email } })

        const email_regex = new RegExp('[a-z0-9]+@[a-z]+\.[a-z]{2,3}');
        if(!email_regex.test(email)){
          return res
          .status(403)
          .json({ message: "이메일 형식이 올바르지 않습니다.”"})
        }

        if(!email || !password){
          let str = "";
          if(!email) str = "이메일을";
          if(!password) str = "비밀번호를";
          return res
          .status(403)
          .json({ message: `${str} 입력해주세요.` })
        }

        if (!user)
            return res
                .status(401)
                .json({ message: "인증 정보가 유효하지 않습니다." })
        // 입력받은 사용자의 비밀번호와 데이터베이스에 저장된 비밀번호를 비교합니다.
        else if (!(await bcrypt.compare(password, user.password)))
            return res
                .status(401)
                .json({ message: "인증 정보가 유효하지 않습니다." })

        // 로그인에 성공하면, 사용자의 userId를 바탕으로 토큰을 생성합니다.
        const token = jwt.sign(
            {
                userId: user.userId,
            },
            process.env.SESSION_SECRET_KEY
        )
         // authotization 쿠키에 Berer 토큰 형식으로 JWT를 저장합니다.
        res.cookie('authorization', `Bearer ${token}`);
        return res.status(200).json({ AccessToken : token })
    } catch (err) {
        next(err)
    }
})

/** 사용자 조회 API **/
router.get("/users", authMiddleware, async (req, res, next) => {
    const { userId } = req.user

    const user = await prisma.users.findFirst({
        where: { userId: +userId },
        select: {
            userId: true,
            email: true,
            createdAt: true,
            updatedAt: true,
            userInfos: {
                // 1:1 관계를 맺고있는 UserInfos 테이블을 조회합니다.
                select: {
                    name: true,
                    role: true,
                },
            },
        },
    })

    return res.status(200).json({ data: user })
})

/** 사용자 정보 변경 API **/
router.patch("/users/", authMiddleware, async (req, res, next) => {
    try {
        const { userId } = req.user
        const updatedData = req.body

        const userInfo = await prisma.userInfos.findFirst({
            where: { userId: +userId },
        })

        await prisma.$transaction(
            async (tx) => {
                // 트랜잭션 내부에서 사용자 정보를 수정합니다.
                await tx.userInfos.update({
                    data: {
                        ...updatedData,
                    },
                    where: {
                        userId: userInfo.userId,
                    },
                })

                // 변경된 필드만 UseHistories 테이블에 저장합니다.
                for (let key in updatedData) {
                    if (userInfo[key] !== updatedData[key]) {
                        await tx.userHistories.create({
                            data: {
                                userId: userInfo.userId,
                                changedField: key,
                                oldValue: String(userInfo[key]),
                                newValue: String(updatedData[key]),
                            },
                        })
                    }
                }
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
            }
        )

        return res
            .status(200)
            .json({ message: "사용자 정보 변경에 성공하였습니다." })
    } catch (err) {
        next(err)
    }
})

export default router
