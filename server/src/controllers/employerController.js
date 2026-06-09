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
                companyName,
                email: employer.email || '',
                phone: employer.phone || ''
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

const getEmployerSettings = async (req, res) => {
    try {
        const employer = await Employer.findById(req.params.id);

        if (!employer) {
            return res.status(404).json({ error: 'Employer not found' });
        }

        return res.json({
            id: employer._id,
            username: employer.username,
            email: employer.email || '',
            phone: employer.phone || '',
            companyId: employer.companyId,
            notificationPreferences: {
                newApplications: employer.notificationPreferences?.newApplications ?? true,
                newCandidates: employer.notificationPreferences?.newCandidates ?? true,
                emailNotifications: employer.notificationPreferences?.emailNotifications ?? true
            }
        });
    } catch (error) {
        console.error('Error fetching employer settings:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch employer settings',
            message: error.message
        });
    }
};

const updateEmployerContact = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, phone } = req.body;

        if (email) {
            const existingEmployer = await Employer.findOne({
                email: email.toLowerCase(),
                _id: { $ne: id }
            });

            if (existingEmployer) {
                return res.status(400).json({ error: 'Email already in use by another employer account' });
            }
        }

        const employer = await Employer.findById(id);

        if (!employer) {
            return res.status(404).json({ error: 'Employer not found' });
        }

        employer.email = email ? email.toLowerCase() : '';
        employer.phone = phone || '';
        await employer.save();

        return res.json({
            message: 'Employer contact details updated successfully',
            employer: {
                id: employer._id,
                email: employer.email || '',
                phone: employer.phone || '',
                username: employer.username,
                companyId: employer.companyId
            }
        });
    } catch (error) {
        console.error('Error updating employer contact:', error.message);
        return res.status(500).json({
            error: 'Failed to update employer contact details',
            message: error.message
        });
    }
};

const updateEmployerPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        const employer = await Employer.findById(id);

        if (!employer) {
            return res.status(404).json({ error: 'Employer not found' });
        }

        const isMatch = await employer.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        employer.password = newPassword;
        await employer.save();

        return res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating employer password:', error.message);
        return res.status(500).json({
            error: 'Failed to update employer password',
            message: error.message
        });
    }
};

const updateEmployerNotificationPreferences = async (req, res) => {
    try {
        const { id } = req.params;
        const employer = await Employer.findById(id);

        if (!employer) {
            return res.status(404).json({ error: 'Employer not found' });
        }

        employer.notificationPreferences = {
            newApplications: req.body.newApplications ?? employer.notificationPreferences?.newApplications ?? true,
            newCandidates: req.body.newCandidates ?? employer.notificationPreferences?.newCandidates ?? true,
            emailNotifications: req.body.emailNotifications ?? employer.notificationPreferences?.emailNotifications ?? true
        };

        await employer.save();

        return res.json({
            message: 'Notification preferences updated successfully',
            notificationPreferences: employer.notificationPreferences
        });
    } catch (error) {
        console.error('Error updating employer notification preferences:', error.message);
        return res.status(500).json({
            error: 'Failed to update notification preferences',
            message: error.message
        });
    }
};

module.exports = {
    registerEmployer,
    loginEmployer,
    getEmployerSettings,
    updateEmployerContact,
    updateEmployerPassword,
    updateEmployerNotificationPreferences
};
