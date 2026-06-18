const User = require('../models/User');

const normalizeFirstName = (name = '') => {
    const firstName = String(name).trim().split(/\s+/)[0] || 'candidate';
    const normalized = firstName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18);
    return normalized || 'candidate';
};

const generateJumpTakeId = async (name) => {
    const prefix = normalizeFirstName(name);

    for (let attempt = 0; attempt < 30; attempt += 1) {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const candidateId = `${prefix}-${suffix}`;
        const existing = await User.exists({ jumptakeId: candidateId });

        if (!existing) {
            return candidateId;
        }
    }

    return `${prefix}-${Date.now().toString(36)}`;
};

module.exports = {
    generateJumpTakeId
};
