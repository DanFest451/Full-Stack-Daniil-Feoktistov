import { Response } from "express";
import path from "path";
import mongoose from "mongoose";
import UploadModel from "../models/Upload";
import type { AuthRequest } from "../middleware/auth.middleware";

export async function listMyUploads(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });

    const items = await UploadModel.find({
      owner: req.userId,
      deletedAt: null,
    }).sort({ createdAt: -1 });

    return res.json(items);
  } catch {
    return res.status(500).json({ message: "Failed to fetch uploads." });
  }
}

export async function uploadImage(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });

    const file = req.file;

    // Serve under /uploads/<filename>
    const url = `/uploads/${file.filename}`;

    const created = await UploadModel.create({
      owner: new mongoose.Types.ObjectId(req.userId),
      originalName: file.originalname,
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      url,
      deletedAt: null,
    });

    return res.status(201).json(created);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ message: "Upload failed.", error: message });
  }
}

export async function deleteUpload(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized." });

    const { id } = req.params as { id: string };

    const item = await UploadModel.findOne({ _id: id, owner: req.userId, deletedAt: null });
    if (!item) return res.status(404).json({ message: "Upload not found." });

    item.deletedAt = new Date();
    await item.save();

    return res.json({ message: "Image moved to recycle bin." });
  } catch {
    return res.status(500).json({ message: "Failed to delete upload." });
  }
}
