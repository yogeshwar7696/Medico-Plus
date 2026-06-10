import { BrowserRouter, Route, Routes } from "react-router-dom";

/* --- COMPONENT IMPORTS --- */
import Landing_Page from "./Home/Landing_Page/Landing_Page";
import Patient_Auth from "./Home/Role_Specification/Patient_Auth";
import Doctor_Auth from "./Home/Role_Specification/Doctor_Auth";
import Admin_Auth from "./Home/Role_Specification/Admin_Auth";

// Admin Components
import Admin_Home from "./Admin/Admin_Home/Admin_Home";
import Admin_Dashboard from "./Admin/Admin_Dashboard/Admin_Dashboard";
import Admin_Doctor_Management from "./Admin/Doctor_Management/Doctor_Management";
import Admin_Appointment_Management from "./Admin/Appointment_Management/Appointment_Management";
import Admin_Patient_Management from "./Admin/Patient_Management/Patient_Management";
import Admin_Revenue_Details from "./Admin/Revenue_Details/Revenue_Details";
import Admin_Event_Management from "./Admin/Events_Management/Event_Management";
import Admin_Statistics from "./Admin/Statistics/Statistics";
import Admin_Availability_Management from "./Admin/Availability_Management/Availability_Management";
import Admin_Department_Management from "./Admin/Department_Management/Department_Management";
import Admin_Review_Management from "./Admin/Review_Management/Review_Management";
import Admin_Pharmacy_Management from "./Admin/Pharmacy_Management/Pharmacy_Management";

// Doctor Components
import Doctor_Home from "./Doctors/Doctor_Home/Doctor_Home";
import Doctor_Appointment_Management from "./Doctors/Doctor_Appointment_Management/Doctor_Appointment_Management";
import Doctor_Performance_Dashboard from "./Doctors/Doctor_Performance_Dashboard/Doctor_Performance_Dashboard";
import Doctor_Availability_Management from "./Doctors/Doctor_Availability_Management/Doctor_Availability_Management";
import Doctor_Dashboard from "./Doctors/Doctor_Dashboard/Doctor_Dashboard";
import Doctor_Patient_Management from "./Doctors/Doctor_Patient_Management/Doctor_Patient_Management";
import Doctor_Review_Management from "./Doctors/Doctor_Review_Management/Doctor_Review_Management";
import Doctor_Profile from "./Doctors/Doctor_Profile/Doctor_Profile";
import Doctor_Settings from "./Doctors/Doctor_Settings/Doctor_Settings";

// Patient Components
import Patient_Home from "./Patients/Patient_Home/Patient_Home";
import Patient_Dashboard from "./Patients/Patient_Dashboard/Patient_Dashboard";
import Patient_Bookings from "./Patients/Patient_Bookings/Patient_Bookings";
import Doctor_Details from "./Patients/Doctor_Details/Doctor_Details";
import Patient_Profile from "./Patients/Patient_Profile/Patient_Profile";
import Pharmacy_Details from "./Patients/Pharmacy_Details/Pharmacy_Details";
import Patient_Vault from "./Patients/Patient_Vault/Patient_Vault";
import Patient_Onboarding from "./Patients/Patient_Onboarding/Patient_Onboarding";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route path="/" element={<Landing_Page />} />
        <Route path="/landing_page" element={<Landing_Page />} />

        {/* --- AUTHENTICATION ROUTES --- */}
        <Route path="/patient_auth" element={<Patient_Auth />} />
        <Route path="/doctor_auth" element={<Doctor_Auth />} />
        <Route path="/admin_auth" element={<Admin_Auth />} />

        {/* --- ADMIN ROUTES --- */}
        <Route path="/admin" element={<Admin_Home />}>
          <Route index element={<Admin_Dashboard />} />
          <Route path="admin_dashboard" element={<Admin_Dashboard />} />
          <Route
            path="doctors_management"
            element={<Admin_Doctor_Management />}
          />
          <Route
            path="appointments_management"
            element={<Admin_Appointment_Management />}
          />
          <Route
            path="patients_management"
            element={<Admin_Patient_Management />}
          />
          <Route path="revenue_details" element={<Admin_Revenue_Details />} />
          <Route
            path="events_management"
            element={<Admin_Event_Management />}
          />
          <Route path="statistics" element={<Admin_Statistics />} />
          <Route
            path="availability_management"
            element={<Admin_Availability_Management />}
          />
          <Route
            path="departments_management"
            element={<Admin_Department_Management />}
          />
          <Route
            path="review_management"
            element={<Admin_Review_Management />}
          />
          <Route
            path="pharmacy_management"
            element={<Admin_Pharmacy_Management />}
          />
        </Route>

        {/* --- DOCTOR ROUTES --- */}
        <Route path="/doctor" element={<Doctor_Home />}>
          <Route index element={<Doctor_Dashboard />} />
          <Route path="doctor_dashboard" element={<Doctor_Dashboard />} />
          <Route
            path="doctor_appointments_management"
            element={<Doctor_Appointment_Management />}
          />
          <Route
            path="doctor_patients_management"
            element={<Doctor_Patient_Management />}
          />
          <Route
            path="doctor_availability_management"
            element={<Doctor_Availability_Management />}
          />
          <Route
            path="doctor_performance_dashboard"
            element={<Doctor_Performance_Dashboard />}
          />
          <Route
            path="doctor_review_management"
            element={<Doctor_Review_Management />}
          />
          <Route path="doctor_settings" element={<Doctor_Settings />} />
          <Route path="doctor_profile" element={<Doctor_Profile />} />
        </Route>

        {/* --- Patient ROUTES --- */}
        <Route path="/patient" element={<Patient_Home />}>
          <Route index element={<Patient_Dashboard />} />
          <Route path="patient_dashboard" element={<Patient_Dashboard />} />
          <Route path="patient_bookings" element={<Patient_Bookings />} />
          <Route path="doctor_details" element={<Doctor_Details />} />
          <Route path="patient_bookings" element={<Patient_Bookings />} />
          <Route path="pharmacy_details" element={<Pharmacy_Details />} />
          <Route path="patient_vault" element={<Patient_Vault />} />
          <Route path="patient_profile" element={<Patient_Profile />} />
          <Route path="patient_profile" element={<Patient_Onboarding />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
