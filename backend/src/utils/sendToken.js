

const sendToken = (user, statusCode, message, res) => {
    const token = user.generateToken();

    const isProduction = process.env.NODE_ENV === "production"

    res
    .status(statusCode)
    .cookie("token", token, {
      expires: new Date(
        Date.now() +
          Number(process.env.COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000,
      ),
      httpOnly: true,
      secure: isProduction, // true only in production (HTTPS)
      sameSite: isProduction ? "none" : "lax", // none for production, lax for localhost
    })
    .json({
      success: true,
      user,
      message,
      token,
    });
}


module.exports = sendToken