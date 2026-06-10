const generateDigits = (length = 6) => Array.from(
    { length },
    () => Math.floor(Math.random() * 10)
).join('');

const generateUniqueReferenceNumber = async (Model, fieldName, prefix, length = 6) => {
    for (let attempt = 0; attempt < 25; attempt += 1) {
        const candidate = `${prefix}-${generateDigits(length)}`;
        const exists = await Model.exists({ [fieldName]: candidate });

        if (!exists) {
            return candidate;
        }
    }

    throw new Error(`Failed to generate a unique ${fieldName}`);
};

const ensureReferenceNumber = async (document, Model, fieldName, prefix, length = 6) => {
    if (!document || document[fieldName]) {
        return document;
    }

    document[fieldName] = await generateUniqueReferenceNumber(Model, fieldName, prefix, length);
    await document.save();
    return document;
};

const ensureReferenceNumbers = async (documents, Model, fieldName, prefix, length = 6) => {
    if (!Array.isArray(documents) || documents.length === 0) {
        return documents;
    }

    await Promise.all(documents.map((document) => ensureReferenceNumber(document, Model, fieldName, prefix, length)));
    return documents;
};

module.exports = {
    generateUniqueReferenceNumber,
    ensureReferenceNumber,
    ensureReferenceNumbers
};
