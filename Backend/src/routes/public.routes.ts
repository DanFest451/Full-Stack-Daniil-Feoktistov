import { Router } from "express";
import { getPublicDocument } from "../controllers/document.controller";

const router = Router();

router.get("/:token", getPublicDocument);

export default router;
