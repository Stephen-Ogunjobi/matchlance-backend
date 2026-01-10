import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import User from "../models/users.js";
import { invalidateUserCached } from "../utils/userCache.js";

dotenv.config();

//setup google strategy with passport
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "",
      passReqToCallback: true, // Allow access to req in callback
    },
    async (req: any, _accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const firstName = profile.name?.givenName || "";
        const lastName = profile.name?.familyName || "";

        if (!email) {
          return done(new Error("Email not provided by Google"), false);
        }

        // Extract role from state parameter
        let role = "freelancer"; // default role
        if (req.query.state) {
          try {
            const decodedState = JSON.parse(
              Buffer.from(req.query.state, "base64").toString()
            );
            role = decodedState.role || "freelancer";
          } catch (err) {
            console.error("Error parsing state:", err);
          }
        }

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            email,
            firstName,
            lastName,
            googleId: profile.id,
            password: "",
            role: role,
          });
        } else {
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
            // Invalidate cache since googleId changed
            await invalidateUserCached(user._id.toString());
          }
        }
        return done(null, user);
      } catch (err) {
        return done(err as Error, false);
      }
    }
  )
);

// store only user ID in session
passport.serializeUser((user: any, done) => {
  done(null, user._id.toString());
});

// retrieve user from db
passport.deserializeUser(async (id: any, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err as Error, null);
  }
});
