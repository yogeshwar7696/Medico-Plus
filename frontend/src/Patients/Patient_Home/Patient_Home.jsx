import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../Patient_Navbar/Patient_Navbar";
import Patient_Onboarding from "../Patient_Onboarding/Patient_Onboarding";
import NotificationProvider from "../../Notifications/NotificationProvider";
import "./Patient_Home.css";
import { useEffect } from "react";

export default function Patient_Home() {
  const [user, setUser] = useState(
    () => JSON.parse(localStorage.getItem("userData")) || {},
  );
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    const syncLocalProfileCache = () => {
      setUser(JSON.parse(localStorage.getItem("userData")) || {});
    };

    window.addEventListener("profile_synced", syncLocalProfileCache);
    return () =>
      window.removeEventListener("profile_synced", syncLocalProfileCache);
  }, []);

  const isProfileIncomplete =
    user && user.email && (!user.contact || !user.age || !user.bloodGroup);

  return (
    <NotificationProvider>
      <div className="pat_home_layout">
        {/* CRITICAL DATA VALIDATION: PROFILE ONBOARDING INTERCEPTOR */}
        {isProfileIncomplete && !onboardingComplete && (
          <Patient_Onboarding
            user={user}
            setOnboardingComplete={setOnboardingComplete}
          />
        )}

        {/* PERSISTENT MEDICOPLUS NAVIGATION ELEMENT */}
        <Navbar />

        {/* DYNAMIC MASTER CONTENT area */}
        <main className="pat_home_content_area">
          <Outlet />
        </main>
      </div>
    </NotificationProvider>
  );
}
