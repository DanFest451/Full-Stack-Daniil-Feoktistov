import { Response, Request } from "express";
import crypto from "crypto";
import DocumentModel, { IDocument } from "../models/Document";
import User from "../models/User";
import type { AuthRequest } from "../middleware/auth.middleware";
import mongoose from "mongoose";

const LOCK_TTL_MS = 60 * 1000; // 60 seconds

function lockIsActive(doc: IDocument): boolean {
  return !!(doc.lockedBy && doc.lockExpiresAt && doc.lockExpiresAt.getTime() > Date.now());
}

function hasAccess(doc: IDocument, userId: string): boolean {
  const isOwner = doc.owner.toString() === userId;
  const isEditor = doc.editors.map((e) => e.toString()).includes(userId);
  return isOwner || isEditor;
}

// Get all documents for logged-in user
export async function getMyDocuments(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });

    const docs = await DocumentModel.find({
      owner: req.userId,
      deletedAt: null, // Hide trashed documents
    }).sort({ updatedAt: -1 });

    return res.json(docs);
  } catch {
    return res.status(500).json({ message: "Failed to fetch documents." });
  }
}

// Create a document
export async function createDocument(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });

    const { title } = req.body as { title?: string };
    if (!title) {
      return res.status(400).json({ message: "Title is required." });
    }

    const doc = await DocumentModel.create({
      title,
      owner: new mongoose.Types.ObjectId(req.userId),
    });

    return res.status(201).json(doc);
  } catch {
    return res.status(500).json({ message: "Failed to create document." });
  }
}

// Update a document
export async function updateDocument(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });

    const { id } = req.params as { id: string };
    const { title, content } = req.body as { title?: string; content?: string };

    const doc = await DocumentModel.findById(id);
    if (!doc || doc.deletedAt) return res.status(404).json({ message: "Document not found." });

    if (!hasAccess(doc, req.userId)) {
      return res.status(403).json({ message: "No permission to edit this document." });
    }

    if (!lockIsActive(doc) || doc.lockedBy?.toString() !== req.userId) {
      return res.status(423).json({
        message: "You must acquire the lock before editing.",
        lockedBy: doc.lockedBy,
        lockExpiresAt: doc.lockExpiresAt,
      });
    }

    if (title !== undefined) doc.title = title;
    if (content !== undefined) doc.content = content;

    await doc.save();
    return res.json(doc);
  } catch {
    return res.status(500).json({ message: "Failed to update document." });
  }
}

// Delete a document
export async function deleteDocument(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });

    const { id } = req.params as { id: string };

    const doc = await DocumentModel.findOne({ _id: id, owner: req.userId });
    if (!doc || doc.deletedAt) {
      return res.status(404).json({ message: "Document not found." });
    }

    // Soft delete (recycle bin)
    doc.deletedAt = new Date();
    doc.viewPublic = false;
    doc.publicToken = null;
    doc.lockedBy = null;
    doc.lockExpiresAt = null;

    await doc.save();
    return res.json({ message: "Document moved to recycle bin." });
  } catch {
    return res.status(500).json({ message: "Failed to delete document." });
  }
}

// Only for owner: add an editor by email
export async function addEditorByEmail(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });

    const { id } = req.params as { id: string };
    const { email } = req.body as { email?: string };

    if (!email) return res.status(400).json({ message: "Email is required." });

    const doc = await DocumentModel.findOne({ _id: id, owner: req.userId, deletedAt: null });
    if (!doc) return res.status(404).json({ message: "Document not found (or not owner)." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: "User with that email not found." });

    if (user._id.toString() === doc.owner.toString()) {
      return res.status(400).json({ message: "Owner already has edit access." });
    }

    const already = doc.editors.map((e) => e.toString()).includes(user._id.toString());
    if (!already) doc.editors.push(user._id);

    await doc.save();
    return res.json({ message: "Editor added.", editors: doc.editors });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ message: "Failed to add editor.", error: message });
  }
}

// Only for owner: remove an editor by email
export async function removeEditorByEmail(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });

    const { id } = req.params as { id: string };
    const { email } = req.body as { email?: string };

    if (!email) return res.status(400).json({ message: "Email is required." });

    const doc = await DocumentModel.findOne({ _id: id, owner: req.userId, deletedAt: null });
    if (!doc) return res.status(404).json({ message: "Document not found (or not owner)." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: "User with that email not found." });

    doc.editors = doc.editors.filter((e) => e.toString() !== user._id.toString());

    await doc.save();
    return res.json({ message: "Editor removed.", editors: doc.editors });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ message: "Failed to remove editor.", error: message });
  }
}

// For owner only: enable public view link
export async function enablePublicLink(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });

    const { id } = req.params as { id: string };

    const doc = await DocumentModel.findOne({ _id: id, owner: req.userId, deletedAt: null });
    if (!doc) return res.status(404).json({ message: "Document not found (or not owner)." });

    if (!doc.publicToken) {
      doc.publicToken = crypto.randomBytes(24).toString("hex");
    }
    doc.viewPublic = true;

    await doc.save();
    return res.json({
      message: "Public link enabled.",
      publicUrl: `/api/public/${doc.publicToken}`,
      token: doc.publicToken,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ message: "Failed to enable public link.", error: message });
  }
}

// Public (doesn't require auth): view document by token
export async function getPublicDocument(req: Request, res: Response) {
  try {
    const { token } = req.params as { token: string };

    const doc = await DocumentModel.findOne({
      publicToken: token,
      viewPublic: true,
      deletedAt: null,
    });

    if (!doc) return res.status(404).json({ message: "Public document not found." });
    // return read-only fields
    return res.json({
      title: doc.title,
      content: doc.content,
      updatedAt: doc.updatedAt,
    });
  } catch {
    return res.status(500).json({ message: "Failed to fetch public document." });
  }
}

// Acquire lock (owner/editor)
export async function acquireLock(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });
    const { id } = req.params as { id: string };

    const doc = await DocumentModel.findById(id);
    if (!doc || doc.deletedAt) return res.status(404).json({ message: "Document not found." });

    if (!hasAccess(doc, req.userId)) {
      return res.status(403).json({ message: "No permission to edit this document." });
    }

    if (lockIsActive(doc) && doc.lockedBy?.toString() !== req.userId) {
      return res.status(423).json({
        message: "Document is currently being edited by another user.",
        lockedBy: doc.lockedBy,
        lockExpiresAt: doc.lockExpiresAt,
      });
    }

    doc.lockedBy = new mongoose.Types.ObjectId(req.userId);
    doc.lockExpiresAt = new Date(Date.now() + LOCK_TTL_MS);
    await doc.save();

    return res.json({
      message: "Lock acquired.",
      lockedBy: doc.lockedBy,
      lockExpiresAt: doc.lockExpiresAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ message: "Failed to acquire lock.", error: message });
  }
}

// Renew lock
export async function renewLock(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });
    const { id } = req.params as { id: string };

    const doc = await DocumentModel.findById(id);
    if (!doc || doc.deletedAt) return res.status(404).json({ message: "Document not found." });

    if (!lockIsActive(doc) || doc.lockedBy?.toString() !== req.userId) {
      return res.status(409).json({ message: "You do not hold an active lock." });
    }

    doc.lockExpiresAt = new Date(Date.now() + LOCK_TTL_MS);
    await doc.save();

    return res.json({ message: "Lock renewed.", lockExpiresAt: doc.lockExpiresAt });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ message: "Failed to renew lock.", error: message });
  }
}

// Create a clone of a document
export async function cloneDocument(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });

    const { id } = req.params as { id: string };

    const doc = await DocumentModel.findById(id);
    if (!doc || doc.deletedAt) return res.status(404).json({ message: "Document not found." });

    if (!hasAccess(doc, req.userId)) {
      return res.status(403).json({ message: "No access to clone this document." });
    }

    const cloned = await DocumentModel.create({
      title: `${doc.title} (copy)`,
      content: doc.content || "",
      owner: new mongoose.Types.ObjectId(req.userId), // cloner becomes owner (safest)
      editors: [],
      viewPublic: false,
      publicToken: null,
      lockedBy: null,
      lockExpiresAt: null,
      deletedAt: null,
    });

    return res.status(201).json(cloned);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ message: "Failed to clone document.", error: message });
  }
}

// Release lock when leaving editor
export async function releaseLock(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });
    const { id } = req.params as { id: string };

    const doc = await DocumentModel.findById(id);
    if (!doc || doc.deletedAt) return res.status(404).json({ message: "Document not found." });

    if (doc.lockedBy?.toString() !== req.userId) {
      return res.status(403).json({ message: "You do not hold the lock." });
    }

    doc.lockedBy = null;
    doc.lockExpiresAt = null;
    await doc.save();

    return res.json({ message: "Lock released." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ message: "Failed to release lock.", error: message });
  }
}

// List trashed documents
export async function getTrash(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });

    const docs = await DocumentModel.find({
      owner: req.userId,
      deletedAt: { $ne: null },
    }).sort({ deletedAt: -1 });

    return res.json(docs);
  } catch {
    return res.status(500).json({ message: "Failed to fetch recycle bin." });
  }
}

// Restore from trash
export async function restoreDocument(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });

    const { id } = req.params as { id: string };

    const doc = await DocumentModel.findOne({ _id: id, owner: req.userId });
    if (!doc) return res.status(404).json({ message: "Document not found." });

    doc.deletedAt = null;
    await doc.save();

    return res.json({ message: "Document restored." });
  } catch {
    return res.status(500).json({ message: "Failed to restore document." });
  }
}

// Permanently delete
export async function deleteForever(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });

    const { id } = req.params as { id: string };

    const doc = await DocumentModel.findOneAndDelete({
      _id: id,
      owner: req.userId,
      deletedAt: { $ne: null },
    });

    if (!doc) return res.status(404).json({ message: "Document not found in recycle bin." });

    return res.json({ message: "Document permanently deleted." });
  } catch {
    return res.status(500).json({ message: "Failed to permanently delete document." });
  }
}

// Empty trash
export async function emptyTrash(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });

    const result = await DocumentModel.deleteMany({
      owner: req.userId,
      deletedAt: { $ne: null },
    });

    return res.json({ message: "Recycle bin emptied.", deletedCount: result.deletedCount });
  } catch {
    return res.status(500).json({ message: "Failed to empty recycle bin." });
  }
}
