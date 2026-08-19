const User = require('../models/User');
const Company = require('../models/Company');

const normalizeFirstName = (name = '') => {
    const firstName = String(name).trim().split(/\s+/)[0] || 'candidate';
    const normalized = firstName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18);
    return normalized || 'candidate';
};

const normalizeCompanyName = (name = '') => {
    const normalized = String(name || 'company')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 28);
    return normalized || 'company';
};

const jumpTakeIdExists = async (jumptakeId) => {
    const [userExists, companyExists] = await Promise.all([
        User.exists({ jumptakeId }),
        Company.exists({ jumptakeId })
    ]);
    return Boolean(userExists || companyExists);
};

const generateJumpTakeId = async (name) => {
    const prefix = normalizeFirstName(name);

    for (let attempt = 0; attempt < 30; attempt += 1) {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const candidateId = `${prefix}-${suffix}`;
        if (!await jumpTakeIdExists(candidateId)) {
            return candidateId;
        }
    }

    return `${prefix}-${Date.now().toString(36)}`;
};

const generateCompanyJumpTakeId = async (name) => {
    const prefix = normalizeCompanyName(name);

    for (let attempt = 0; attempt < 30; attempt += 1) {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const companyId = `${prefix}-${suffix}`;
        if (!await jumpTakeIdExists(companyId)) {
            return companyId;
        }
    }

    return `${prefix}-${Date.now().toString(36)}`;
};

const ensureCompanyJumpTakeId = async (company) => {
    if (!company || company.jumptakeId) return company;
    company.jumptakeId = await generateCompanyJumpTakeId(company.name);
    await company.save();
    return company;
};

module.exports = {
    generateJumpTakeId,
    generateCompanyJumpTakeId,
    ensureCompanyJumpTakeId
};
