export type UserDTO = {
  id: string;
  email?: string;
};

export type AuthResponse = {
  token: string;
  user?: UserDTO;
};

export type DocumentDTO = {
  _id: string;
  title: string;
  content: string;
  owner: string;
  editors: string[];
  createdAt: string;
  updatedAt: string;

  viewPublic?: boolean;
  publicToken?: string | null;
  deletedAt?: string | null;
};

export type PublicDocDTO = {
  title: string;
  content: string;
  updatedAt: string;
};

export type UploadDTO = {
  _id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  updatedAt: string;
};
