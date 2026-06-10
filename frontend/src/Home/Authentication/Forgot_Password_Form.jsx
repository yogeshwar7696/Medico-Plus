import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Mail,
  ShieldCheck,
  Lock,
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import "./Forgot_Password_Form.css";

const Forgot_Password_Form = ({
  role,
  setShowForgotPassword,
  resetToStart,
}) => {
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleExitFlow = () => {
    setStep(1);
    setEmail("");
    setVerificationCode("");
    setNewPassword("");
    if (resetToStart) resetToStart();
    setShowForgotPassword(false);
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/auth/forgot-password", {
        email,
        role,
      });
      alert("Verification security token transmitted to your email address.");
      setStep(2);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Registered identity location trace failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/auth/verify-token", {
        email,
        token: verificationCode,
      });
      setStep(3);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Invalid or expired security token code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put("http://localhost:5000/api/auth/update-password", {
        email,
        token: verificationCode,
        newPassword,
      });

      alert(
        "Security Registry Updated! Please sign in with your new password.",
      );
      handleExitFlow();
    } catch (err) {
      alert(
        err.response?.data?.message || "Update transaction execution failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot_form_wrapper animate_fade_in">
      <div className="forgot_form_header">
        <h1>
          {step === 1 && "Reset Password"}
          {step === 2 && "Enter Secure Code"}
          {step === 3 && "Create New Password"}
        </h1>
        <p>
          {step === 1 &&
            `Verify registered credentials for an active ${role || "User"} account.`}
          {step === 2 &&
            `Input the dynamic authentication token code sent to your active mailbox.`}
          {step === 3 &&
            "Set up your new highly secure entry gateway access password credentials."}
        </p>
      </div>

      <form
        className="forgot_form_body_content"
        onSubmit={
          step === 1
            ? handleRequestCode
            : step === 2
              ? handleVerifyCode
              : handleUpdatePassword
        }
      >
        <div className="forgot_form_field_group">
          {step === 1 && (
            <div className="forgot_form_input_item">
              <input
                type="email"
                placeholder="Registered Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="forgot_form_glyph">
                <Mail size={16} />
              </span>
            </div>
          )}

          {step === 2 && (
            <div className="forgot_form_input_item">
              <input
                type="text"
                placeholder="6-Digit Verification Token"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                required
              />
              <span className="forgot_form_glyph">
                <ShieldCheck size={16} />
              </span>
            </div>
          )}

          {step === 3 && (
            <div className="forgot_form_input_item">
              <input
                type="password"
                placeholder="New Secure Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <span className="forgot_form_glyph">
                <Lock size={16} />
              </span>
            </div>
          )}
        </div>

        <div className="forgot_form_btn_stack">
          <button
            type="submit"
            className="forgot_form_btn_submit"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="spinner_icon_rotate" size={16} />
            ) : step === 1 ? (
              <>
                Request Code <ArrowRight size={16} />
              </>
            ) : step === 2 ? (
              <>
                Verify Token <CheckCircle2 size={16} />
              </>
            ) : (
              "Update Password"
            )}
          </button>

          <button
            type="button"
            className="forgot_form_btn_cancel"
            onClick={handleExitFlow}
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="forgot_form_nav_footer">
        <Link
          to="#"
          className="forgot_form_home_anchor"
          onClick={(e) => {
            e.preventDefault();
            handleExitFlow();
          }}
        >
          <ArrowLeft size={14} /> Back to Sign In Form
        </Link>
      </div>
    </div>
  );
};

export default Forgot_Password_Form;
