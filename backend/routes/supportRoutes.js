const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
require("dotenv").config();

router.post("/ticket", async (req, res) => {
  const { name, email, issueCategory, message } = req.body;

  if (!message) {
    return res
      .status(400)
      .json({ message: "Inquiry message payload cannot be empty." });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SUPPORT_EMAIL,
        pass: process.env.SUPPORT_EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"${name} (via Support Portal)" <${process.env.SUPPORT_EMAIL}>`,
      to: process.env.SUPPORT_EMAIL,
      replyTo: email,
      subject: `[${issueCategory}] New Support Ticket from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #cbd5e1; padding: 20px; border-radius: 8px;">
          <h2 style="color: #0d8abc; border-bottom: 2px solid #0d8abc; padding-bottom: 10px;">New Help Desk Ticket</h2>
          <p><strong>Patient Name:</strong> ${name}</p>
          <p><strong>Registered Email:</strong> ${email}</p>
          <p><strong>Issue Category:</strong> <span style="background: #f0fdfa; color: #115e59; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${issueCategory}</span></p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; margin-top: 15px;">
            <p style="margin: 0; font-weight: bold; color: #475569; margin-bottom: 8px;">Message:</p>
            <p style="margin: 0; color: #0f172a; line-height: 1.6;">${message}</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res
      .status(200)
      .json({ message: "Support ticket email generated successfully." });
  } catch (err) {
    console.error("Support Mail Dispatch Failure:", err.message);
    return res.status(500).json({
      message: "Internal transactional mail failure.",
      error: err.message,
    });
  }
});

module.exports = router;
