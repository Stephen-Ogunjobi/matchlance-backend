import type { Request, Response } from "express";
import mongoose from "mongoose";
import { ClientProfile } from "../models/client.js";
import User from "../models/users.js";
import {
  getCachedClientProfile,
  setClientCache,
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
