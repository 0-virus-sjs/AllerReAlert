declare namespace Express {
  interface Request {
    user?: import('../lib/jwt').JwtPayload
  }
}
