import { Router } from "express";
import auth from "../middleware/auth.middleware";
import {
  getMyDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  addEditorByEmail,
  removeEditorByEmail,
  enablePublicLink,
  acquireLock,
  renewLock,
  releaseLock,
  cloneDocument,
  getTrash,
  restoreDocument,
  deleteForever,
  emptyTrash,
} from "../controllers/document.controller";

const router = Router();

router.use(auth); // protect all document routes below
router.get("/", getMyDocuments);
router.post("/", createDocument);
router.put("/:id", updateDocument);
router.delete("/:id", deleteDocument);
router.post("/:id/editors", addEditorByEmail);
router.delete("/:id/editors", removeEditorByEmail);
router.post("/:id/public/enable", enablePublicLink);
router.post("/:id/lock", acquireLock);
router.post("/:id/lock/renew", renewLock);
router.delete("/:id/lock", releaseLock);
router.post("/:id/clone", cloneDocument);
router.get("/trash", getTrash);
router.post("/:id/restore", restoreDocument);
router.delete("/:id/forever", deleteForever);
router.delete("/trash/empty", emptyTrash);

export default router;
