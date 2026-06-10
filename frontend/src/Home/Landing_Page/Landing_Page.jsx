import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Landing_Page.css";


import delhi from "../../Assets/Images/Home/Delhi.png";
import mumbai from "../../Assets/Images/Home/Mumbai.png";
import hyderabad from "../../Assets/Images/Home/Hyderabad.png";
import bangalore from "../../Assets/Images/Home/Banglore.png";
import chennai from "../../Assets/Images/Home/Chennai.png";
import kolkata from "../../Assets/Images/Home/Kolkata.png";
import hosp1 from "../../Assets/Images/Home/Hospital_1.png";
import hosp2 from "../../Assets/Images/Home/Hospital_2.png";
import hosp3 from "../../Assets/Images/Home/Hospital_3.png";
import hosp4 from "../../Assets/Images/Home/Hospital_4.png";


function Landing_Page() {
   
    const slides = [hosp1, hosp2, hosp3, hosp4];
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [slides.length]);

    //REGISTRY DATA 
    const locations = [
        {
            name: "Hyderabad",
            area: "Banjara Hills",
            addr: "Road No. 12",
            img: hyderabad,
            phone: "+91 98765 12345",
            specs: "Cardiology, Oncology, Pediatrics"
        },
        {
            name: "Bangalore",
            area: "MG Road",
            addr: "MG Road, Bengaluru",
            img: bangalore,
            phone: "+91 91234 56789",
            specs: "Neurology, Orthopedics, Dermatology"
        },
        {
            name: "Chennai",
            area: "Anna Nagar",
            addr: "Anna Nagar",
            img: chennai,
            phone: "+91 99887 66554",
            specs: "Maternity Care, Pharmacy, ENT"
        },
        {
            name: "Mumbai",
            area: "Marine Drive",
            addr: "Marine Drive",
            img: mumbai,
            phone: "+91 97654 32109",
            specs: "Dialysis, Emergency, Surgery"
        },
        {
            name: "Delhi",
            area: "Connaught Place",
            addr: "CP, New Delhi",
            img: delhi,
            phone: "+91 93456 78901",
            specs: "Telemedicine, Robotic Surgery"
        },
        {
            name: "Kolkata",
            area: "Salt Lake",
            addr: "Sector V",
            img: kolkata,
            phone: "+91 92345 67890",
            specs: "Gastro, Pediatrics, General"
        }
    ];

    const services = [
        { title: "Cardiology", icon: "♥", desc: "Expert heart and vascular care" },
        { title: "Orthopedics", icon: "♥", desc: "Bone, joint, and muscle specialists" },
        { title: "Neurology", icon: "♥", desc: "Advanced care for the nervous system" },
        { title: "Pediatrics", icon: "♥", desc: "Dedicated healthcare for children" },
        { title: "Gastroenterology", icon: "♥", desc: "Digestive system and liver health" },
        { title: "Oncology", icon: "♥", desc: "Cancer Treatment & Therapy" },
        { title: "Dermatology", icon: "♥", desc: "Skin & Hair Wellness" },
        { title: "General", icon: "♥", desc: "Comprehensive primary healthcare" }
    ];

    return (
        <div className="landing_page_wrapper">
            
            //TOP NAVIGATION BAR 
            <nav className="landing_page_navbar">
                <div className="landing_page_nav_inner">
                    <div className="landing_page_brand">
                        <span className="landing_page_logo_icon">✚</span> MEDICO
                        <span className="landing_page_plus">PLUS</span>
                    </div>

                    <div className="landing_page_nav_actions">
                        <Link to="/doctor_auth" className="landing_page_btn_doctor">
                            Doctor Portal
                        </Link>
                        <Link to="/admin_auth" className="landing_page_btn_admin">
                            Admin Access
                        </Link>
                    </div>
                </div>
            </nav>

            {/* --- HERO BRANDING SECTION --- */}
            <main className="landing_page_hero">
                <div className="landing_page_hero_glass_card">
                    <div className="landing_page_badge">REDEFINING MEDICAL EXCELLENCE</div>
                    
                    <h1 className="landing_page_main_title">
                        <span className="landing_page_letter landing_page_letter_m">M</span>
                        <span className="landing_page_letter landing_page_letter_e">E</span>
                        <span className="landing_page_letter landing_page_letter_d">D</span>
                        <span className="landing_page_letter landing_page_letter_i">I</span>
                        <span className="landing_page_letter landing_page_letter_c">C</span>
                        <span className="landing_page_letter landing_page_letter_o">O</span>
                    </h1>

                    <p className="landing_page_hero_desc">
                        India's most advanced digital healthcare ecosystem.
                        Seamlessly bridging the gap between quality care and technological innovation.
                    </p>

                    <Link to="/patient_auth">
                        <button className="landing_page_btn_primary">Book Appointment</button>
                    </Link>
                </div>
            </main>

            {/* --- LIVE EMERGENCY TICKER --- */}
            <div className="landing_page_ticker">
                <div className="landing_page_ticker_track">
                    <span>⚠️ EMERGENCY: 24/7 Trauma Centers Active</span>
                    <span>🧪 NEW: AI-Pathology Reports ready in 15 mins</span>
                    <span>💉 COVID-26 Vaccination drive starts Monday</span>
                    <span>🌐 Serving 6 Cities across India</span>
                    <span>⚠️ EMERGENCY: 24/7 Trauma Centers Active</span>
                    <span>🧪 NEW: AI-Pathology Reports ready in 15 mins</span>
                </div>
            </div>

            {/* --- FACILITY SHOWCASE SLIDER --- */}
            <section className="landing_page_slider_section">
                <div className="landing_page_slider_frame">
                    {slides.map((img, index) => (
                        <div
                            key={index}
                            className={`landing_page_slide_item ${index === currentIndex ? "landing_page_active" : ""}`}
                            style={{ backgroundImage: `url(${img})` }}
                        />
                    ))}
                    
                    <div className="landing_page_slider_content">
                        <div className="landing_page_glass_tag">
                            <h2>Modern Facilities</h2>
                            <p>Advanced infrastructure for precision healing.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- BRANCH DIRECTORY --- */}
            <section className="landing_page_section" id="locations-link">
                <div className="landing_page_container">
                    <h2 className="landing_page_section_heading">
                        Our <span>Branches</span>
                    </h2>

                    <div className="landing_page_bento_grid">
                        {locations.map((loc, i) => (
                            <div key={i} className="landing_page_location_card">
                                <div className="landing_page_card_inner">
                                    {/* Front side showing the building */}
                                    <div
                                        className="landing_page_card_front"
                                        style={{ backgroundImage: `url(${loc.img})` }}
                                    >
                                        <div className="landing_page_city_label">{loc.name}</div>
                                    </div>

                                    {/* Back side showing contact details */}
                                    <div className="landing_page_card_back">
                                        <h3>{loc.area}</h3>
                                        <div className="landing_page_loc_info">
                                            <p>📍 {loc.addr}</p>
                                            <p>☎️ {loc.phone}</p>
                                            <p className="landing_page_specialties">{loc.specs}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- CLINICAL SPECIALIZATIONS --- */}
            <section className="landing_page_section landing_page_bg_light" id="services-link">
                <div className="landing_page_container">
                    <h2 className="landing_page_section_heading">
                        Medical <span>Specializations</span>
                    </h2>

                    <div className="landing_page_services_grid">
                        {services.map((service, i) => (
                            <div key={i} className="landing_page_service_item">
                                <div className="landing_page_service_icon">{service.icon}</div>
                                <h4>{service.title}</h4>
                                <p>{service.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- IMPACT STATISTICS --- */}
            <section className="landing_page_stats_bar">
                <div className="landing_page_stat_box">
                    <span className="landing_page_num">800+</span>
                    <span className="landing_page_label">Active Patients</span>
                </div>
                <div className="landing_page_stat_box">
                    <span className="landing_page_num">100+</span>
                    <span className="landing_page_label">Specialists</span>
                </div>
                <div className="landing_page_stat_box">
                    <span className="landing_page_num">95.9%</span>
                    <span className="landing_page_label">Success Rate</span>
                </div>
            </section>

            {/* --- PATIENT TESTIMONIALS --- */}
            <section className="landing_page_section">
                <div className="landing_page_container">
                    <h2 className="landing_page_section_heading">
                        Patient <span>Voices</span>
                    </h2>

                    <div className="landing_page_feedback_list">
                        {[
                            { review: "The AI diagnostics helped me a lot. Identified a blockage others missed.", name: "Mahanth Reddy" },
                            { review: "Simple booking. Loved seeing my reports before reaching home.", name: "Vijay Kumar" },
                            { review: "World-class facility. Staff made me feel at home during recovery.", name: "Mohan Krishna" }
                        ].map((item, i) => (
                            <div key={i} className="landing_page_feedback_card">
                                <div className="landing_page_quote_icon">“</div>
                                <p>"{item.review}"</p>
                                <footer>{item.name}</footer>
                                <div className="landing_page_rating">★★★★★</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- SYSTEM FOOTER --- */}
            <footer className="landing_page_footer">
                <div className="landing_page_container landing_page_footer_grid">
                    <div className="landing_page_footer_main">
                        <h3>Medico<span>+</span></h3>
                        <p>Leading the digital healthcare revolution with compassion and precision.</p>
                    </div>

                    <div className="landing_page_footer_links">
                        <h4>Explore</h4>
                        <a href="#services-link">Services</a>
                        <a href="#locations-link">Branches</a>
                    </div>

                    <div className="landing_page_footer_subscribe">
                        <h4>Stay Updated</h4>
                        <div className="landing_page_input_group">
                            <input type="email" placeholder="Email Address" />
                            <button>Join</button>
                        </div>
                    </div>
                </div>

                <div className="landing_page_footer_bottom">
                    &copy; 2026 Medico Health Systems. All Rights Reserved.
                </div>
            </footer>
        </div>
    );
}

export default Landing_Page;