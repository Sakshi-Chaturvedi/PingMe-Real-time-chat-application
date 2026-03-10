// require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmail = async ({ email, subject, message }) => {
  try {
    const sendSmtpEmail = {
      sender: {
        email: "whoizsakshi@gmail.com",
        name: "PingMe",
      },
      to: [
        {
          email: email,
        },
      ],
      subject: subject,
      htmlContent: message,
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("Email sent successfully ✅");
  } catch (error) {
    console.error("Email failed ❌", error.response?.body || error.message);
    throw new Error("Email sending failed");
  }
};

module.exports = sendEmail;