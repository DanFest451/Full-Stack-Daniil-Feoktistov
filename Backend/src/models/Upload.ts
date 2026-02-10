import mongoose, { Document as MDoc, Model, Schema, Types } from "mongoose";

export interface IUpload extends MDoc {
  owner: Types.ObjectId;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const uploadSchema = new Schema<IUpload>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const UploadModel: Model<IUpload> = mongoose.model<IUpload>("Upload", uploadSchema);
export default UploadModel;
