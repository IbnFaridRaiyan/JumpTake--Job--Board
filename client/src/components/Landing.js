import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import homeVideo from './media/home.mp4';
import employeeVideo from './media/employee.mp4';
import employerVideo from './media/employer.mp4';
import logo from './media/logo.png';

const Landing = () => {
    const navigate = useNavigate();
    const aboutSectionRef = useRef(null);
    const employeePortalRef = useRef(null);
    const employerPortalRef = useRef(null);

    const goToJobSeeker = () => {
        navigate('/job-seeker');
    };

    const goToCompany = () => {
        navigate('/company');
    };

    const scrollToAbout = () => {
        aboutSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    };
    
    const scrollToEmployeePortal = () => {
        employeePortalRef.current.scrollIntoView({ behavior: 'smooth' });
    };
    
    const scrollToEmployerPortal = () => {
        employerPortalRef.current.scrollIntoView({ behavior: 'smooth' });
    };

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
                    
                    <p className="landing-subtitle">Just couple of clicks to get started as an</p>
                    
                    <div className="button-container">
                        <button 
                            className="role-button job-seeker-button"
                            onClick={goToJobSeeker}
                        >
                            Employee
                        </button>
                        
                        <div className="button-separator">or</div>
                        
                        <button 
                            className="role-button company-button"
                            onClick={goToCompany}
                        >
                            Employer
                        </button>
                    </div>
                    
                    <div className="learn-more-links">
                        <button className="about-button" onClick={scrollToAbout}>
                            Learn more about JumpTake
                            <span className="down-arrow">↓</span>
                        </button>
                        
                    </div>
                </div>
                
                <div className="copyright">
                    &copy; Raiyan Ibn Farid 2025
                </div>
            </div>

            
            <div className="about-section" ref={aboutSectionRef}>
                <div className="about-container">
                    <h2>About JumpTake</h2>
                    <p className="about-intro">
                        JumpTake is an innovative platform designed to connect talented employees with their perfect job opportunities, and help employers find the ideal candidates through AI-powered resume matching.
                    </p>

                    <div className="about-cards">
                        <div className="about-card">
                            <div className="about-card-icon">👤</div>
                            <h3>For Employees</h3>
                            <p>Upload your resume and let our AI match you with jobs that align perfectly with your skills and experience. Apply with a single click and track your applications.</p>
                        </div>
                        
                        <div className="about-card">
                            <div className="about-card-icon">🏢</div>
                            <h3>For Employers</h3>
                            <p>Post job listings and receive qualified candidates that match your specific requirements. Our AI analyzes resumes to find the perfect fit for your open positions.</p>
                        </div>
                    </div>

                    <div className="how-it-works">
                        <h2>How JumpTake Works</h2>
                        
                        <div className="steps-container">
                            <div className="step">
                                <div className="step-number">1</div>
                                <h3>Surf as an Employee or Employer</h3>
                                <p>Candidate needs to upload their resume to create an account, Employers can search their industry to get started.</p>
                            </div>
                            
                            <div className="step">
                                <div className="step-number">2</div>
                                <h3>Just type your password to log in</h3>
                                <p>It's eaaasy to create an account. Log in and your account is all set to go.</p>
                            </div>
                            
                            <div className="step">
                                <div className="step-number">3</div>
                                <h3>AI-Powered Matching</h3>
                                <p>Our advanced algorithms analyze skills, experience, and job requirements to create perfect matches.</p>
                            </div>
                            
                            <div className="step">
                                <div className="step-number">4</div>
                                <h3>Connect and Collaborate</h3>
                                <p>Apply for positions, review candidates, and start building valuable professional relationships.</p>
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
                            <p>JumpTake provides services on an "as is" and "as available" basis, without warranties of any kind, either express or implied.</p>
                            
                            <h3>8. Contact Information</h3>
                            <p>For questions regarding these terms or our services, please contact support</p>
                            
                          
                        </div>
                    </div>
                </div>
            </div>
            
            
            <div className="portal-preview-section employee-portal-section" ref={employeePortalRef}>
                <div className="portal-preview-container">
                    <div className="portal-video-background">
                        <video autoPlay loop muted playsInline className="portal-video">
                            <source src={employeeVideo} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                        <div className="portal-video-overlay"></div>
                    </div>
                    
                    <div className="portal-content">
                        <h2>Employee Portal</h2>
                        <p className="portal-description">
                            Our Employee Portal is designed to help job seekers find their perfect position with minimal effort. Upload your resume, and let our AI do the rest.
                        </p>
                        
                        <div className="portal-features">
                            <div className="portal-feature">
                                <div className="feature-icon">📄</div>
                                <h3>Resume Parsing</h3>
                                <p>Our AI automatically extracts your skills, experience, and qualifications from your resume.</p>
                            </div>
                            
                            <div className="portal-feature">
                                <div className="feature-icon">🔍</div>
                                <h3>Job Matching</h3>
                                <p>Get matched with jobs that align with your experience and career goals.</p>
                            </div>
                            
                            <div className="portal-feature">
                                <div className="feature-icon">📱</div>
                                <h3>Application Tracking</h3>
                                <p>Keep track of all your job applications and their statuses in one place.</p>
                            </div>
                            
                            <div className="portal-feature">
                                <div className="feature-icon">🚀</div>
                                <h3>One-Click Apply</h3>
                                <p>Apply to jobs with a single click using your pre-uploaded resume and profile.</p>
                            </div>
                        </div>
                        
                        <button 
                            className="portal-cta-button employee-cta"
                            onClick={goToJobSeeker}
                        >
                            Enter Employee Portal
                        </button>
                    </div>
                </div>
            </div>
            
           
            <div className="portal-preview-section employer-portal-section" ref={employerPortalRef}>
                <div className="portal-preview-container">
                    <div className="portal-video-background">
                        <video autoPlay loop muted playsInline className="portal-video">
                            <source src={employerVideo} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                        <div className="portal-video-overlay"></div>
                    </div>
                    
                    <div className="portal-content">
                        <h2>Employer Portal</h2>
                        <p className="portal-description">
                            Our Employer Portal provides powerful tools to find and connect with the best talent for your organization.
                        </p>
                        
                        <div className="portal-features">
                            <div className="portal-feature">
                                <div className="feature-icon">📝</div>
                                <h3>Post Jobs</h3>
                                <p>Easily create and post detailed job listings to attract qualified candidates.</p>
                            </div>
                            
                            <div className="portal-feature">
                                <div className="feature-icon">👥</div>
                                <h3>Talent Pool</h3>
                                <p>Browse our database of candidates and filter by skills, experience, and more.</p>
                            </div>
                            
                            <div className="portal-feature">
                                <div className="feature-icon">📊</div>
                                <h3>Application Management</h3>
                                <p>Review applications, track candidates through your hiring pipeline, and manage communications.</p>
                            </div>
                            
                            <div className="portal-feature">
                                <div className="feature-icon">🔎</div>
                                <h3>AI Matching</h3>
                                <p>Our AI technology matches your job requirements with the most suitable candidates.</p>
                            </div>
                        </div>
                        
                        <button 
                            className="portal-cta-button employer-cta"
                            onClick={goToCompany}
                        >
                            Enter Employer Portal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Landing;