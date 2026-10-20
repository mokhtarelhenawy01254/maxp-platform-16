import React from 'react';
import { createPortal } from 'react-dom';
import type { WorkspaceOrder } from './types';
import { WorkspaceWhatsAppTemplates } from './WorkspaceWhatsAppTemplates';
import { WorkspaceWhatsAppMessages } from './WorkspaceWhatsAppMessages';
import { WorkspaceWhatsAppHeader } from './WorkspaceWhatsAppHeader';
import { WorkspaceWhatsAppModeTabs } from './WorkspaceWhatsAppModeTabs';
import { WorkspaceWhatsAppTemplateComposer } from './WorkspaceWhatsAppTemplateComposer';
import { WorkspaceWhatsAppFreeComposer } from './WorkspaceWhatsAppFreeComposer';
import { normalizeArabicDigits, sanitizeWhatsAppPhone } from './whatsappHelpers';
import {
  useWorkspaceWhatsAppController,
  type WhatsAppSession,
} from './useWorkspaceWhatsAppController';

// eslint-disable-next-line react-refresh/only-export-components
export { normalizeArabicDigits, sanitizeWhatsAppPhone };
export type { WhatsAppSession };

export interface WorkspaceWhatsAppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: WorkspaceOrder | null;
}

export const WorkspaceWhatsAppDrawer: React.FC<WorkspaceWhatsAppDrawerProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  const {
    panelRef,
    isArabic,
    activeSession,
    sessionDisplay,
    messages,
    loadingMessages,
    messagesEndRef,
    templates,
    activeTab,
    setActiveTab,
    messageText,
    setMessageText,
    isSending,
    activeTemplate,
    templateVars,
    setTemplateVars,
    templateVarIndexes,
    filledTemplateBody,
    customerPhone,
    externalWaUrl,
    handleSelectTemplate,
    handleCancelTemplate,
    handleSendTemplate,
    handleSendMessage,
  } = useWorkspaceWhatsAppController({ isOpen, onClose, order });

  if (!isOpen || !order) return null;

  const drawerContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={isArabic ? 'محادثة واتساب مع العميل' : 'Customer WhatsApp conversation'}
        className="flex h-full w-full max-w-xl flex-col bg-card shadow-2xl border-s border-border text-foreground transition-transform animate-in slide-in-from-end duration-200"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <WorkspaceWhatsAppHeader
          order={order}
          isArabic={isArabic}
          customerPhone={customerPhone}
          sessionDisplay={sessionDisplay}
          hasActiveSession={Boolean(activeSession)}
          externalWaUrl={externalWaUrl}
          onClose={onClose}
        />

        {/* Mode Selector Tabs */}
        <WorkspaceWhatsAppModeTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          messagesCount={messages.length}
          templatesCount={templates.length}
          isArabic={isArabic}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden bg-muted/5">
          {activeTab === 'chat' ? (
            <WorkspaceWhatsAppMessages
              messages={messages}
              loadingMessages={loadingMessages}
              onSwitchToTemplates={() => setActiveTab('templates')}
              messagesEndRef={messagesEndRef}
            />
          ) : (
            <WorkspaceWhatsAppTemplates
              order={order}
              templates={templates}
              onSelectTemplate={handleSelectTemplate}
            />
          )}
        </div>

        {/* Composer Footer */}
        <div className="border-t border-border/70 bg-card p-3">
          {activeTemplate ? (
            <WorkspaceWhatsAppTemplateComposer
              activeTemplate={activeTemplate}
              templateVarIndexes={templateVarIndexes}
              templateVars={templateVars}
              setTemplateVars={setTemplateVars}
              filledTemplateBody={filledTemplateBody}
              isSending={isSending}
              isArabic={isArabic}
              onCancelTemplate={handleCancelTemplate}
              onSendTemplate={handleSendTemplate}
            />
          ) : (
            <WorkspaceWhatsAppFreeComposer
              order={order}
              messageText={messageText}
              setMessageText={setMessageText}
              isSending={isSending}
              isArabic={isArabic}
              onSendMessage={handleSendMessage}
            />
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : drawerContent;
};

export default WorkspaceWhatsAppDrawer;
