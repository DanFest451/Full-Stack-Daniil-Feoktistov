import express, { Request, Response } from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import documentRoutes from "./routes/document.routes";
import publicRoutes from "./routes/public.routes";
import auth from "./middleware/auth.middleware";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options(/.*/, cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/public", publicRoutes);

app.get("/api/test", (_req: Request, res: Response) => {
  res.json({ message: "Backend is working" });
});

app.get("/api/protected", auth, (req: Request, res: Response) => {
  const userId = (req as unknown as { userId?: string }).userId;
  res.json({ message: "You are authenticated", userId });
});

export default app;
