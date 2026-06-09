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

const updateCompanyInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = {
            name: req.body.name,
            industry: req.body.industry,
            founded: req.body.founded,
            headquarters: req.body.headquarters,
            description: req.body.description,
            website: req.body.website
        };

        if (!updates.name || !updates.name.trim()) {
            return res.status(400).json({ error: 'Company name is required' });
        }

        const company = await Company.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        );

        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        return res.json(company);
    } catch (error) {
        console.error('Error updating company info:', error.message);
        return res.status(500).json({
            error: 'Failed to update company information',
            message: error.message
        });
    }
};

module.exports = {
    handleCompanyInfo,
    updateCompanyInfo
};
