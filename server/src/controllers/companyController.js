const Company = require('../models/Company');

const handleCompanyInfo = async (req, res) => {
    try {
        const companyData = req.body;
        
        if (!companyData.name) {
            return res.status(400).json({ error: 'Company name is required' });
        }
        
        console.log('Received company data:', companyData);
       
        const company = new Company(companyData);
        await company.save();
        
        return res.status(200).json({
            message: 'Company information saved successfully',
            company: companyData.name,
            id: company._id
        });
    } catch (error) {
        console.error('Error processing company info:', error.message);
        return res.status(500).json({ 
            error: 'Failed to process company information',
            message: error.message
        });
    }
};

module.exports = {
    handleCompanyInfo
};