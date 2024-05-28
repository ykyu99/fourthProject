// src/middlewares/error-handling.middleware.js

import winston from "winston";

const logger = winston.createLogger({
  level: "error", // 로그 레벨을 'info'로 설정합니다.
  format: winston.format.json(), // 로그 포맷을 JSON 형식으로 설정합니다.
  transports: [
    new winston.transports.Console(), // 로그를 콘솔에 출력합니다.
  ],
});

export default function (err, req, res, next) {

  // 클라이언트의 요청이 시작된 시간을 기록합니다.
  const start = new Date().getTime();

  // 응답이 완료되면 로그를 기록합니다.
  res.on("finish", () => {
    const duration = new Date().getTime() - start;
    logger.error(
      `Method: ${req.method}, URL: ${req.url}, Status: ${res.statusCode}, Duration: ${duration}ms, err: ${err}`
    );
  });
  // 에러를 출력합니다.
  console.error(err);

  // 클라이언트에게 에러 메시지를 전달합니다.
  res.status(500).json({ errorMessage: "서버 내부 에러가 발생했습니다." });
}
