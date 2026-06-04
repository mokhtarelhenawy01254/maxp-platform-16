const express = require('express');
const devTaskExternalController = require('../controller/devTaskExternalController');
const {
  authenticateExternalDevTaskApi,
  requireExternalDevTaskScope
} = require('../middleware/externalDevTaskApiAuth');

const router = express.Router();

router.use(authenticateExternalDevTaskApi);

router.get('/projects', requireExternalDevTaskScope('dev-tasks:read'), devTaskExternalController.listProjects);
router.get('/team-members', requireExternalDevTaskScope('dev-tasks:read'), devTaskExternalController.listTeamMembers);
router.get('/', requireExternalDevTaskScope('dev-tasks:read'), devTaskExternalController.listTasks);
router.get('/:id', requireExternalDevTaskScope('dev-tasks:read'), devTaskExternalController.getTaskById);
router.post('/', requireExternalDevTaskScope('dev-tasks:write'), devTaskExternalController.createTask);
router.patch('/:id/status', requireExternalDevTaskScope('dev-tasks:write'), devTaskExternalController.updateTaskStatus);

module.exports = router;
