const ROUTING_MODES = {
  SINGLE: 'SINGLE',
  ROUND_ROBIN: 'ROUND_ROBIN',
  TEAM: 'TEAM'
};
const DISTRIBUTION_STRATEGIES = {
  ROUND_ROBIN: 'ROUND_ROBIN',
  LEAST_LOADED: 'LEAST_LOADED'
};
const getAssignmentRoutingUserIds = async () => [];
const normalizeRoutingMode = (m) => m || ROUTING_MODES.SINGLE;
const normalizeDistributionStrategy = (s) => s || DISTRIBUTION_STRATEGIES.ROUND_ROBIN;
const parseRoutingUserIds = () => [];
const serializeRoutingUserIds = () => '[]';
module.exports = {
  ROUTING_MODES, DISTRIBUTION_STRATEGIES,
  getAssignmentRoutingUserIds, normalizeRoutingMode,
  normalizeDistributionStrategy, parseRoutingUserIds,
  serializeRoutingUserIds
};
