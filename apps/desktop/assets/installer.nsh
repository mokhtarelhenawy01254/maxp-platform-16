; Custom NSIS cleanup script for MaxP Workspace
; Automatically removes legacy shortcuts, processes, and directories from older versions (MaxP Agent Studio, MaxP Monitor)

!macro customInstall
  ; Remove legacy desktop shortcuts from previous naming iterations
  Delete "$DESKTOP\MaxP Agent Studio.lnk"
  Delete "$DESKTOP\MaxP Monitor.lnk"
  Delete "$DESKTOP\MaxP Desktop Monitor.lnk"

  ; Remove legacy Start Menu shortcuts
  Delete "$SMPROGRAMS\MaxP Agent Studio.lnk"
  Delete "$SMPROGRAMS\MaxP Monitor.lnk"
  Delete "$SMPROGRAMS\MaxP Desktop Monitor.lnk"

  ; Remove legacy installation directories if they exist
  RMDir /r "$LOCALAPPDATA\Programs\maxp-agent-studio"
  RMDir /r "$LOCALAPPDATA\Programs\maxp-monitor"
!macroend
