import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
}

export default function auth(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    if (!header) {
      res.status(401).json({ message: "Missing Authorization header." });
      return;
    }

    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token) {
      res.status(401).json({
        message: "Invalid Authorization format. Use: Bearer <token>",
      });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ message: "JWT secret not configured." });
      return;
    }

    const payload = jwt.verify(token, secret) as JwtPayload & {
      userId?: string;
    };

    if (!payload.userId) {
      res.status(401).json({ message: "Invalid token payload." });
      return;
    }

    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token." });
  }
}
