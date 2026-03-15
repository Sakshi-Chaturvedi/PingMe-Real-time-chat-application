import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiUser, FiMail, FiLock, FiPhone, FiUserPlus } from "react-icons/fi";
import "./Auth.css";

export default function Register() {
  const [step, setStep] = useState(1); // 1 = register, 2 = verify OTP
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    phone: "",
    verificationMethod: "email",
  });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, verify } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register(formData);
      if (data.success) {
        toast.success(data.message);
        setStep(2);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await verify({
        email: formData.email,
        phone: formData.phone,
        otp,
      });
      if (data.success) {
        toast.success("Account verified!");
        navigate("/chat");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>PingMe</h1>
          <p>{step === 1 ? "Create your account" : "Verify your account"}</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="input-group">
              <FiUser className="input-icon" />
              <input
                id="reg-username"
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
              />
            </div>
            <div className="input-group">
              <FiMail className="input-icon" />
              <input
                id="reg-email"
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
            <div className="input-group">
              <FiLock className="input-icon" />
              <input
                id="reg-password"
                type="password"
                placeholder="Password (min 6 chars)"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={6}
              />
            </div>
            <div className="input-group">
              <FiPhone className="input-icon" />
              <input
                id="reg-phone"
                type="tel"
                placeholder="Phone (10 digits)"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
                pattern="[0-9]{10}"
              />
            </div>
            <div className="verification-method">
              <label>
                <input
                  type="radio"
                  name="method"
                  value="email"
                  checked={formData.verificationMethod === "email"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      verificationMethod: e.target.value,
                    })
                  }
                />
                Verify via Email
              </label>
              <label>
                <input
                  type="radio"
                  name="method"
                  value="phone"
                  checked={formData.verificationMethod === "phone"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      verificationMethod: e.target.value,
                    })
                  }
                />
                Verify via Phone
              </label>
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              <FiUserPlus /> {loading ? "Creating..." : "Create Account"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="auth-form">
            <p className="otp-info">
              Enter the verification code sent to your{" "}
              {formData.verificationMethod}
            </p>
            <div className="input-group">
              <input
                id="otp-input"
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="otp-input"
                maxLength={5}
              />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Verifying..." : "Verify Account"}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
