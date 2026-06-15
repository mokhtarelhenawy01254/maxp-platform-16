#!/usr/bin/env node
/**
 * Documentation Compliance Check
 * Ensures that any code changes include corresponding documentation updates
 * Author: Team Sync System
 * Date: 2026-02-18
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const REQUIRED_DOC_FILES = [
    // Domain-specific doc directories (any file in these counts as documentation)
    'backend/docs/storefront/',
    'backend/docs/orders/',
    'backend/docs/whatsapp/',
    'backend/docs/hr/',
    'backend/docs/infrastructure/',
];

const BYPASS_FLAG = '[no-doc]';
const BYPASS_PATTERNS = [
    /^docs?:/,
    /^readme/i,
    /^\.github/,
    /^\.gitignore/,
    /^memory\.md$/i,
    /^memory\//,
    /package-lock\.json$/,
    /yarn\.lock$/
];

function main() {
    try {
        console.log('📚 Documentation Compliance Check Started...');

        // Get changed files
        const changedFiles = getChangedFiles();
        if (changedFiles.length === 0) {
            console.log('ℹ️ No files changed, skipping documentation check');
            process.exit(0);
        }

        // Only trust the latest commit message bypass when we are validating
        // committed/CI changes. In local staged mode, the latest commit message
        // belongs to the previous commit and can incorrectly bypass new work.
        const commitMessage = getCommitMessage();
        const stagedFilesPresent = hasStagedFiles();
        if ((!stagedFilesPresent || process.env.CI) && commitMessage.includes(BYPASS_FLAG)) {
            console.log(`✅ Documentation check bypassed due to ${BYPASS_FLAG} flag`);
            process.exit(0);
        }

        if (stagedFilesPresent && commitMessage.includes(BYPASS_FLAG)) {
            console.log(`ℹ️ Ignoring previous ${BYPASS_FLAG} flag while validating current staged changes`);
        }

        console.log(`📝 Found ${changedFiles.length} changed files:`);
        changedFiles.forEach(file => console.log(`   - ${file}`));

        // Check if changes require documentation
        const requiresDocumentation = changedFiles.some(file => 
            !BYPASS_PATTERNS.some(pattern => pattern.test(file))
        );

        if (!requiresDocumentation) {
            console.log('✅ Changes only affect documentation or config files, no doc update required');
            process.exit(0);
        }

        // Check if documentation files were updated
        const docFilesChanged = changedFiles.filter(file => 
            REQUIRED_DOC_FILES.some(docFile => file.includes(docFile))
        );

        if (docFilesChanged.length === 0) {
            console.error(`❌ Documentation Compliance Failure!`);
            console.error('');
            console.error('🚨 Code changes detected without corresponding documentation updates.');
            console.error('');
            console.error('📋 Required documentation files:');
            REQUIRED_DOC_FILES.forEach(file => {
                const exists = fs.existsSync(path.join(process.cwd(), file)) ? '✓' : '✗';
                console.error(`   ${exists} ${file}`);
            });
            console.error('');
            console.error('💡 To fix this:');
            console.error('   1. Update relevant documentation files with your changes');
            console.error('   2. Commit the documentation updates');
            console.error(`   3. Or add "${BYPASS_FLAG}" to your commit message if docs aren't needed`);
            console.error('');
            console.error('📝 Changed files that require documentation:');
            changedFiles.filter(file => 
                !BYPASS_PATTERNS.some(pattern => pattern.test(file))
            ).forEach(file => console.error(`   - ${file}`));
            
            process.exit(1);
        }

        console.log('✅ Documentation compliance check passed!');
        console.log(`📚 Updated documentation files: ${docFilesChanged.join(', ')}`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Documentation compliance check failed:', error.message);
        
        // In case of script errors, don't block deployment unless it's clearly a compliance issue
        if (error.message.includes('git') && process.env.CI) {
            console.log('⚠️ Git command failed in CI environment, allowing deployment to continue');
            process.exit(0);
        }
        
        process.exit(1);
    }
}

function getCommitMessage() {
    try {
        return execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
    } catch (error) {
        console.warn('⚠️ Could not get commit message, assuming documentation required');
        return '';
    }
}

function getChangedFiles() {
    try {
        if (!process.env.CI) {
            const stagedOutput = execSync('git diff --name-only --cached', { encoding: 'utf-8' });
            const stagedFiles = stagedOutput.trim().split('\n').filter(file => file.length > 0);
            if (stagedFiles.length > 0) {
                return stagedFiles;
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not read staged files, falling back to commit diff');
    }

    try {
        // CI / post-commit fallback: inspect the latest commit diff
        const output = execSync('git diff-tree --no-commit-id --name-only -r HEAD', { encoding: 'utf-8' });
        return output.trim().split('\n').filter(file => file.length > 0);
    } catch (error) {
        console.warn('⚠️ Could not determine changed files, assuming documentation required');
        return ['unknown-changes'];
    }
}

function hasStagedFiles() {
    try {
        const stagedOutput = execSync('git diff --name-only --cached', { encoding: 'utf-8' });
        return stagedOutput.trim().length > 0;
    } catch (error) {
        return false;
    }
}

function checkFileExists(filePath) {
    return fs.existsSync(path.join(process.cwd(), filePath));
}

// Run the main function
if (require.main === module) {
    main();
}

module.exports = { main, getChangedFiles, getCommitMessage };
