import React, { useState, useEffect } from "react";
import SignInForm from "./Sign_In_Form";
import ForgotPasswordForm from "./Forgot_Password_Form";

import ambulance from "../../Assets/Images/Home/ambulance.gif";
import heart from "../../Assets/Images/Home/heart.gif";
import lungs from "../../Assets/Images/Home/lungs.gif";
import syringe from "../../Assets/Images/Home/syringe.gif";
import prescription from "../../Assets/Images/Home/prescription.gif";

import "./Authentication_Page.css";

function Authentication({
  role,
  themeClass,
  logo,
  portalName,
  description,
  isPatient = false,
  signUpForm,
}) {
  const [showAuth, setShowAuth] = useState(false);
  const [authActive, setAuthActive] = useState(false);
  const [isRightPanelActive, setIsRightPanelActive] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    const ambulanceEl = document.getElementById("auth-main-ambulance-element");

    if (ambulanceEl) {
      setTimeout(() => {
        ambulanceEl.style.left = "26%";
      }, 50);

      setTimeout(() => {
        if (ambulanceEl) ambulanceEl.style.opacity = "0";
        setShowAuth(true);
        setTimeout(() => setAuthActive(true), 100);
      }, 1500);
    }
  }, []);

  const resetToStart = () => {
    setShowAuth(true);
    setAuthActive(true);
    setShowForgotPassword(false);
    setIsRightPanelActive(false);
  };

  return (
    <div className={`auth_main_root ${themeClass}`}>
      <div className="auth_main_bg_layer">
        <img
          src={heart}
          className="auth_main_bg_icon resize"
          style={{ top: "3%", left: "3%" }}
          alt="Heart"
        />
        <img
          src={lungs}
          className="auth_main_bg_icon resize"
          style={{ top: "3%", right: "3%" }}
          alt="Lungs"
        />
        <img
          src={syringe}
          className="auth_main_bg_icon resize"
          style={{ bottom: "7%", left: "3%" }}
          alt="Syringe"
        />
        <img
          src={prescription}
          className="auth_main_bg_icon resize"
          style={{ bottom: "3%", right: "3%", width: "170px" }}
          alt="Prescription"
        />
      </div>

      {!showAuth && (
        <img
          src={ambulance}
          className="auth_main_anim_ambulance"
          id="auth-main-ambulance-element"
          alt="Ambulance"
        />
      )}

      {showAuth && (
        <div className={`auth_main_wrapper ${authActive ? "active" : ""}`}>
          <div className="auth_main_flex_layout">
            <div
              className={`auth_main_container ${isRightPanelActive ? "right-panel-active" : ""} ${showForgotPassword ? "forgot_form_active" : ""}`}
            >
              {showForgotPassword ? (
                <ForgotPasswordForm
                  role={role}
                  setShowForgotPassword={setShowForgotPassword}
                  resetToStart={resetToStart}
                />
              ) : (
                <>
                  {isPatient && signUpForm}

                  <SignInForm
                    logo={logo}
                    portalName={portalName}
                    setShowForgotPassword={setShowForgotPassword}
                    role={role}
                    setIsRightPanelActive={setIsRightPanelActive}
                    allowGoogleAuth={isPatient}
                  />

                  <div className="auth_main_mobile_toggle">
                    {isPatient && isRightPanelActive ? (
                      <p>
                        Already have an account?{" "}
                        <span onClick={() => setIsRightPanelActive(false)}>
                          Sign In
                        </span>
                      </p>
                    ) : (
                      isPatient && (
                        <p>
                          Don't have an account?{" "}
                          <span onClick={() => setIsRightPanelActive(true)}>
                            Sign Up
                          </span>
                        </p>
                      )
                    )}
                  </div>

                  <div className="auth_main_overlay_wrapper">
                    <div className="auth_main_overlay_content">
                      <div className="auth_main_panel_overlay auth_main_panel_left">
                        <h1>Welcome Back!</h1>
                        <p>
                          To keep connected with us please login with your
                          personal info
                        </p>
                        <button
                          type="button"
                          className="auth_main_btn_outline"
                          onClick={() => setIsRightPanelActive(false)}
                        >
                          Sign In
                        </button>
                      </div>

                      <div className="auth_main_panel_overlay auth_main_panel_right">
                        <h1>Hello, {role}!</h1>
                        <p>{description}</p>
                        {isPatient && (
                          <button
                            type="button"
                            className="auth_main_btn_outline"
                            onClick={() => setIsRightPanelActive(true)}
                          >
                            Sign Up
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Authentication;
