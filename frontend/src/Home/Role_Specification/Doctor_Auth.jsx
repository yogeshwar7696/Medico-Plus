import React from "react";
import Auth_Main from "../Authentication/Authentication_Page";
import "./Doctor_Auth.css";

export default function Doctor_Auth() {
  return (
    <Auth_Main
      role="Doctor"
      themeClass="doctor-auth-theme"
      logo="🩺"
      portalName="Doctor Portal"
      description="Access patient records and manage your appointments efficiently."
    />
  );
}
