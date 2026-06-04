describe('socketService worker emitter compatibility', () => {
  let socketService;
  let originalIo;
  let originalEmitter;
  let originalCompanyRooms;
  let emitMock;
  let toMock;
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    jest.resetModules();
    socketService = require('../../services/socketService');
    originalIo = socketService.io;
    originalEmitter = socketService.emitter;
    originalCompanyRooms = socketService.companyRooms;
    emitMock = jest.fn();
    toMock = jest.fn(() => ({ emit: emitMock }));
    socketService.io = null;
    socketService.emitter = { to: toMock };
    socketService.companyRooms = new Map();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    socketService.io = originalIo;
    socketService.emitter = originalEmitter;
    socketService.companyRooms = originalCompanyRooms;
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('emits new conversation events from a worker Redis emitter without requiring local socket rooms', () => {
    const conversation = { id: 'conversation-1' };

    expect(() => {
      socketService.emitNewConversation('company-1', conversation);
    }).not.toThrow();

    expect(toMock).toHaveBeenCalledWith('company_company-1');
    expect(emitMock).toHaveBeenCalledWith('conversation:new', conversation);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
