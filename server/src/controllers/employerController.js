const Employer = require('../models/Employer');
const Company = require('../models/Company');
const jwt = require('jsonwebtoken');


const JWT_SECRET = process.env.JWT_SECRET || 'jumptake-jwt-secret';


const registerEmployer = async (req, res) => {
    try {
        const { username, password, companyId } = req.body;
        
        
        if (!username || !password || !companyId) {
            return res.status(400).json({ error: 'Username, password, and company ID are required' });
        }
        
       
        const existingEmployer = await Employer.findOne({ username });
        if (existingEmployer) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        
        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        
       
        const employer = new Employer({
            username,
            password,
            companyId
        });
        
        await employer.save();
        
      
        return res.status(201).json({
            message: 'Employer account created successfully',
            employer: {
                id: employer._id,
                username: employer.username,
                companyId: employer.companyId
            }
        });
    } catch (error) {
        console.error('Error creating employer account:', error.message);
        return res.status(500).json({ 
            error: 'Failed to create employer account',
            message: error.message
        });
    }
};


const loginEmployer = async (req, res) => {
    try {
        const { username, password } = req.body;
    
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
      
        const employer = await Employer.findOne({ username });
        if (!employer) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
       
        const isMatch = await employer.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
     
        const company = await Company.findById(employer.companyId);
        const companyName = company ? company.name : 'Unknown Company';
        
       
        const token = jwt.sign(
            { id: employer._id, username: employer.username, companyId: employer.companyId },
            JWT_SECRET,
            { expiresIn: '1d' } 
        );
        
       
        return res.status(200).json({
            message: 'Login successful',
            token,
            employer: {
                id: employer._id,
                username: employer.username,
                companyId: employer.companyId,
                companyName
            }
        });
    } catch (error) {
        console.error('Error during employer login:', error.message);
        return res.status(500).json({ 
            error: 'Login failed',
            message: error.message
        });
    }
};

module.exports = {
    registerEmployer,
    loginEmployer
};