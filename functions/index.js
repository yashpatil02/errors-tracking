const cors = require("cors")({ origin: true }); // ✅ Allow all origins
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

// 🔁 Toggle for Emulator vs Production
const useTestTransport = process.env.USE_TEST_TRANSPORT === 'true';

// 🛠 Email Transport Config
const transporter = useTestTransport
  ? nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true })
  : nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: functions.config().gmail.user,
        pass: functions.config().gmail.pass,
      },
    });

exports.sendOtp = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const { email, otp } = req.body;

    if (!email || !otp || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: "Valid email and OTP are required" });
    }

    const mailOptions = {
      from: useTestTransport ? "test@localhost" : functions.config().gmail.user,
      to: email,
      subject: "🔐 Your OTP Code",
      text: `Your OTP is ${otp}`,
    };

    try {
      await transporter.sendMail(mailOptions);

      await db.collection("otpCodes").doc(email).set({
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      if (useTestTransport) {
        console.log("Email simulated:", mailOptions);
      }

      res.status(200).json({ success: true, message: "OTP sent successfully!" });
    } catch (error) {
      console.error("Email error:", error);
      res.status(500).json({ success: false, message: "Failed to send OTP" });
    }
  });
});
