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

// Goals routes (MUST be before /:id)
router.get('/goals', requireExternalTaskScope(['goals:read', 'tasks:read']), taskExternalController.listGoals);
router.get('/goals/:id', requireExternalTaskScope(['goals:read', 'tasks:read']), taskExternalController.getGoalById);
router.post('/goals', requireExternalTaskScope(['goals:write', 'tasks:write']), taskExternalController.createGoal);
router.patch('/goals/:id/progress', requireExternalTaskScope(['goals:write', 'tasks:write']), taskExternalController.updateGoalProgress);
router.post('/goals/:id/progress', requireExternalTaskScope(['goals:write', 'tasks:write']), taskExternalController.updateGoalProgress);
router.patch('/goals/:id', requireExternalTaskScope(['goals:write', 'tasks:write']), taskExternalController.updateGoal);
router.put('/goals/:id', requireExternalTaskScope(['goals:write', 'tasks:write']), taskExternalController.updateGoal);

router.get('/', requireExternalTaskScope('tasks:read'), taskExternalController.listTasks);
router.get('/:id', requireExternalTaskScope('tasks:read'), taskExternalController.getTaskById);
router.post('/', requireExternalTaskScope('tasks:write'), taskExternalController.createTask);
router.patch('/:id/status', requireExternalTaskScope('tasks:write'), taskExternalController.updateTaskStatus);
router.patch('/:id', requireExternalTaskScope('tasks:write'), taskExternalController.updateTask);
router.put('/:id', requireExternalTaskScope('tasks:write'), taskExternalController.updateTask);

module.exports = router;
