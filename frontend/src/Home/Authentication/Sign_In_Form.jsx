import  { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useGoogleLogin } from "@react-oauth/google";
import google from "../../Assets/Images/Home/google_logo.png";
import "./Sign_In_Form.css";

const Sign_In_Form = ({
  logo,
  portalName,
  setShowForgotPassword,
  role,
  setIsRightPanelActive,
  allowGoogleAuth = false,
}) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleGoogleAuth = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);

        const res = await axios.post("http://localhost:5000/api/auth/google", {
          token: tokenResponse.access_token,
          role: role,
        });

        const { token, user } = res.data;

        localStorage.setItem("token", token);
        localStorage.setItem("role", role);
        if (user) {
          localStorage.setItem("userData", JSON.stringify(user));
        }

        if (role === "Admin") {
          navigate("/admin/admin_dashboard");
        } else if (role === "Doctor") {
          navigate("/doctor");
        } else {
          navigate("/patient/patient_dashboard");
        }

        alert(`Welcome, ${user.name}! Authentication successful.`);
      } catch (err) {
        console.error("Google Auth Error:", err);
        alert(
          err.response?.data?.message ||
            "Google Authentication Failed. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error("Google Login Error:", error);
      alert("Google Login was unsuccessful. Try again.");
    },
  });

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/signin",
        {
          email,
          password,
          role,
        },
      );

      const { token, user, role: backendConfirmedRole } = response.data;
      const finalRole = backendConfirmedRole || user?.role || role;

      localStorage.setItem("token", token);
      localStorage.setItem("role", finalRole);

      if (user) {
        const enrichedUserObject = { ...user, role: finalRole };
        localStorage.setItem("userData", JSON.stringify(enrichedUserObject));
      }

      if (finalRole === "Admin" || finalRole === "SuperAdmin") {
        navigate("/admin/admin_dashboard");
      } else if (finalRole === "Doctor") {
        navigate("/doctor");
      } else {
        navigate("/patient/patient_dashboard");
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Login Failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/auth/signup", {
        name: newName,
        email: newEmail,
        password: newPassword,
      });

      alert("Account created successfully! You can now sign in.");
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setIsRightPanelActive(false);
      setEmail(newEmail);
    } catch (err) {
      alert(err.response?.data?.message || "Registration Failed.");
    }
  };

  return (
    <>
      <div className="sign_in_form_wrapper sign_in_panel">
        <form className="sign_in_form_main" onSubmit={handleSignIn}>
          <h1 className="sign_in_title">Sign In</h1>

          {allowGoogleAuth && (
            <div className="sign_in_social_container">
              <button
                type="button"
                className="sign_in_google_btn"
                onClick={() => handleGoogleAuth()}
                disabled={loading}
              >
                <img
                  src={google}
                  alt="Google logo"
                  className="sign_in_google_icon"
                />
                <span>{loading ? "Verifying..." : "Sign in with Google"}</span>
              </button>
            </div>
          )}

          <div className="sign_in_brand_box">
            <div className="sign_in_logo_icon">{logo}</div>
            <p className="sign_in_portal_name">{portalName}</p>
          </div>

          <div className="sign_in_input_group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <span className="sign_in_input_icon">✉️</span>
          </div>

          <div className="sign_in_input_group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="sign_in_input_icon">🔒</span>
          </div>

          <button
            type="submit"
            className="sign_in_submit_btn"
            disabled={loading}
          >
            Sign In
          </button>

          <div className="sign_in_footer_links">
            <span
              className="sign_in_footer_link"
              onClick={() => setShowForgotPassword(true)}
            >
              Forgot Password?
            </span>
            <Link to="/" className="sign_in_link_wrapper">
              <span className="sign_in_footer_link">⬅ Back to Start</span>
            </Link>
          </div>
        </form>
      </div>

      <div className="sign_in_form_wrapper sign_in_signup_panel">
        <form className="sign_in_form_main" onSubmit={handleSignUp}>
          <h1 className="sign_in_title">Create Account</h1>

          {allowGoogleAuth && (
            <div className="sign_in_social_container">
              <button
                type="button"
                className="sign_in_google_btn"
                onClick={() => handleGoogleAuth()}
                disabled={loading}
              >
                <img
                  src={google}
                  alt="Google logo"
                  className="sign_in_google_icon"
                />
                <span>
                  {loading ? "Registering..." : "Sign up with Google"}
                </span>
              </button>
            </div>
          )}

          <span className="sign_in_divider_text">
            or use email for registration
          </span>

          <div className="sign_in_input_group">
            <input
              type="text"
              placeholder="Full Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <span className="sign_in_input_icon">👤</span>
          </div>

          <div className="sign_in_input_group">
            <input
              type="email"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <span className="sign_in_input_icon">✉️</span>
          </div>

          <div className="sign_in_input_group">
            <input
              type="password"
              placeholder="Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <span className="sign_in_input_icon">🔒</span>
          </div>

          <div className="sign_in_terms_check">
            <input type="checkbox" id="terms" required />
            <label htmlFor="terms">
              I agree to the <span>Terms & Privacy</span>
            </label>
          </div>

          <button
            type="submit"
            className="sign_in_submit_btn"
            disabled={loading}
          >
            Sign Up
          </button>
        </form>
      </div>
    </>
  );
};

export default Sign_In_Form;
