import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import SimplifiedRegisterForm from './SimplifiedRegisterForm';


pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const createEmptyManualProfile = () => ({
    name: '',
    email: '',
    loginUsername: '',
    education: '',
    qualifications: '',
    experience: '',
    voluntaryExperience: '',
    skills: '',
    interests: '',
    hobbies: '',
    achievements: ''
});

const buildManualResumeText = (profile) => {
    const sections = [
        ['Personal Information', [`Name: ${profile.name}`, `Email: ${profile.email}`, `Login Username: ${profile.loginUsername}`]],
        ['Education And Qualifications', [profile.education, profile.qualifications]],
        ['Experience', [profile.experience]],
        ['Voluntary Experience', [profile.voluntaryExperience]],
        ['Skills & Interests', [
            profile.skills ? `Skills: ${profile.skills}` : '',
            profile.interests ? `Interests: ${profile.interests}` : '',
            profile.hobbies ? `Hobbies: ${profile.hobbies}` : '',
            profile.achievements ? `Achievements: ${profile.achievements}` : ''
        ]]
    ];

    return sections
        .map(([heading, lines]) => {
            const content = lines.map((line) => String(line || '').trim()).filter(Boolean);
            return content.length ? `${heading}\n${content.join('\n')}` : '';
        })
        .filter(Boolean)
        .join('\n\n');
};

const ResumeDropbox = ({ onLoginClick, goBack }) => {
    const [resume, setResume] = useState('');
    const [message, setMessage] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [processedData, setProcessedData] = useState(null);
    const [manualMode, setManualMode] = useState(false);
    const [manualProfile, setManualProfile] = useState(createEmptyManualProfile);
    const fileInputRef = useRef(null);
    const [jobSeekerId, setJobSeekerId] = useState(null);

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await processFile(files[0]);
        }
    };

    const handleFileInputChange = async (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            await processFile(files[0]);
        }
    };

    const processFile = async (file) => {
        setIsLoading(true);
        setMessage('Processing file...');

        try {
           
            if (!file.type.match('application/pdf|application/vnd.openxmlformats-officedocument.wordprocessingml.document|text/plain')) {
                setMessage('Please upload a PDF, DOCX, or TXT file.');
                setIsLoading(false);
                return;
            }

           
            const text = await parseFileToText(file);
            setResume(text);
            setMessage('File parsed successfully! Click Submit to send to server.');
        } catch (error) {
            console.error('Error parsing file:', error);
            setMessage('Error parsing file. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const parseFileToText = async (file) => {
        return new Promise((resolve, reject) => {
            if (file.type === 'text/plain') {
                
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsText(file);
            } else if (file.type === 'application/pdf') {
               
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const typedArray = new Uint8Array(e.target.result);
                        const loadingTask = pdfjsLib.getDocument(typedArray);
                        const pdf = await loadingTask.promise;
                        
                        let fullText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map(item => item.str).join('\n');
                            fullText += pageText + '\n\n';
                        }
                        resolve(fullText);
                    } catch (err) {
                        console.error('PDF parsing error:', err);
                        reject(err);
                    }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            } else if (file.type.includes('officedocument.wordprocessingml')) {
            
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target.result;
                        const result = await mammoth.extractRawText({arrayBuffer});
                        resolve(result.value);
                    } catch (err) {
                        console.error('DOCX parsing error:', err);
                        reject(err);
                    }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            } else {
                reject(new Error('Unsupported file type'));
            }
        });
    };

    const submitResumeText = async (resumeText) => {
        setIsLoading(true);
        setMessage('Processing your resume...');
        
        try {
            const response = await fetch((process.env.REACT_APP_API_URL || '') + '/api/resume/parse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ resumeText }),
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            
           
            localStorage.setItem('tempJobSeekerId', data.jobSeekerId);
            
           
            setProcessedData(data.data);
            setJobSeekerId(data.jobSeekerId);
            setMessage('Resume processed successfully!');
            
        } catch (error) {
            console.error('Error submitting resume:', error);
            setMessage(`Error processing resume: ${error.message}`);
            setProcessedData(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!resume) {
            setMessage('Please upload a resume first');
            return;
        }
        
        await submitResumeText(resume);
    };

    const handleManualProfileChange = (event) => {
        const { name, value } = event.target;
        setManualProfile((current) => ({
            ...current,
            [name]: value
        }));
    };

    const handleContinueWithoutResume = () => {
        setManualMode(true);
        setResume('');
        setProcessedData(null);
        setJobSeekerId(null);
        setMessage('');
    };

    const handleManualProfileSubmit = async (event) => {
        event.preventDefault();

        const requiredName = manualProfile.name.trim();
        const requiredEmail = manualProfile.email.trim();
        const requiredUsername = manualProfile.loginUsername.trim();

        if (!requiredName || !requiredEmail || !requiredUsername) {
            setMessage('Full name, email, and login username are required.');
            return;
        }

        setIsLoading(true);
        setProcessedData(null);
        setJobSeekerId(null);
        setMessage('Saving your profile details...');

        try {
            const resumeText = buildManualResumeText(manualProfile);
            const response = await fetch((process.env.REACT_APP_API_URL || '') + '/api/job-seekers/manual', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...manualProfile,
                    name: requiredName,
                    email: requiredEmail,
                    loginUsername: requiredUsername,
                    experience: [manualProfile.experience, manualProfile.voluntaryExperience]
                        .map((item) => item.trim())
                        .filter(Boolean)
                        .join('\n'),
                    resumeText
                })
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => null);
                throw new Error(errorBody?.error || `Server responded with status: ${response.status}`);
            }

            const data = await response.json();
            const nextJobSeekerId = data.jobSeekerId;

            localStorage.setItem('tempJobSeekerId', nextJobSeekerId);
            setProcessedData({
                ...(data.data || {}),
                name: requiredName,
                email: requiredEmail,
                loginUsername: requiredUsername
            });
            setJobSeekerId(nextJobSeekerId);
            setResume('');
            setMessage('Profile details saved. Create your account to continue.');
        } catch (error) {
            console.error('Error saving manual profile:', error);
            setMessage(`Error saving profile details: ${error.message}`);
            setProcessedData(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClick = () => {
        fileInputRef.current.click();
    };

    const renderProcessingLoader = () => (
        <div className="resume-processing-loader" role="status" aria-live="polite">
            <div className="loader-wrapper">
                <span className="loader-letter">P</span>
                <span className="loader-letter">r</span>
                <span className="loader-letter">o</span>
                <span className="loader-letter">c</span>
                <span className="loader-letter">e</span>
                <span className="loader-letter">s</span>
                <span className="loader-letter">s</span>
                <span className="loader-letter">i</span>
                <span className="loader-letter">n</span>
                <span className="loader-letter">g</span>
                <div className="loader"></div>
            </div>
        </div>
    );

    return (
        <div className="resume-dropbox">
            <h2>Resume Upload</h2>
            <div 
                className={`drop-area ${isDragging ? 'dragging' : ''}`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <div className="drop-icon">📄</div>
                <p className="drop-message">
                    <strong>Drag & drop your resume here</strong><br />
                    or click to select a file
                </p>
                <p className="supported-formats">
                    Supported formats: PDF, DOCX, DOC, RTF, TXT
                </p>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.rtf,.txt"
                />
            </div>
            
            {/* Centered buttons container */}
            <div className="buttons-container">
                {isLoading ? (
                    renderProcessingLoader()
                ) : (
                    <>
                        <button
                            className="candidate-login-button"
                            onClick={onLoginClick}
                        >
                            Candidate Login
                        </button>

                        <button
                            className="submit-button demo-cv-button"
                            onClick={handleContinueWithoutResume}
                        >
                            Continue without resume
                        </button>

                        <div className="login-divider">OR</div>

                        <button
                            onClick={handleSubmit}
                            disabled={!resume}
                            className="submit-button"
                        >
                            Submit Resume
                        </button>

                        <button
                            onClick={goBack}
                            className="back-button portal-entry-back-button"
                            aria-label="Back to home"
                            title="Back to Home"
                        >
                            <span className="visually-hidden">Back to Home</span>
                        </button>
                    </>
                )}
            </div>

            {/* Message displayed below buttons */}
            {!isLoading && message && <p className="message">{message}</p>}

            {manualMode && !processedData && (
                <form className="manual-profile-form" onSubmit={handleManualProfileSubmit}>
                    <h3>Personal Information</h3>
                    <p className="registration-info">
                        Add your details manually. Only full name, email, and login username are required.
                    </p>

                    <div className="form-group">
                        <label htmlFor="manual-name">Full Name</label>
                        <input
                            id="manual-name"
                            name="name"
                            type="text"
                            value={manualProfile.name}
                            onChange={handleManualProfileChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="manual-email">Email</label>
                        <input
                            id="manual-email"
                            name="email"
                            type="email"
                            value={manualProfile.email}
                            onChange={handleManualProfileChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="manual-login-username">Login Username</label>
                        <input
                            id="manual-login-username"
                            name="loginUsername"
                            type="text"
                            value={manualProfile.loginUsername}
                            onChange={handleManualProfileChange}
                            required
                        />
                        <div className="form-hint">Choose a username for your JumpTake profile.</div>
                    </div>

                    <h3>Education And Qualifications</h3>
                    <div className="form-group">
                        <label htmlFor="manual-education">Education</label>
                        <textarea
                            id="manual-education"
                            name="education"
                            value={manualProfile.education}
                            onChange={handleManualProfileChange}
                            rows="5"
                            placeholder="Example: Buckinghamshire Edge University&#10;BA International Business Studies with Spanish"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="manual-qualifications">Qualifications</label>
                        <textarea
                            id="manual-qualifications"
                            name="qualifications"
                            value={manualProfile.qualifications}
                            onChange={handleManualProfileChange}
                            rows="4"
                            placeholder="Example: A-Levels, GCSEs, certificates, relevant modules"
                        />
                    </div>

                    <h3>Experience</h3>
                    <div className="form-group">
                        <label htmlFor="manual-experience">Experience</label>
                        <textarea
                            id="manual-experience"
                            name="experience"
                            value={manualProfile.experience}
                            onChange={handleManualProfileChange}
                            rows="6"
                            placeholder="Add jobs, placements, duties, dates, and achievements. One item per line works best."
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="manual-voluntary-experience">Voluntary Experience</label>
                        <textarea
                            id="manual-voluntary-experience"
                            name="voluntaryExperience"
                            value={manualProfile.voluntaryExperience}
                            onChange={handleManualProfileChange}
                            rows="4"
                            placeholder="Optional voluntary work, projects, clubs, or community experience."
                        />
                    </div>

                    <h3>Skills & Interests</h3>
                    <div className="form-group">
                        <label htmlFor="manual-skills">Skills</label>
                        <textarea
                            id="manual-skills"
                            name="skills"
                            value={manualProfile.skills}
                            onChange={handleManualProfileChange}
                            rows="4"
                            placeholder="Example: communication, customer service, business planning"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="manual-interests">Interests</label>
                        <textarea
                            id="manual-interests"
                            name="interests"
                            value={manualProfile.interests}
                            onChange={handleManualProfileChange}
                            rows="3"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="manual-hobbies">Hobbies</label>
                        <textarea
                            id="manual-hobbies"
                            name="hobbies"
                            value={manualProfile.hobbies}
                            onChange={handleManualProfileChange}
                            rows="3"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="manual-achievements">Achievements</label>
                        <textarea
                            id="manual-achievements"
                            name="achievements"
                            value={manualProfile.achievements}
                            onChange={handleManualProfileChange}
                            rows="4"
                        />
                    </div>

                    <button type="submit" className="submit-button" disabled={isLoading}>
                        Continue to Account Setup
                    </button>
                </form>
            )}

            {/* Resume preview */}
            {resume && (
                <div className="resume-preview">
                    <h3>Preview:</h3>
                    <div className="preview-content">
                        {resume}
                    </div>
                </div>
            )}
            
            {processedData && (
                <div className="simplified-registration">
                    <h3>Create Your Account</h3>
                    <p className="registration-info">
                        {manualMode
                            ? 'Create an account using the information you entered. You only need to set a password.'
                            : 'Create an account using the information extracted from your resume. You only need to set a password.'}
                    </p>
                    
                    <SimplifiedRegisterForm 
                        jobSeekerId={jobSeekerId}
                        initialName={processedData.name || ''}
                        initialEmail={processedData.email || ''}
                        onSuccess={() => {
                            
                            window.location.href = '/home';
                        }}
                    />
                </div>
            )}
            
        
        </div>
    );
};

export default ResumeDropbox;
