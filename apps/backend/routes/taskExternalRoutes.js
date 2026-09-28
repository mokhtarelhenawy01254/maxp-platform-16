const express = require('express');
const taskExternalController = require('../controller/taskExternalController');
const {
  authenticateExternalTaskApi,
  requireExternalTaskScope
} = require('../middleware/externalTaskApiAuth');

const router = express.Router();

router.use(authenticateExternalTaskApi);

router.get('/projects', requireExternalTaskScope('tasks:read'), taskExternalController.listProjects);
router.get('/users', requireExternalTaskScope('tasks:read'), taskExternalController.listUsers);
router.get('/', requireExternalTaskScope('tasks:read'), taskExternalController.listTasks);
router.get('/:id', requireExternalTaskScope('tasks:read'), taskExternalController.getTaskById);
router.post('/', requireExternalTaskScope('tasks:write'), taskExternalController.createTask);
router.patch('/:id/status', requireExternalTaskScope('tasks:write'), taskExternalController.updateTaskStatus);
router.patch('/:id', requireExternalTaskScope('tasks:update'), taskExternalController.updateTask);
router.put('/:id', requireExternalTaskScope('tasks:update'), taskExternalController.updateTask);

module.exports = router;
