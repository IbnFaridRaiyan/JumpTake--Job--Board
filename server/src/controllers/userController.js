const User = require('../models/User');
const JobSeeker = require('../models/JobSeeker');
const jwt = require('jsonwebtoken');


const JWT_SECRET = process.env.JWT_SECRET || 'jumptake-jwt-secret';

const createAccount = async (req, res) => {
    try {
        const { email, password, jobSeekerId } = req.body;
        
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
       
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        
        
        if (jobSeekerId) {
            const jobSeeker = await JobSeeker.findById(jobSeekerId);
            if (!jobSeeker) {
                return res.status(404).json({ error: 'Job seeker profile not found' });
            }
        }
        
      
        const user = new User({
            email,
            password,
            jobSeekerId
        });
        
        await user.save();
        
       
        return res.status(201).json({
            message: 'User account created successfully',
            user: {
                id: user._id,
                email: user.email,
                jobSeekerId: user.jobSeekerId
            }
        });
    } catch (error) {
        console.error('Error creating user account:', error.message);
        return res.status(500).json({ 
            error: 'Failed to create user account',
            message: error.message
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
   
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
     
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
     
        const token = jwt.sign(
            { id: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '1d' } 
        );
        
     
        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                jobSeekerId: user.jobSeekerId
            }
        });
    } catch (error) {
        console.error('Error during login:', error.message);
        return res.status(500).json({ 
            error: 'Login failed',
            message: error.message
        });
    }
};


const updateEmail = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { email } = req.body;
        
    
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
       
        const existingUser = await User.findOne({ email, _id: { $ne: userId } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email is already in use' });
        }
        
      
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.email = email;
        await user.save();
        
        return res.status(200).json({
            message: 'Email updated successfully',
            user: {
                id: user._id,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Error updating email:', error.message);
        return res.status(500).json({ 
            error: 'Failed to update email',
            message: error.message
        });
    }
};


const updatePassword = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { currentPassword, newPassword } = req.body;
        
      
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
       
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
     
        user.password = newPassword;
        await user.save();
        
        return res.status(200).json({
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Error updating password:', error.message);
        return res.status(500).json({ 
            error: 'Failed to update password',
            message: error.message
        });
    }
};


const deleteUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { password } = req.body;
        
     
        if (!password) {
            return res.status(400).json({ error: 'Password is required to delete account' });
        }
        
       
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
      
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Password is incorrect' });
        }
        
      
        await Application.deleteMany({ user: userId });
        
       
        await User.findByIdAndDelete(userId);
        
        return res.status(200).json({
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error.message);
        return res.status(500).json({ 
            error: 'Failed to delete account',
            message: error.message
        });
    }
};


const updateNotificationPreferences = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { 
            jobRecommendations,
            recommendationFrequency,
            applicationUpdates, 
            securityAlerts, 
            marketingEmails 
        } = req.body;
        
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        
        user.notificationPreferences = {
            jobRecommendations,
            recommendationFrequency,
            applicationUpdates,
            securityAlerts,
            marketingEmails
        };
        
        await user.save();
        
        return res.status(200).json({
            message: 'Notification preferences updated successfully'
        });
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        return res.status(500).json({ 
            error: 'Failed to update notification preferences',
            message: error.message
        });
    }
};


const getNotificationPreferences = async (req, res) => {
    try {
        const userId = req.params.userId;
        
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        
        return res.status(200).json(user.notificationPreferences || {
            jobRecommendations: true,
            recommendationFrequency: 'weekly',
            applicationUpdates: true,
            securityAlerts: true,
            marketingEmails: false
        });
    } catch (error) {
        console.error('Error getting notification preferences:', error);
        return res.status(500).json({ 
            error: 'Failed to get notification preferences',
            message: error.message
        });
    }
};

module.exports = {
    createAccount,
    login,
    updateEmail,
    updatePassword,
    deleteUser,
    updateNotificationPreferences,
    getNotificationPreferences
};