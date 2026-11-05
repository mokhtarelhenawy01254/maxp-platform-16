const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Process an image: Resize and convert to WebP
 * @param {string} inputPath - Absolute path to the original image
 * @param {string} outputDir - Directory to save the processed image
 * @param {Object} options - Processing options (width, quality)
 * @returns {Promise<Object>} - Processed file info (filename, size, path)
 */
const processImage = async (inputPath, outputDir, options = {}) => {
    const {
        width = 1200,
        quality = 80,
        keepOriginal = false
    } = options;

    try {
        const filename = path.basename(inputPath, path.extname(inputPath)) + '.webp';
        const outputPath = path.join(outputDir, filename);

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const isSameFile = path.resolve(inputPath) === path.resolve(outputPath);

        // Read input into buffer to eliminate file lock handles and prevent "Cannot use same file for input and output"
        const inputBuffer = await fs.promises.readFile(inputPath);
        const tempOutputPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;
        let info;
        try {
            const p = sharp(inputBuffer, { limitInputPixels: 40000000 })
                .rotate()
                .resize(width, null, {
                    withoutEnlargement: true,
                    fit: 'inside'
                })
                .webp({ quality });
            info = await p.toFile(tempOutputPath);
            if (typeof p.destroy === 'function') p.destroy();

            try {
                await fs.promises.rename(tempOutputPath, outputPath);
            } catch (_) {
                await fs.promises.copyFile(tempOutputPath, outputPath);
                await fs.promises.unlink(tempOutputPath).catch(() => {});
            }
        } catch (procErr) {
            try {
                if (fs.existsSync(tempOutputPath)) await fs.promises.unlink(tempOutputPath);
            } catch (_) {}
            throw procErr;
        }

        // Delete original if not requested to keep and input is a different file
        if (!keepOriginal && !isSameFile) {
            try {
                fs.unlinkSync(inputPath);
            } catch (err) {
                console.error(`[imageProcessor] Error deleting original file: ${err.message}`);
            }
        }

        return {
            filename,
            path: outputPath,
            size: info.size,
            format: 'webp',
            width: info.width,
            height: info.height
        };
    } catch (error) {
        console.error(`[imageProcessor] Error processing image: ${error.message}`);
        throw error;
    }
};

/**
 * Check if a file is a processable image
 * @param {string} mimetype 
 * @returns {boolean}
 */
const isProcessableImage = (mimetype) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    return allowedTypes.includes(mimetype);
};

module.exports = {
    processImage,
    isProcessableImage
};
