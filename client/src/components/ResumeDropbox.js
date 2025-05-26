import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { useNavigate } from 'react-router-dom';
import CreateAccount from './CreateAccount'; 
import Register from './Register';
import SimplifiedRegisterForm from './SimplifiedRegisterForm';


pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;


const ResumeDropbox = ({ onLoginClick, goBack }) => {
    const [resume, setResume] = useState('');
    const [message, setMessage] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [processedData, setProcessedData] = useState(null);
    const fileInputRef = useRef(null);
    const [isMounted, setIsMounted] = useState(true);
    const navigate = useNavigate();
    const [showCreateAccount, setShowCreateAccount] = useState(false);
    const [jobSeekerId, setJobSeekerId] = useState(null);
    
    useEffect(() => {
        return () => {
            
            setIsMounted(false);
        };
    }, []);

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
                            const pageText = textContent.items.map(item => item.str).join(' ');
                            fullText += pageText + '\n';
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

    const handleSubmit = async () => {
        if (!resume) {
            setMessage('Please upload a resume first');
            return;
        }
        
        setIsLoading(true);
        setMessage('Processing your resume...');
        
        try {
            const response = await fetch('http://localhost:5000/api/resume/parse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ resumeText: resume }),
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            
           
            localStorage.setItem('tempJobSeekerId', data.jobSeekerId);
            
           
            setProcessedData(data.data);
            setJobSeekerId(data.jobSeekerId);
            setMessage('Resume processed successfully!');
            setShowCreateAccount(true);
            
        } catch (error) {
            console.error('Error submitting resume:', error);
            setMessage(`Error processing resume: ${error.message}`);
            setProcessedData(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClick = () => {
        fileInputRef.current.click();
    };

    const handleCreateAccount = () => {
        setShowCreateAccount(true);
    };

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
                <button 
                    className="employee-login-button" 
                    onClick={onLoginClick}
                >
                    Employee Login
                </button>
                
                <div className="login-divider">OR</div>
                
                <button 
                    onClick={handleSubmit} 
                    disabled={isLoading || !resume}
                    className="submit-button"
                >
                    {isLoading ? 'Processing...' : 'Submit Resume'}
                </button>
                
                <button 
                    onClick={goBack} 
                    className="back-button"
                >
                    Back to Home
                </button>
            </div>

            {/* Message displayed below buttons */}
            {message && <p className="message">{message}</p>}

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
                <div className="processed-data">
                    <h3>Resume Analysis Results:</h3>
                    <div className="data-container">
                        <div className="data-section">
                            <h4>Personal Information</h4>
                            <p><strong>Name:</strong> {processedData.name || 'Not found'}</p>
                            <p><strong>Email:</strong> {processedData.email || 'Not found'}</p>
                        </div>
                        
                        <div className="data-section">
                            <h4>Education</h4>
                            {Array.isArray(processedData.education) ? (
                                <ul>
                                    {processedData.education.map((edu, index) => (
                                        <li key={index}>
                                            {typeof edu === 'object' ? (
                                                <div>
                                                    {edu.institution && <p><strong>Institution:</strong> {edu.institution}</p>}
                                                    {edu.dates && <p><strong>Dates:</strong> {edu.dates}</p>}
                                                    {edu.location && <p><strong>Location:</strong> {edu.location}</p>}
                                                    {edu.degree && <p><strong>Degree:</strong> {edu.degree}</p>}
                                                </div>
                                            ) : (
                                                edu
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>{typeof processedData.education === 'string' ? processedData.education : 'Not found'}</p>
                            )}
                            
                            <p><strong>Degrees:</strong> {
                                Array.isArray(processedData.degrees) 
                                    ? processedData.degrees.join(', ') 
                                    : (processedData.degrees || 'Not found')
                            }</p>
                        </div>
                        
                        <div className="data-section">
                            <h4>Experience</h4>
                            {Array.isArray(processedData.experience) ? (
                                <ul>
                                    {processedData.experience.map((exp, index) => (
                                        <li key={index}>
                                            {typeof exp === 'object' ? (
                                                <div>
                                                    {exp.company && <p><strong>Company:</strong> {exp.company}</p>}
                                                    {exp.role && <p><strong>Role:</strong> {exp.role}</p>}
                                                    {exp.dates && <p><strong>Dates:</strong> {exp.dates}</p>}
                                                    {exp.responsibilities && <p><strong>Responsibilities:</strong> {exp.responsibilities}</p>}
                                                </div>
                                            ) : (
                                                exp
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>{typeof processedData.experience === 'string' ? processedData.experience : 'Not found'}</p>
                            )}
                        </div>
                        
                        <div className="data-section">
                            <h4>Skills</h4>
                            {Array.isArray(processedData.skills) ? (
                                <ul>
                                    {processedData.skills.map((skill, index) => (
                                        <li key={index}>{skill}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p>{typeof processedData.skills === 'string' ? processedData.skills : 'Not found'}</p>
                            )}
                        </div>
                        
                        <div className="data-section">
                            <h4>Other Information</h4>
                            <p><strong>Achievements:</strong> {
                                Array.isArray(processedData.achievements) 
                                    ? processedData.achievements.join(', ') 
                                    : (processedData.achievements || 'Not found')
                            }</p>
                            <p><strong>Interests:</strong> {
                                Array.isArray(processedData.interests) 
                                    ? processedData.interests.join(', ') 
                                    : (processedData.interests || 'Not found')
                            }</p>
                            <p><strong>Hobbies:</strong> {
                                Array.isArray(processedData.hobbies) 
                                    ? processedData.hobbies.join(', ') 
                                    : (processedData.hobbies || 'Not found')
                            }</p>
                        </div>
                    </div>
                    
                    {/* Simplified Registration Form that appears directly below the resume data */}
                    <div className="simplified-registration">
                        <h3>Create Your Account</h3>
                        <p className="registration-info">
                            Create an account using the information extracted from your resume. You only need to set a password.
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
                </div>
            )}
            
        
        </div>
    );
};

export default ResumeDropbox;