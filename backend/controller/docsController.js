const fs = require('fs').promises;
const path = require('path');

/**
 * Get documentation file content
 * @route GET /api/super-admin/docs/:filename
 * @access Super Admin only
 */
exports.getDocumentation = async (req, res) => {
    try {
        const { filename } = req.params;

        // Whitelist allowed files for security
        const allowedFiles = ['Bugs.md', 'Structure.md', 'TEAM_SYNC.md'];

        if (!allowedFiles.includes(filename)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid documentation file requested'
            });
        }

        // Construct file path (assuming docs are in backend root)
        const filePath = path.join(__dirname, '..', filename);

        // Read file content
        const content = await fs.readFile(filePath, 'utf-8');

        res.json({
            success: true,
            filename,
            content
        });

    } catch (error) {
        console.error('Error reading documentation file:', error);

        if (error.code === 'ENOENT') {
            return res.status(404).json({
                success: false,
                message: 'Documentation file not found'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to read documentation file',
            error: error.message
        });
    }
};
