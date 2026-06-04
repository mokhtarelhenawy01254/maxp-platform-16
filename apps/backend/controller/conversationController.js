/**
 * conversationController.js
 * (Hub file: Re-exports from conversation/ sub-directory)
 * 
 * This file acts as a central access point for all conversation-related logic,
 * maintaining backward compatibility with existing routes and imports.
 * The logic has been modularized into specialized controllers in the ./conversation/ directory.
 */

// Import Sub-Controllers
const conversationCrudController = require('./conversation/conversationCrudController');
const conversationStatsController = require('./conversation/conversationStatsController');
const facebookSyncController = require('./conversation/facebookSyncController');
const messageActionsController = require('./conversation/messageActionsController');
const messagingController = require('./conversation/messagingController');
const postDetailsController = require('./conversation/postDetailsController');

// Export all functions
module.exports = {
  // From conversationCrudController
  deleteConverstation: conversationCrudController.deleteConverstation,
  getConversations: conversationCrudController.getConversations,
  getConversation: conversationCrudController.getConversation,
  updateConversation: conversationCrudController.updateConversation,
  markConversationAsRead: conversationCrudController.markConversationAsRead,
  markConversationAsUnread: conversationCrudController.markConversationAsUnread,
  checkHealth: conversationCrudController.checkHealth,
  bulkUpdateConversations: conversationCrudController.bulkUpdateConversations,
  snoozeConversation: conversationCrudController.snoozeConversation,

  // From conversationStatsController
  getConversationStats: conversationStatsController.getConversationStats,
  getSentMessagesStats: conversationStatsController.getSentMessagesStats,
  getHistoricalPredictionData: conversationStatsController.getHistoricalPredictionData,

  // From facebookSyncController
  syncFacebookMessages: facebookSyncController.syncFacebookMessages,

  // From messageActionsController
  getMessages: messageActionsController.getMessages,
  editMessage: messageActionsController.editMessage,
  deleteMessage: messageActionsController.deleteMessage,
  toggleMessageStar: messageActionsController.toggleMessageStar,
  toggleMessageReaction: messageActionsController.toggleMessageReaction,

  // From messagingController
  postMessageConverstation: messagingController.postMessageConverstation,
  uploadFile: messagingController.uploadFile,
  postReply: messagingController.postReply,
  sendExistingImage: messagingController.sendExistingImage,
  sendMediaMessage: messagingController.sendMediaMessage,
  sendLocationMessage: messagingController.sendLocationMessage,

  // From postDetailsController
  getConversationPostDetails: postDetailsController.getConversationPostDetails,
  getPostDetails: postDetailsController.getPostDetails,
  updatePostFeaturedProduct: postDetailsController.updatePostFeaturedProduct
};
