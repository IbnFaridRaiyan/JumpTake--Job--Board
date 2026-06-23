import React, { useRef } from 'react';
import PublicLandingNav from './PublicLandingNav';
import homeVideo from './media/home.mp4';
import logo from './media/logo3.png';

const Landing = () => {
    const aboutSectionRef = useRef(null);

    return (
        <div className="landing-page-container">
            <div className="landing-container">
                <div className="video-background">
                    <video autoPlay loop muted playsInline>
                        <source src={homeVideo} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                    <div className="video-overlay"></div>
                </div>

                <div className="landing-content">
                    <div className="logo-container">
                        <img src={logo} alt="JumpTake Logo" className="landing-logo" />
                    </div>
                    <PublicLandingNav />
                </div>

                <div className="copyright">
                    &copy; Raiyan Ibn Farid 2025
                </div>
            </div>

            <div className="about-section" ref={aboutSectionRef}>
                <div className="about-container">
                    <h2>About JumpTake</h2>
                    <p className="about-intro">
                        JumpTake is an innovative platform designed to connect talented candidates with their perfect job opportunities, and help employers find the ideal candidates through AI-powered resume matching.
                    </p>

                    <div className="about-cards">
                        <div className="about-card">
                            <div className="about-card-icon">Candidate</div>
                            <h3>For Candidates</h3>
                            <p>Upload your resume and let our AI match you with jobs that align with your skills and experience. Apply with a single click and track your applications.</p>
                        </div>

                        <div className="about-card">
                            <div className="about-card-icon">Employer</div>
                            <h3>For Employers</h3>
                            <p>Post job listings and receive qualified candidates that match your needs. Our AI helps surface the right talent faster.</p>
                        </div>
                    </div>

                    <div className="how-it-works">
                        <h2>How JumpTake Works</h2>

                        <div className="steps-container">
                            <div className="step">
                                <div className="step-number">1</div>
                                <h3>Choose your path</h3>
                                <p>Start as a candidate or employer and open the flow that fits what you want to do next.</p>
                            </div>

                            <div className="step">
                                <div className="step-number">2</div>
                                <h3>Create or access your account</h3>
                                <p>Register in a few steps, then sign in and continue from where you left off.</p>
                            </div>

                            <div className="step">
                                <div className="step-number">3</div>
                                <h3>Let AI guide the work</h3>
                                <p>JumpTake supports discovery, matching, hiring, resumes, assessments, and smart navigation across the platform.</p>
                            </div>

                            <div className="step">
                                <div className="step-number">4</div>
                                <h3>Connect and move forward</h3>
                                <p>Browse jobs, manage applications, discover talent, and start real conversations that lead somewhere.</p>
                            </div>
                        </div>
                    </div>

                    <div className="terms-section">
                        <h2>Terms and Conditions</h2>

                        <div className="terms-content">
                            <h3>1. User Agreement</h3>
                            <p>By accessing or using JumpTake, you agree to comply with and be bound by these Terms and Conditions. If you do not agree with these terms, please do not use our platform.</p>

                            <h3>2. Privacy Policy</h3>
                            <p>Your privacy is important to us. Any personal information collected through our platform is subject to our Privacy Policy, which describes how we collect, use, and protect your data.</p>

                            <h3>3. User Accounts</h3>
                            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Users must provide accurate and complete information when creating an account.</p>

                            <h3>4. Content Submission</h3>
                            <p>By submitting resumes, job listings, or other content, you grant JumpTake a non-exclusive license to use, modify, and display that content for the purpose of providing our services.</p>

                            <h3>5. Prohibited Conduct</h3>
                            <p>Users must not engage in any activity that interferes with the proper functioning of the platform, violates any laws, or infringes on the rights of others.</p>

                            <h3>6. Termination</h3>
                            <p>JumpTake reserves the right to terminate or suspend accounts at our discretion, particularly in cases of terms violation or extended periods of inactivity.</p>

                            <h3>7. Disclaimer of Warranties</h3>
                            <p>JumpTake provides services on an &quot;as is&quot; and &quot;as available&quot; basis, without warranties of any kind, either express or implied.</p>

                            <h3>8. Contact Information</h3>
                            <p>For questions regarding these terms or our services, please contact support.</p>
                        </div>
                    </div>

                    <footer className="landing-mini-footer">
                        <div className="landing-mini-footer__brand">
                            <img src={logo} alt="JumpTake" className="landing-mini-footer__logo" />
                            <div>
                                <h3>JumpTake</h3>
                                <p>AI-powered job discovery, hiring, guided onboarding, and better candidate-employer matching.</p>
                            </div>
                        </div>

                        <div className="landing-mini-footer__contact">
                            <h4>Contact us</h4>
                            <a href="mailto:support@jumptake.com">support@jumptake.com</a>
                            <div className="landing-mini-footer__socials">
                                <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
                                <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
                                <a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook</a>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default Landing;
