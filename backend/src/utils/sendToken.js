

const sendToken = (user, statusCode, message, res) => {
    const token = user.generateToken();

    const isProduction = process.env.NODE_ENV === "production" || process.env.FRONTEND_URL?.includes("vercel.app");

    res
    .status(statusCode)
    .cookie("token", token, {
      expires: new Date(
        Date.now() +
          Number(process.env.COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000,
      ),
      httpOnly: true,
      secure: true, // Always true for cross-domain cookies in production
      sameSite: "none", // Required for cross-domain cookies (Vercel -> Render)
    })
    .json({
      success: true,
      user,
      message,
      token,
    });
}


module.exports = sendToken