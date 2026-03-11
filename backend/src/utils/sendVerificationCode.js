
const emailTemplate = require("./emailTemplate");
const sendEmail = require("./sendEmail");
const client = require("twilio")(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const sendVerificationCode = async (
  verificationCode,
  verificationMethod,
  email,
  phone,
) => {
 
  if (!verificationMethod) {
    throw new Error("Verification Method is required.");
  }

  if (verificationMethod === "email") {
    if (!email) {
      throw new Error("Email is required.");
    }

    const message = emailTemplate(verificationCode);

    sendEmail({ email, subject: "Your Verification Code is", message });

    return {
      success: true,
      message: `verification code has been sent successfully on ${email}`,
    };
  }

  if (verificationMethod === "phone") {
    if (!phone) {
      throw new Error("Phone number is required.");
    }

    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    const code = verificationCode.toString().split("").join(" ");

    await client.calls.create({
      twiml: `
        <Response>
          <Say>Your verification code is</Say>
          <Pause length="1"/>
          <Say>${code}</Say>
        </Response>
      `,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    return {
      success: true,
      message: "OTP sent via call",
    };
  }

  throw new Error("Invalid Verification Method");
};

module.exports = sendVerificationCode;
