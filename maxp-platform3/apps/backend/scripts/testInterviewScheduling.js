const companyAwareApi = require('../services/companyAwareApi');

async function testScheduleInterview() {
    try {
        console.log('ðŸ§ª Testing schedule interview API...\n');

        // Test data - make sure to use valid IDs from your database
        const interviewData = {
            applicantId: 'test-applicant-id',  // Replace with real ID
            jobId: 'test-job-id',              // Replace with real ID
            date: new Date('2026-02-10'),
            time: '10:00 AM',
            type: 'VIDEO',
            location: 'Zoom Meeting',
            interviewers: ['Ahmed', 'Sara'],
            notes: 'First interview round'
        };

        console.log('ðŸ“ Sending data:', JSON.stringify(interviewData, null, 2));

        const response = await fetch('http://localhost:3007/api/v1/hr/recruitment/interviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // You need to add authorization token here from a logged-in user
            },
            body: JSON.stringify(interviewData)
        });

        const result = await response.json();

        console.log('\nðŸ“Š Response Status:', response.status);
        console.log('ðŸ“Š Response Body:', JSON.stringify(result, null, 2));

        if (response.ok) {
            console.log('\nâœ… Interview scheduled successfully!');
        } else {
            console.log('\nâŒ Failed to schedule interview');
            console.log('Error:', result.error || result.message);
        }

    } catch (error) {
        console.error('\nâŒ Test failed:', error.message);
    }
}

testScheduleInterview();

