import type { Request, Response } from "express";
import mongoose from "mongoose";
import { ClientProfile } from "../models/client.js";
import User from "../models/users.js";
import { deleteFile, getFilePathFronUrl } from "../config/upload.js";
import {
  getCachedClientProfile,
  setClientCache,
  invalidateClientCache,
  type CachedClientProfile,
} from "../utils/clientCache.js";

export const postClientProfile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const clientId = new mongoose.Types.ObjectId(req.params.clientId);

    const { bio, company, location, hiringPreferences, preferredCurrency } =
      req.body;

    const user = await User.findById(clientId);

    if (!user) {
      return res.status(400).json({ error: "Invalid request" });
    }

    if (user.role !== "client") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const existingProfile = await ClientProfile.findOne({ clientId });
    if (existingProfile) {
      return res.status(409).json({ error: "Profile already exists" });
    }

    const newProfile = await ClientProfile.create({
      clientId,
      bio,
      company,
      location,
      hiringPreferences,
      preferredCurrency,
    });

    await setClientCache(newProfile.toObject() as unknown as CachedClientProfile);

    return res.status(201).json({ message: "Profile created" });
  } catch (err) {
    console.error("Error creating client profile:", err);
    return res.status(500).json({
      error: "Error creating profile",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getClientProfile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const clientId = req.params.clientId;

    if (!clientId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const cachedProfile = await getCachedClientProfile(clientId);
    if (cachedProfile) {
      return res.status(200).json({ clientProfile: cachedProfile });
    }

    const profile = await ClientProfile.findOne({ clientId });
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    await setClientCache(profile.toObject() as unknown as CachedClientProfile);

    return res.status(200).json({ clientProfile: profile });
  } catch (err) {
    console.error("Error fetching client profile:", err);
    return res.status(500).json({ error: "Error fetching profile" });
  }
};

export const updateClientProfile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const clientId = req.params.clientId;

    if (!userId || !clientId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    if (userId.toString() !== clientId.toString()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { bio, company, location, hiringPreferences, preferredCurrency } =
      req.body;

    const updates = Object.fromEntries(
      Object.entries({
        bio,
        company,
        location,
        hiringPreferences,
        preferredCurrency,
      }).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const updatedProfile = await ClientProfile.findOneAndUpdate(
      { clientId },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    await setClientCache(
      updatedProfile.toObject() as unknown as CachedClientProfile
    );

    return res.status(200).json({
      message: "Profile updated successfully",
      profile: updatedProfile,
    });
  } catch (err) {
    console.error("Error updating client profile:", err);
    return res.status(500).json({
      error: "Error updating profile",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

export const deleteClientProfile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const clientId = req.params.clientId;

    if (!userId || !clientId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    if (userId.toString() !== clientId.toString()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const deleted = await ClientProfile.findOneAndDelete({ clientId });

    if (!deleted) {
      return res.status(404).json({ error: "Profile not found" });
    }

    await invalidateClientCache(clientId);

    return res.status(200).json({ message: "Profile deleted successfully" });
  } catch (err) {
    console.error("Error deleting client profile:", err);
    return res.status(500).json({ error: "Error deleting profile" });
  }
};

export const uploadClientProfilePicture = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.user?.userId;
    const clientId = req.params.clientId;

    if (!userId || !clientId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    if (userId.toString() !== clientId.toString()) {
      await deleteFile(req.file.path);
      return res.status(403).json({ error: "Forbidden" });
    }

    const profile = await ClientProfile.findOne({ clientId });

    if (!profile) {
      await deleteFile(req.file.path);
      return res.status(404).json({ error: "Profile not found" });
    }

    if (profile.profilePicture) {
      try {
        const oldFilePath = getFilePathFronUrl(profile.profilePicture);
        await deleteFile(oldFilePath);
      } catch (err) {
        console.log("Failed to delete old profile picture:", err);
      }
    }

    const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;

    // Recalculate completeness manually since findOneAndUpdate bypasses pre("save")
    let completeness = 0;
    if (profile.location?.country && profile.location?.timezone) completeness += 20;
    completeness += 20; // profile picture is being set now
    if (profile.bio) completeness += 20;
    if (profile.company?.name || profile.company?.industry) completeness += 20;
    if (profile.hiringPreferences?.categories?.length > 0) completeness += 20;

    const updatedProfile = await ClientProfile.findOneAndUpdate(
      { clientId },
      { profilePicture: profilePictureUrl, profileCompleteness: completeness },
      { new: true, runValidators: true }
    );

    if (updatedProfile) {
      await setClientCache(
        updatedProfile.toObject() as unknown as CachedClientProfile
      );
    }

    return res.status(200).json({
      message: "Profile picture uploaded successfully",
      profilePicture: profilePictureUrl,
      profile: updatedProfile,
    });
  } catch (err) {
    console.error("Error uploading client profile picture:", err);

    if (req.file) {
      try {
        await deleteFile(req.file.path);
      } catch (deleteErr) {
        console.error("Failed to cleanup uploaded file:", deleteErr);
      }
    }

    return res.status(500).json({ error: "Error uploading profile picture" });
  }
};
