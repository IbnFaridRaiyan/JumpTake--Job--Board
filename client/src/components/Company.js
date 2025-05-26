import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployerLogin from './EmployerLogin';
import EmployerRegistration from './EmployerRegistration';
import employerVideo from './media/employer.mp4';

const Company = () => {
    const [companyName, setCompanyName] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [companyInfo, setCompanyInfo] = useState(null);
    const [manualInputMode, setManualInputMode] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [showRegistration, setShowRegistration] = useState(false);
    const [companyId, setCompanyId] = useState(null);
    const [formData, setFormData] = useState({
        industry: '',
        founded: '',
        headquarters: '',
        description: '',
        website: ''
    });
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const fetchWikipediaInfo = async (companyName) => {
        try {
            const searchUrl = `https://en.wikipedia.org/w/api.php?origin=*&action=query&list=search&srsearch=${encodeURIComponent(companyName)}&format=json`;
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();
            
            if (!searchData.query.search.length) {
                return null;
            }
            
            const pageId = searchData.query.search[0].pageid;
            
            const contentUrl = `https://en.wikipedia.org/w/api.php?origin=*&action=query&prop=extracts&exintro&explaintext&pageids=${pageId}&format=json`;
            const contentResponse = await fetch(contentUrl);
            const contentData = await contentResponse.json();
            
            const urlResponse = await fetch(`https://en.wikipedia.org/w/api.php?origin=*&action=query&prop=info&inprop=url&pageids=${pageId}&format=json`);
            const urlData = await urlResponse.json();
            
            const page = contentData.query.pages[pageId];
            const pageUrl = urlData.query.pages[pageId].canonicalurl;
            
            return {
                title: page.title,
                description: page.extract,
                url: pageUrl,
                industry: extractIndustry(page.extract),
                founded: extractFoundedYear(page.extract),
                headquarters: extractHeadquarters(page.extract)
            };
        } catch (error) {
            console.error('Error fetching company info from Wikipedia:', error);
            return null;
        }
    };

    const extractIndustry = (text) => {
        const industryPatterns = [
            /operates\s+in\s+(?:the\s+)?([^\.]+?(?:industry|sector|market))/i,
            /is\s+(?:a|an)\s+([^\.]+?)\s+company/i,
            /(?:industry|sector)(?:\sis|\s+are|\s+include[s]?|:)\s+([^\.]{3,50}?)(?:\.|\band\b|,\s+(?:and|which|with|while))/i,
            /(?:industry|sector|business)(?:\sis|\sin|:)?\s+([^\.]{3,100}?)(?:\.|\n|\r|$)/i
        ];
        
        for (const pattern of industryPatterns) {
            const match = text.match(pattern);
            if (match && match[1] && match[1].length > 3) {
                return match[1].trim()
                    .replace(/\s+(?:in|of|at|for|with|by|through)\s+[^,\.]+$/, '')
                    .replace(/\s*\([^)]*\)/, '');
            }
        }
        
        const industryKeywords = [
            'technology', 'software', 'hardware', 'telecommunications', 
            'electronics', 'manufacturing', 'automotive', 'aerospace',
            'pharmaceutical', 'biotechnology', 'healthcare', 'financial services',
            'banking', 'insurance', 'retail', 'e-commerce', 'media', 'entertainment',
            'gaming', 'hospitality', 'real estate', 'energy', 'oil', 'gas',
            'renewable energy', 'agriculture', 'food', 'beverage'
        ];
        
        const firstParagraph = text.split('.').slice(0, 3).join('.');
        
        for (const keyword of industryKeywords) {
            if (firstParagraph.toLowerCase().includes(keyword)) {
                const beforeKeyword = firstParagraph.toLowerCase().split(keyword)[0];
                const wordsBeforeKeyword = beforeKeyword.split(/\s+/).slice(-3).join(' ');
                const afterKeyword = firstParagraph.toLowerCase().split(keyword)[1];
                const wordsAfterKeyword = afterKeyword ? afterKeyword.split(/\s+/).slice(0, 3).join(' ') : '';
                
                return `${wordsBeforeKeyword} ${keyword} ${wordsAfterKeyword}`.trim();
            }
        }
        
        return '';
    };

    const extractFoundedYear = (text) => {
        const foundedRegex = /(?:founded|established|incorporated)(?:\sin|\son|:)?\s(?:in\s)?(\d{4})/i;
        const match = text.match(foundedRegex);
        return match ? match[1] : '';
    };

    const extractHeadquarters = (text) => {
        const hqRegex = /(?:headquartered|headquarters|based)(?:\sin|\sat|:)?\s([^\.]+)/i;
        const match = text.match(hqRegex);
        return match ? match[1].trim() : '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!companyName.trim()) {
            setMessage('Please enter your company name.');
            return;
        }
        
        setIsLoading(true);
        setMessage(`Searching for information about ${companyName}...`);
        
        try {
            const wikiInfo = await fetchWikipediaInfo(companyName);
            
            if (wikiInfo) {
                setCompanyInfo(wikiInfo);
                setFormData({
                    industry: wikiInfo.industry || '',
                    founded: wikiInfo.founded || '',
                    headquarters: wikiInfo.headquarters || '',
                    description: wikiInfo.description || '',
                    website: ''
                });
                setMessage(`Found information about ${wikiInfo.title}. Please review and complete any missing details.`);
                setManualInputMode(true);
            } else {
                setCompanyInfo(null);
                setMessage(`Couldn't find information about "${companyName}". Please enter the details manually.`);
                setManualInputMode(true);
            }
        } catch (error) {
            console.error('Error:', error);
            setMessage(`Error searching for company information. Please enter details manually.`);
            setManualInputMode(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoginClick = () => {
        setShowLogin(true);
    };

    const handleCloseLogin = () => {
        setShowLogin(false);
    };

    const submitCompanyInfo = async () => {
        setIsLoading(true);
        setMessage('Submitting company information...');
        
        try {
            const finalCompanyData = {
                name: companyName,
                ...formData,
                source: companyInfo ? 'Wikipedia + User Input' : 'User Input Only'
            };
            
            const response = await fetch('http://localhost:5000/api/company', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(finalCompanyData),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setMessage(`Success! ${data.message}`);
                setCompanyId(data.id);
                setShowRegistration(true);
            } else {
                throw new Error(data.error || 'Failed to submit company information');
            }
        } catch (error) {
            console.error('Error submitting company info:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const goBack = () => {
        navigate('/');
    };

    return (
        <div className="company-page">
            <div className="company-video-background">
                <video autoPlay loop muted playsInline>
                    <source src={employerVideo} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
                <div className="company-video-overlay"></div>
            </div>
            
            {showLogin && <EmployerLogin onClose={handleCloseLogin} />}
            
            <div className="company-container">
                <div className="container-header">
                    <h1 className="container-title">Employer Portal</h1>
                    <p className="container-subtitle">Employer access to posting jobs and managing applications</p>
                </div>
                
                {!manualInputMode ? (
                    <div className="search-section">
                        <form onSubmit={handleSubmit} className="search-form">
                            <div className="form-group">
                                <input
                                    type="text"
                                    id="companyName"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    placeholder="Enter your company name"
                                    className="company-input"
                                    disabled={isLoading}
                                />
                            </div>
                            
                            <div className="buttons-container">
                                <button 
                                    type="submit" 
                                    className="search-button"
                                    disabled={isLoading || !companyName.trim()}
                                >
                                    {isLoading ? 
                                        <span className="loading-spinner"></span> : 
                                        <span>Search</span>
                                    }
                                </button>
                                
                                <button
                                    onClick={handleLoginClick}
                                    className="employee-login-button"
                                >
                                    Employer Login
                                </button>
                                
                                <button
                                    onClick={goBack}
                                    className="back-button"
                                >
                                    Back to Home
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="company-details-form">
                        <h2>Company Details</h2>
                        <h3 className="company-name-heading">{companyName}</h3>
                        
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="industry">Industry</label>
                                <input
                                    type="text"
                                    id="industry"
                                    name="industry"
                                    value={formData.industry}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Technology, Healthcare, etc."
                                    className="form-input"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="founded">Founded</label>
                                <input
                                    type="text"
                                    id="founded"
                                    name="founded"
                                    value={formData.founded}
                                    onChange={handleInputChange}
                                    placeholder="e.g. 2005"
                                    className="form-input"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="headquarters">Headquarters</label>
                                <input
                                    type="text"
                                    id="headquarters"
                                    name="headquarters"
                                    value={formData.headquarters}
                                    onChange={handleInputChange}
                                    placeholder="e.g. San Francisco, CA"
                                    className="form-input"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="website">Website</label>
                                <input
                                    type="text"
                                    id="website"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleInputChange}
                                    placeholder="e.g. https://example.com"
                                    className="form-input"
                                />
                            </div>
                        </div>
                        
                        <div className="form-group full-width">
                            <label htmlFor="description">Company Description</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Provide a brief description of your company..."
                                className="form-textarea"
                                rows="5"
                            />
                        </div>
                        
                        <div className="button-group">
                            <button 
                                onClick={submitCompanyInfo} 
                                className="submit-button"
                                disabled={isLoading}
                            >
                                {isLoading ? 
                                    <span className="loading-spinner"></span> : 
                                    <span>Submit Company Information</span>
                                }
                            </button>
                            
                            <button 
                                onClick={() => setManualInputMode(false)} 
                                className="secondary-button"
                                disabled={isLoading}
                            >
                                <span className="icon">←</span> Search Different Company
                            </button>
                        </div>
                    </div>
                )}
                
                {showRegistration && companyId && (
                    <div className="employer-registration">
                        <EmployerRegistration 
                            companyId={companyId} 
                            companyName={companyName}
                            onComplete={() => {
                                setShowRegistration(false);
                                setShowLogin(true);
                            }}
                        />
                    </div>
                )}
                
                {message && <div className={`message-container ${message.includes('Error') ? 'error' : message.includes('Success') ? 'success' : 'info'}`}>
                    <p className="message">{message}</p>
                </div>}
            </div>
        </div>
    );
};

export default Company;