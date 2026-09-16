const monitorService = require('../../services/monitorService');

async function heartbeat(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const deviceInfo = req.body;
    await monitorService.updateHeartbeat(companyId, userId, deviceInfo);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in heartbeat:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function processActivityBatch(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { activities } = req.body;
    if (!activities || !Array.isArray(activities)) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    await monitorService.processActivityBatch(companyId, userId, activities);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in processActivityBatch:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function processAppUsageBatch(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const appData = req.body.appData || req.body.apps;
    if (!appData || !Array.isArray(appData)) {
      return res.status(400).json({ error: 'Invalid input: apps or appData array required' });
    }
    await monitorService.processAppUsageBatch(companyId, userId, appData);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in processAppUsageBatch:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function processWebUsageBatch(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const webData = req.body.webData || req.body.websites;
    if (!webData || !Array.isArray(webData)) {
      return res.status(400).json({ error: 'Invalid input: websites or webData array required' });
    }
    await monitorService.processWebUsageBatch(companyId, userId, webData);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in processWebUsageBatch:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  heartbeat,
  processActivityBatch,
  processAppUsageBatch,
  processWebUsageBatch
};
