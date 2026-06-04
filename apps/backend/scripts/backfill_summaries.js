require('dotenv').config();
const { runAggregation } = require('../services/statisticsService');

async function main() {
    console.log('ðŸ”„ Running backfill aggregation for the last 7 days...');
    await runAggregation(7);
    console.log('âœ… Backfill complete!');
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

