# Backend & System Architecture

## Overview
MaxP Platform provides unified e-commerce, CRM, HR, and WhatsApp multi-channel inbox management.

## Frontend Layout Architecture ΓÇö WhatsApp Workspace
```mermaid
graph TD
    Layout["Layout (h-screen overflow-hidden)"] --> Main["main.business-shell-main (flex-1 overflow-hidden min-h-0)"]
    Main --> WorkspaceRoot[".whatsapp-workspace-root (h-full min-h-0 flex-col overflow-hidden)"]
    WorkspaceRoot --> Sidebar["ChatSidebar (w-[390px] h-full overflow-hidden ltr:border-r rtl:border-l)"]
    WorkspaceRoot --> ChatContainer["Chat Container Wrapper (h-full min-h-0 flex-1 overflow-hidden)"]
    ChatContainer --> ChatWin["ChatWindow (h-full min-h-0 flex-1 flex-col overflow-hidden)"]
    ChatWin --> Header["Header (shrink-0)"]
    ChatWin --> Messages[".wa-messages-scroll (flex-1 min-h-0 overflow-y-auto)"]
    ChatWin --> InputBar["Input Bar (shrink-0)"]
    ChatContainer --> RightPanel["ChatRightPanel (w-80 h-full overflow-hidden ltr:border-l rtl:border-r)"]
```
