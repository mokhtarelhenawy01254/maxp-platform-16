/**
 * 👥 HR Services Index
 * تصدير جميع خدمات الموارد البشرية
 */

const employeeService = require('./employeeService');
const departmentService = require('./departmentService');
const attendanceService = require('./attendanceService');
const leaveService = require('./leaveService');
const payrollService = require('./payrollService');
const documentService = require('./documentService');
const salaryHistoryService = require('./salaryHistoryService');
const performanceService = require('./performanceService');
const trainingService = require('./trainingService');
const warningService = require('./warningService');
const promotionService = require('./promotionService');
const shiftService = require('./shiftService');
const benefitService = require('./benefitService');
const goalService = require('./goalService');
const feedbackService = require('./feedbackService');
const resignationService = require('./resignationService');
const rewardManagementService = require('./rewardManagementService');
const rewardTypeService = require('./rewardTypeService');
const kudosService = require('./kudosService');
const streakRewardService = require('./streakRewardService');
const recruitmentService = require('./recruitmentService');
const policyService = require('./policyService');

const permissionService = require('./permissionService');
const advanceService = require('./advanceService');

module.exports = {
  employeeService,
  departmentService,
  attendanceService,
  leaveService,
  payrollService,
  documentService,
  salaryHistoryService,
  performanceService,
  trainingService,
  warningService,
  promotionService,
  shiftService,
  benefitService,
  goalService,
  feedbackService,
  resignationService,
  rewardManagementService,
  rewardTypeService,
  kudosService,
  streakRewardService,
  recruitmentService,
  policyService,
  permissionService,
  advanceService
};
