import rateLimit from "express-rate-limit";

const tooManyRequestsMsg = (action) => ({
  message: "Too many requests. Please try again later.",
  action,
});

const oneMinute = 60 * 1000;

export const loginLimiter = rateLimit({
  windowMs: oneMinute,
  max: 7,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequestsMsg("login"),
});

export const sendOtpLimiter = rateLimit({
  windowMs: oneMinute,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequestsMsg("send_otp"),
});

export const verifyLoginOtpLimiter = rateLimit({
  windowMs: oneMinute,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequestsMsg("verify_login_otp"),
});
