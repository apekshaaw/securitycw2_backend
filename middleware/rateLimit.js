import rateLimit from "express-rate-limit";

// Common handler message 
const tooManyRequestsMsg = (action) => ({
  message: "Too many requests. Please try again later.",
  action,
});

// 2 request per minute per IP
const oneMinute = 60 * 1000;

export const loginLimiter = rateLimit({
  windowMs: oneMinute,
  max: 2,
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
