import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import auth from "../middleware/auth.middleware";
import { listMyUploads, uploadImage, deleteUpload } from "../controllers/upload.controller";

const router = Router();

// Store in <Backend>/uploads (project root/Backend/uploads)
const uploadDir = path.join(process.cwd(), "uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString("hex") + ext;
    cb(null, name);
  },
});

function imageOnlyFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype);
  if (!ok) return cb(new Error("Only image uploads are allowed (jpg/png/webp/gif)."));
  cb(null, true);
}

const uploader = multer({
  storage,
  fileFilter: imageOnlyFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.use(auth);

router.get("/", listMyUploads);
router.post("/", uploader.single("file"), uploadImage);
router.delete("/:id", deleteUpload);

export default router;
