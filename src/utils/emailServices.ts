import sgMail from "@sendgrid/mail";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@matchlance.com";
const FROM_NAME = process.env.SENDGRID_FROM_NAME || "Matchlance";

export const generateToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const sendVerificationEmail = async (
  email: string,
  firstName: string,
  token: string
) => {
  const verifyUrl = `${process.env.FRONTEND_VERIFY_URL}?token=${token}`;

  const msg = {
    to: email,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: "Verify Your Email",
    text: `Hi ${firstName}, \n\nWellcome! Please verify your email by clicking the link below:\n\n${verifyUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, please ignore this email.`,
    html: `
    <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #4F46E5; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Welcome to Matchlance, ${firstName}!</h2>
            <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
            <a href="${verifyUrl}" class="button">Verify Email</a>
            <p>Or copy and paste this link into your browser:</p>
            <p>${verifyUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <div class="footer">
              <p>If you didn't create an account, please ignore this email.</p>
            </div>
          </div>
        </body>
      </html>

    `,
  };
  try {
    await sgMail.send(msg);
    console.log(`Verification email sent to ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error("SendGrid verification email error:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    return { success: false, error };
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  firstName: string,
  token: string
) => {
  const resetUrl = `${process.env.FRONTEND_RESET_PASSWORD_URL}?token=${token}`;

  const msg = {
    to: email,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: "Reset Your Password - Matchlance",
    text: `Hi ${firstName},\n\nYou requested to reset your password. Click the link below to reset it:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request a password reset, please ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #DC2626; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Password Reset Request</h2>
            <p>Hi ${firstName},</p>
            <p>You requested to reset your password. Click the button below to create a new password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p>${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <div class="footer">
              <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
  try {
    await sgMail.send(msg);
    console.log(`Password reset email sent to ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error("SendGrid reset email error:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    return { success: false, error };
  }
};

export const sendProposalNotificationEmail = async (
  email: string,
  firstName: string,
  jobTitle: string,
  freelancerName: string,
  proposalDetails: any
) => {
  const proposalUrl = `${process.env.FRONTEND_PROPOSAL_URL}`;

  // Extract proposal details
  const budget = proposalDetails.proposedBudget
    ? `$${proposalDetails.proposedBudget}`
    : "Not specified";
  const estimatedTime = proposalDetails.estimatedTime || "Not specified";
  const coverLetterPreview = proposalDetails.coverLetter
    ? proposalDetails.coverLetter.substring(0, 150) + "..."
    : "No cover letter provided";

  const msg = {
    to: email,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: `New Proposal Received for "${jobTitle}"`,
    text: `Hi ${firstName},\n\nGood news! You've received a new proposal for your job "${jobTitle}".\n\nFreelancer: ${freelancerName}\nProposed Budget: ${budget}\nEstimated Time: ${estimatedTime}\n\nCover Letter Preview:\n${coverLetterPreview}\n\nClick the link below to view the full proposal and freelancer profile:\n${proposalUrl}\n\nBest regards,\nThe Matchlance Team`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
            .job-title { color: #4F46E5; font-size: 18px; font-weight: bold; margin: 10px 0; }
            .proposal-card {
              background-color: white;
              border-left: 4px solid #4F46E5;
              padding: 20px;
              margin: 20px 0;
              border-radius: 5px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .detail-row {
              margin: 10px 0;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-label {
              font-weight: bold;
              color: #6b7280;
              display: inline-block;
              width: 140px;
            }
            .detail-value { color: #111827; }
            .cover-letter {
              background-color: #f3f4f6;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
              font-style: italic;
              color: #4b5563;
            }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background-color: #4F46E5;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
              text-align: center;
            }
            .button:hover { background-color: #4338ca; }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">New Proposal Received!</h2>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              <p>Great news! You've received a new proposal for your job posting:</p>
              <div class="job-title">"${jobTitle}"</div>

              <div class="proposal-card">
                <h3 style="margin-top: 0; color: #111827;">Proposal Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Freelancer:</span>
                  <span class="detail-value">${freelancerName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Proposed Budget:</span>
                  <span class="detail-value">${budget}</span>
                </div>
                <div class="detail-row" style="border-bottom: none;">
                  <span class="detail-label">Estimated Time:</span>
                  <span class="detail-value">${estimatedTime}</span>
                </div>

                <h4 style="margin-top: 20px; color: #374151;">Cover Letter Preview:</h4>
                <div class="cover-letter">
                  "${coverLetterPreview}"
                </div>
              </div>

              <p style="text-align: center;">
                <a href="${proposalUrl}" class="button">View Full Proposal</a>
              </p>

              <p style="font-size: 14px; color: #6b7280;">
                Review the complete proposal, check the freelancer's profile, and decide if they're the right fit for your project.
              </p>

              <div class="footer">
                <p><strong>Matchlance</strong> - Connecting Clients with Top Freelancers</p>
                <p>You're receiving this email because you posted a job on Matchlance.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(
      `Proposal notification email sent to ${email} for job "${jobTitle}"`
    );
    return { success: true };
  } catch (error: any) {
    console.error("SendGrid proposal email error:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    return { success: false, error };
  }
};

export const sendProposalAcceptanceEmail = async (
  email: string,
  freelancerName: string,
  jobTitle: string,
  clientName: string,
  proposalDetails: any
) => {
  const projectUrl = `${
    process.env.FRONTEND_PROJECT_URL || process.env.FRONTEND_URL
  }`;

  // Extract proposal details
  const budget = proposalDetails.proposedBudget
    ? `$${proposalDetails.proposedBudget.min} - $${proposalDetails.proposedBudget.max}`
    : "Not specified";
  const estimatedTime = proposalDetails.estimatedTime || "Not specified";

  const msg = {
    to: email,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: `Congratulations! Your Proposal for "${jobTitle}" Has Been Accepted`,
    text: `Hi ${freelancerName},\n\nCongratulations! Your proposal for "${jobTitle}" has been accepted.\n\nYour Proposal Details:\nProposed Budget: ${budget}\nEstimated Time: ${estimatedTime}\n\nNext Steps:\n1. Review the project details and confirm your availability\n2. Reach out to ${clientName} to discuss project kickoff\n3. Set up milestones and deliverables\n4. Start working on the project\n\nClick the link below to view the project and get started:\n${projectUrl}\n\nGood luck with your project!\n\nBest regards,\nThe Matchlance Team`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
            .celebration { font-size: 48px; text-align: center; margin: 10px 0; }
            .job-title {
              color: #10b981;
              font-size: 20px;
              font-weight: bold;
              margin: 15px 0;
              text-align: center;
            }
            .info-card {
              background-color: white;
              border-left: 4px solid #10b981;
              padding: 20px;
              margin: 20px 0;
              border-radius: 5px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .detail-row {
              margin: 12px 0;
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-label {
              font-weight: bold;
              color: #6b7280;
              display: inline-block;
              width: 150px;
            }
            .detail-value {
              color: #111827;
              font-weight: 500;
            }
            .next-steps {
              background-color: #ecfdf5;
              border: 1px solid #10b981;
              padding: 20px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .next-steps h3 {
              color: #059669;
              margin-top: 0;
            }
            .next-steps ol {
              margin: 10px 0;
              padding-left: 20px;
            }
            .next-steps li {
              margin: 8px 0;
              color: #065f46;
            }
            .button {
              display: inline-block;
              padding: 16px 32px;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
              text-align: center;
              box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
            }
            .button:hover {
              background: linear-gradient(135deg, #059669 0%, #047857 100%);
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="celebration">🎉</div>
              <h2 style="margin: 10px 0 0 0;">Congratulations!</h2>
              <p style="margin: 5px 0 0 0; font-size: 16px;">Your proposal has been accepted</p>
            </div>
            <div class="content">
              <p>Hi ${freelancerName},</p>
              <p style="font-size: 16px; color: #059669; font-weight: 500;">
                Great news! ${clientName} has accepted your proposal for:
              </p>
              <div class="job-title">"${jobTitle}"</div>

              <div class="info-card">
                <h3 style="margin-top: 0; color: #111827;">Your Proposal Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Client:</span>
                  <span class="detail-value">${clientName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Your Proposed Budget:</span>
                  <span class="detail-value">${budget}</span>
                </div>
                <div class="detail-row" style="border-bottom: none;">
                  <span class="detail-label">Estimated Timeline:</span>
                  <span class="detail-value">${estimatedTime}</span>
                </div>
              </div>

              <div class="next-steps">
                <h3>Next Steps</h3>
                <ol>
                  <li>Review the project details and confirm your availability</li>
                  <li>Reach out to ${clientName} to discuss project kickoff</li>
                  <li>Set up clear milestones and deliverables</li>
                  <li>Start working on the project and deliver exceptional work</li>
                </ol>
              </div>

              <p style="text-align: center;">
                <a href="${projectUrl}" class="button">View Project Details</a>
              </p>

              <p style="font-size: 14px; color: #6b7280; text-align: center;">
                We wish you success with this project. Show them what you're made of!
              </p>

              <div class="footer">
                <p><strong>Matchlance</strong> - Connecting Clients with Top Freelancers</p>
                <p>Questions? Reply to this email or contact our support team.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(
      `Proposal acceptance email sent to ${email} for job "${jobTitle}"`
    );
    return { success: true };
  } catch (error: any) {
    console.error("SendGrid proposal acceptance email error:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    return { success: false, error };
  }
};

export const sendFreelancerHiredEmail = async (
  email: string,
  freelancerName: string,
  clientName: string,
  jobTitle: string,
  contractDetails: any
) => {
  const contractUrl = `${
    process.env.FRONTEND_CONTRACT_URL || process.env.FRONTEND_URL
  }/contracts/${contractDetails._id}`;

  // Extract contract details
  const budget =
    contractDetails.budget.type === "fixed"
      ? `$${contractDetails.budget.amount} (Fixed Price)`
      : `$${contractDetails.budget.amount}/hour`;
  const startDate = new Date(contractDetails.duration.startDate).toLocaleDateString();

  const msg = {
    to: email,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: `🎉 You're Hired! ${clientName} wants to work with you`,
    text: `Hi ${freelancerName},\n\nCongratulations! ${clientName} has chosen you for their project "${jobTitle}".\n\nProject: ${jobTitle}\nBudget: ${budget}\nStart Date: ${startDate}\n\nWhat's Next:\n1. Review the project details\n2. Connect with ${clientName} to discuss the work\n3. Start delivering amazing results!\n\nView your new project:\n${contractUrl}\n\nLet's make this project a success!\n\nBest regards,\nThe Matchlance Team`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header {
              background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
              color: white;
              padding: 40px 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
            .celebration { font-size: 60px; text-align: center; margin: 10px 0; }
            .job-title {
              color: #7c3aed;
              font-size: 22px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
              padding: 15px;
              background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
              border-radius: 5px;
            }
            .info-card {
              background-color: white;
              border-left: 4px solid #7c3aed;
              padding: 25px;
              margin: 25px 0;
              border-radius: 5px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .detail-row {
              margin: 15px 0;
              padding: 12px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: bold;
              color: #6b7280;
              display: inline-block;
              width: 120px;
            }
            .detail-value {
              color: #111827;
              font-weight: 500;
            }
            .next-steps {
              background-color: #faf5ff;
              border: 2px solid #7c3aed;
              padding: 25px;
              border-radius: 5px;
              margin: 25px 0;
            }
            .next-steps h3 {
              color: #5b21b6;
              margin-top: 0;
            }
            .next-steps ol {
              margin: 10px 0;
              padding-left: 25px;
            }
            .next-steps li {
              margin: 10px 0;
              color: #6b21a8;
              font-size: 15px;
            }
            .button {
              display: inline-block;
              padding: 18px 40px;
              background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 25px 0;
              font-weight: bold;
              text-align: center;
              font-size: 16px;
              box-shadow: 0 4px 6px rgba(124, 58, 237, 0.3);
            }
            .button:hover {
              background: linear-gradient(135deg, #5b21b6 0%, #4c1d95 100%);
            }
            .highlight-box {
              background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
              border: 2px solid #7c3aed;
              padding: 20px;
              border-radius: 5px;
              margin: 20px 0;
              text-align: center;
            }
            .highlight-box p {
              margin: 5px 0;
              color: #5b21b6;
              font-weight: bold;
              font-size: 18px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="celebration">🎉</div>
              <h1 style="margin: 10px 0; font-size: 32px;">You're Hired!</h1>
              <p style="margin: 10px 0; font-size: 18px;">${clientName} wants to work with you</p>
            </div>
            <div class="content">
              <p style="font-size: 18px;">Hi ${freelancerName},</p>
              <div class="highlight-box">
                <p>🚀 Time to showcase your skills!</p>
              </div>
              <p style="font-size: 16px; color: #5b21b6; font-weight: 500;">
                Great news! ${clientName} was impressed with your proposal and has chosen you for:
              </p>
              <div class="job-title">"${jobTitle}"</div>

              <div class="info-card">
                <h3 style="margin-top: 0; color: #111827; font-size: 20px;">Project Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Client:</span>
                  <span class="detail-value">${clientName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Budget:</span>
                  <span class="detail-value">${budget}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Start Date:</span>
                  <span class="detail-value">${startDate}</span>
                </div>
              </div>

              <div class="next-steps">
                <h3>What's Next?</h3>
                <ol>
                  <li>Review the project details and requirements</li>
                  <li>Connect with ${clientName} to discuss deliverables</li>
                  <li>Start working and deliver exceptional results!</li>
                </ol>
              </div>

              <p style="text-align: center;">
                <a href="${contractUrl}" class="button">View Project & Get Started</a>
              </p>

              <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 20px;">
                This is your chance to build a great working relationship. Show ${clientName} what you're capable of!
              </p>

              <div class="footer">
                <p><strong>Matchlance</strong> - Connecting Clients with Top Freelancers</p>
                <p>Need help? We're here to support you.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(
      `Freelancer hired email sent to ${email} for project "${jobTitle}"`
    );
    return { success: true };
  } catch (error: any) {
    console.error("SendGrid freelancer hired email error:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    return { success: false, error };
  }
};
