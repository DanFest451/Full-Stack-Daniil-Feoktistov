import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth.routes";
import documentRoutes from "./routes/document.routes";
import publicRoutes from "./routes/public.routes";
import uploadRoutes from "./routes/upload.routes";
import auth from "./middleware/auth.middleware";

const app = express();

// CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Preflight handler
app.options(/.*/, cors());

// Body parser
app.use(express.json());

// Serve uploaded files
// Files will be accessible at http://localhost:5000/uploads/<filename>
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/public", publicRoutes);

// Upload routes
app.use("/api/uploads", uploadRoutes);

// Test routes
app.get("/api/test", (_req, res) => {
  res.json({ message: "Backend is working" });
});

app.get("/api/protected", auth, (req, res) => {
  res.json({ message: "You are authenticated", userId: req.userId });
});

// JSON error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : "Unknown error";
  return res.status(400).json({ message });
});

export default app;
