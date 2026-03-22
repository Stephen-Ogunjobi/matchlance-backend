import path from "path";
import fs from "fs";
import multer from "multer";
import type { Request } from "express";
import type { FileFilterCallback } from "multer";

interface AuthenticatedRequest extends Request {
  user?: { userId?: string };
  params: Record<string, string>;
}

const uploadDir = "uploads/profile-pictures";

// Create the directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// save files to disk
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const userId = (req as AuthenticatedRequest).user?.userId || "unknown";

    const extension = path.extname(file.originalname).toLowerCase();

    const uniqueFilename = `user-${userId}-${Date.now()}${extension}`;

    cb(null, uniqueFilename);
  },
});

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  //define allowed file(MIME)type
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`Invalid file type`) as Error & { code: string };
    error.code = "INVALID_FILE_TYPE";

    cb(error);
  }
};

//multer instance configuration
export const upload = multer({
  storage: storage, //using diskStorage config

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: fileFilter,
});

export const deleteFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      resolve();
      return;
    }

    fs.unlink(filePath, (err) => {
      if (err) {
        console.log(`Error deleting file: ${filePath}`, err);
        reject(err);
      } else {
        console.log("Deleted old file");
        resolve();
      }
    });
  });
};

export const getFilePathFronUrl = (url: string): string => {
  return url.startsWith("/") ? url.slice(1) : url;
};

// proposal attachments config
const proposalAttachDir = "uploads/proposal-attachments";

if (!fs.existsSync(proposalAttachDir)) {
  fs.mkdirSync(proposalAttachDir, { recursive: true });
}

const proposalStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, proposalAttachDir);
  },

  filename: (req, file, cb) => {
    const userId = (req as AuthenticatedRequest).user?.userId || "unknown";
    const jobId = req.params?.["jobId"] || "unknown";

    const extension = path.extname(file.originalname).toLocaleLowerCase();

    const sanitizedOriginalname = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, "_");

    const uniqueFilename = `proposal-${userId}-${jobId}-${sanitizedOriginalname}-${Date.now()}${extension}`;

    cb(null, uniqueFilename);
  },
});

const proposalFileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "text/plain", // .txt
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`Invalid file`) as Error & { code: string };
    error.code = "INVALID_FILE_TYPE";
    cb(error);
  }
};

export const proposalAttachUpload = multer({
  storage: proposalStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: proposalFileFilter,
});
