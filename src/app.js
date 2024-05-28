// app.js

import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import LogMiddleware from './middlewares/log.middleware.js';
import ErrorHandlingMiddleware from './middlewares/error-handling.middleware.js';
import UsersRouter from './routes/users.router.js';
import PostsRouter from './routes/apply.router.js';
import CommentsRouter from './routes/comments.router.js';


// .env 파일을 읽어서 process.env에 추가합니다.
dotenv.config();

const app = express();
const PORT = 3018;

// 비밀 키는 외부에 노출되면 안되겠죠? 그렇기 때문에, .env 파일을 이용해 비밀 키를 관리해야합니다.
const ACCESS_TOKEN_SECRET_KEY = process.env.ACCESS_TOKEN_SECRET_KEY;
const REFRESH_TOKEN_SECRET_KEY = process.env.REFRESH_TOKEN_SECRET_KEY;

app.use(LogMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use('/api', [UsersRouter, PostsRouter, CommentsRouter]);
app.use(ErrorHandlingMiddleware);

app.get('/', (req, res) => {
  return res.status(200).send('Hello Token!'); 
});


let tokenStorage = {}; // Refresh Token을 저장할 객체

/** Access Token, Refresh Token 발급 API **/
app.post('/tokens', (req, res) => {
  const { id } = req.body;
  const accessToken = createAccessToken(id);
  const refreshToken = createRefreshToken(id);

  // Refresh Token을 가지고 해당 유저의 정보를 서버에 저장합니다.
  tokenStorage[refreshToken] = {
    id: id, // 사용자에게 전달받은 ID를 저장합니다.
    ip: req.ip, // 사용자의 IP 정보를 저장합니다.
    userAgent: req.headers['user-agent'], // 사용자의 User Agent 정보를 저장합니다.
  };

  res.cookie('accessToken', accessToken); // Access Token을 Cookie에 전달한다.
  res.cookie('refreshToken', refreshToken); // Refresh Token을 Cookie에 전달한다.

  return res
    .status(200)
    .json({ message: 'Token이 정상적으로 발급되었습니다.' });
});



app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});