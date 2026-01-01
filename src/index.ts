import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import connectDb from "./utils/db.js";
import authRoutes from "./routes/auth.js";
import jobRoutes from "./routes/job.js";
import freenlancerRoute from "./routes/freelancer.js";
import proposalRoutes from "./routes/proposal.js";
import chatRoutes from "./routes/chat.js";
import passport from "passport";
import cors from "cors";
import "./config/passport.js";
import { initializeSocket } from "./utils/socket.js";

dotenv.config();

const app = express();
const server = createServer(app);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());

// Serve uploaded files from /uploads directory
// Makes files accessible via: http://localhost:3001/uploads/...
app.use("/uploads", express.static("uploads"));

//session middleware configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true },
  })
);

app.use(passport.initialize());
//passport session integration
app.use(passport.session());

app.use("/api/auth", authRoutes);
app.use("/api/job", jobRoutes);
app.use("/api/freelancer", freenlancerRoute);
app.use("/api/proposal", proposalRoutes);
app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 3001;

initializeSocket(server);

connectDb().then(() => {
  server.listen(PORT, () => {
    console.log(`server running ${PORT}`);
  });
});
