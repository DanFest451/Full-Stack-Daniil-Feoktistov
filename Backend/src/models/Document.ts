import mongoose, { Document as MDoc, Model, Schema, Types } from "mongoose";

export interface IDocument extends MDoc {
  title: string;
  content: string;

  owner: Types.ObjectId;
  editors: Types.ObjectId[];

  viewPublic: boolean;
  publicToken: string | null;

  lockedBy: Types.ObjectId | null;
  lockExpiresAt: Date | null;

  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    title: { type: String, required: true },
    content: { type: String, default: "" },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    editors: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    viewPublic: { type: Boolean, default: false },
    publicToken: { type: String, default: null },

    lockedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lockExpiresAt: { type: Date, default: null },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const DocumentModel: Model<IDocument> = mongoose.model<IDocument>("Document", documentSchema);
export default DocumentModel;
