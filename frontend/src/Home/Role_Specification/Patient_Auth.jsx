import React from "react";
import Auth_Main from "../Authentication/Authentication_Page";
import "./Patient_Auth.css";

export default function Patient_Auth() {
  return (
    <Auth_Main
      role="Patient"
      themeClass="patient_auth_theme"
      isPatient={true}
      logo="❤️"
      portalName="Patient Portal"
      description="Create your account to start your journey with Medico+."
    />
  );
}
