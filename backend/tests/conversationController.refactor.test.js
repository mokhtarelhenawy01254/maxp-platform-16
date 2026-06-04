const path = require('path');

describe('Conversation Controller Refactoring', () => {

    describe('Hub Controller Wiring', () => {
        let conversationController;

        // Mocks for sub-controllers
        const mockCrud = {
            getConversations: jest.fn(),
            getConversation: jest.fn(),
            deleteConverstation: jest.fn(),
            updateConversation: jest.fn(),
            markConversationAsRead: jest.fn(),
            markConversationAsUnread: jest.fn(),
            checkHealth: jest.fn(),
            bulkUpdateConversations: jest.fn(),
            snoozeConversation: jest.fn()
        };

        const mockMessaging = {
            postMessageConverstation: jest.fn(),
            uploadFile: jest.fn(),
            postReply: jest.fn(),
            sendExistingImage: jest.fn(),
            sendMediaMessage: jest.fn(),
            sendLocationMessage: jest.fn()
        };

        const mockPostDetails = {
            getConversationPostDetails: jest.fn(),
            getPostDetails: jest.fn(),
            updatePostFeaturedProduct: jest.fn()
        };

        const mockMessageActions = {
            getMessages: jest.fn(),
            editMessage: jest.fn(),
            deleteMessage: jest.fn(),
            toggleMessageStar: jest.fn(),
            toggleMessageReaction: jest.fn()
        };

        const mockStats = {
            getConversationStats: jest.fn(),
            getSentMessagesStats: jest.fn(),
            getHistoricalPredictionData: jest.fn()
        };

        const mockFacebookSync = {
            syncFacebookMessages: jest.fn()
        };

        beforeAll(() => {
            // Mock the sub-controllers
            jest.mock('../controller/conversation/conversationCrudController', () => mockCrud);
            jest.mock('../controller/conversation/messagingController', () => mockMessaging);
            jest.mock('../controller/conversation/postDetailsController', () => mockPostDetails);
            jest.mock('../controller/conversation/messageActionsController', () => mockMessageActions);
            jest.mock('../controller/conversation/conversationStatsController', () => mockStats);
            jest.mock('../controller/conversation/facebookSyncController', () => mockFacebookSync);

            // Require the hub controller
            conversationController = require('../controller/conversationController');
        });

        afterAll(() => {
            jest.resetModules();
        });

        test('should export all CRUD functions', () => {
            expect(conversationController.getConversations).toBe(mockCrud.getConversations);
            expect(conversationController.deleteConverstation).toBe(mockCrud.deleteConverstation);
            expect(conversationController.checkHealth).toBe(mockCrud.checkHealth);
        });

        test('should export all Messaging functions', () => {
            expect(conversationController.postMessageConverstation).toBe(mockMessaging.postMessageConverstation);
            expect(conversationController.sendMediaMessage).toBe(mockMessaging.sendMediaMessage);
        });

        test('should export all PostDetails functions', () => {
            expect(conversationController.getConversationPostDetails).toBe(mockPostDetails.getConversationPostDetails);
        });

        test('should export all MessageActions functions', () => {
            expect(conversationController.getMessages).toBe(mockMessageActions.getMessages);
            expect(conversationController.editMessage).toBe(mockMessageActions.editMessage);
        });

        test('should export all Stats functions', () => {
            expect(conversationController.getConversationStats).toBe(mockStats.getConversationStats);
        });

        test('should export Facebook Sync', () => {
            expect(conversationController.syncFacebookMessages).toBe(mockFacebookSync.syncFacebookMessages);
        });
    });

    describe('Messaging Controller Compilation', () => {
        // Test that messagingController.js itself loads without error (dependency check)

        beforeEach(() => {
            jest.resetModules();
            // Mock external dependencies of messagingController
            jest.mock('crypto', () => ({ randomBytes: () => 'mock' }));
            jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));
            jest.mock('../services/sharedDatabase', () => ({
                getSharedPrismaClient: () => ({}),
                executeWithRetry: jest.fn()
            }));
            jest.mock('../utils/imageProcessor', () => ({ processImage: jest.fn() }));
            jest.mock('../services/socketService', () => ({
                getIO: () => ({ to: () => ({ emit: jest.fn() }) })
            }));
            jest.mock('../services/TelegramBotService', () => ({}));
            jest.mock('../utils/pageTokenCache', () => ({ get: jest.fn() }));
            jest.mock('axios', () => ({}));
            jest.mock('fs', () => ({}));
            jest.mock('path', () => ({}));
            jest.mock('../utils/messageHealthChecker', () => ({}));

            // Note: we are NOT mocking conversationShared.js because we want to test its integration
            // But we might need to if it has side effects. 
            // conversationShared.js is simple state, so allowed to load.
        });

        test('should load messagingController without error', () => {
            expect(() => {
                require('../controller/conversation/messagingController');
            }).not.toThrow();
        });

        test('methods should be functions', () => {
            const mc = require('../controller/conversation/messagingController');
            expect(typeof mc.postMessageConverstation).toBe('function');
            expect(typeof mc.sendMediaMessage).toBe('function');
        });
    });
});
