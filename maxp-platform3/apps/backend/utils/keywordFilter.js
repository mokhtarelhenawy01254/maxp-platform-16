/**
 * Keyword Filter Utility
 * 
 * Provides functions to check text against a list of negative keywords.
 * Performs case-insensitive matching and handles various Arabic character variations.
 */

/**
 * Normalizes Arabic text for better matching (e.g., handling different Alef/Yas forms)
 * @param {string} text 
 * @returns {string}
 */
function normalizeArabic(text) {
    if (!text) return "";
    return text
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/[ىي]/g, 'ي')
        .replace(/ئ/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/[\u064B-\u0652]/g, ''); // Remove Harakat
}

/**
 * Checks if a text contains any of the negative keywords.
 * @param {string} text - The comment text to check.
 * @param {string|string[]} keywords - Comma-separated string or array of keywords.
 * @returns {Object|null} - Returns the matched keyword object or null if no match.
 */
function checkNegativeKeywords(text, keywords) {
    if (!text || !keywords) return null;

    let keywordList = [];
    if (typeof keywords === 'string') {
        keywordList = keywords.split(/[,\n]/).map(k => k.trim()).filter(k => k.length > 0);
    } else if (Array.isArray(keywords)) {
        keywordList = keywords.map(k => k.trim()).filter(k => k.length > 0);
    }

    if (keywordList.length === 0) return null;

    const normalizedText = normalizeArabic(text.toLowerCase());

    for (const keyword of keywordList) {
        const normalizedKeyword = normalizeArabic(keyword.toLowerCase());

        // Exact word boundary matching for some keywords, partial for others?
        // For now, let's do a simple includes check as requested "if keyword in any sentence"
        if (normalizedText.includes(normalizedKeyword)) {
            return {
                matched: true,
                keyword: keyword,
                normalizedKeyword: normalizedKeyword
            };
        }
    }

    return null;
}

module.exports = {
    checkNegativeKeywords,
    normalizeArabic
};
