const fs = require('fs');
const path = require('path');

const filesToResolve = [
    'client/src/components/CreateAccount.js',
    'client/src/components/EditJob.js',
    'client/src/components/EmployerRegistration.js',
    'client/src/components/EmployerDashboard.js',
    'client/src/components/EmployerLogin.js',
    'client/src/components/HomePage.js',
    'client/src/components/JobFeed.js',
    'client/src/components/Landing.js',
    'client/src/components/Login.js',
    'client/src/components/ManageJobs.js',
    'client/src/components/MyApplications.js',
    'client/src/components/PostJob.js',
    'client/src/components/Register.js',
    'client/src/components/ResumeDropbox.js',
    'client/src/components/SimplifiedRegisterForm.js',
    'client/src/components/TalentPool.js',
    'client/src/components/UserProfile.js',
    'client/src/components/UserSettings.js'
];

filesToResolve.forEach(relPath => {
    const absPath = path.join(__dirname, '..', '..', relPath);
    if (!fs.existsSync(absPath)) {
        console.log(`Skipping: ${relPath} (does not exist)`);
        return;
    }
    
    let content = fs.readFileSync(absPath, 'utf8');
    
    // Pattern to match Git conflict markers
    const conflictRegex = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> .+/g;
    
    if (conflictRegex.test(content)) {
        // Reset regex index
        conflictRegex.lastIndex = 0;
        content = content.replace(conflictRegex, '$1');
        fs.writeFileSync(absPath, content, 'utf8');
        console.log(`Resolved: ${relPath}`);
    } else {
        console.log(`No conflicts found in: ${relPath}`);
    }
});

console.log('Done resolving client component conflicts.');
