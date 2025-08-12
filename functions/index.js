/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

const GMAIL_EMAIL = functions.config().gmail?.email;
const GMAIL_PASS = functions.config().gmail?.password;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_EMAIL,
    pass: GMAIL_PASS,
  },
});

async function getAnalystEmailFromUsers(analystName) {
  const snapshot = await admin
      .firestore()
      .collection("users")
      .where("name", "==", analystName)
      .limit(1)
      .get();

  if (!snapshot.empty) {
    return snapshot.docs[0].data().email;
  }
  return null;
}

exports.sendErrorNotification = functions.firestore
    .document("reports/{reportId}")
    .onCreate(async (snap) => {
      try {
        const data = snap.data();
        if (!data) return null;

        const analystName = data.analystName || "Analyst";
        const matchName = data.matchName || "Unknown match";
        const errorCount = Array.isArray(data.errors) ? data.errors.length : 0;

        let analystEmail = data.analystEmail || null;

        if (!analystEmail) {
          analystEmail = await getAnalystEmailFromUsers(analystName);
        }

        if (!analystEmail) {
          console.log("No email found for analyst:", analystName);
          return null;
        }

        const mailOptions = {
          from: GMAIL_EMAIL,
          to: analystEmail,
          subject: `Errors in match: ${matchName}`,
          text:
          `Hello ${analystName},\n\n` +
          `You have ${errorCount} error(s) in match: ${matchName}.\n\n` +
          `Regards,\nQC Team`,
        };

        await transporter.sendMail(mailOptions);
        console.log("Email sent to:", analystEmail, "for match:", matchName);
        return null;
      } catch (err) {
        console.error("sendErrorNotification error:", err);
        return null;
      }
    });
