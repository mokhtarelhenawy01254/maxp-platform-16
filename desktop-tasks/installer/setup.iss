[Setup]
AppName=MaxP Tasks
AppVersion=1.0.0
AppPublisher=MaxP
DefaultDirName={autopf}\MaxP Tasks
DefaultGroupName=MaxP Tasks
OutputDir=installer
OutputBaseFilename=MaxP-Tasks-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
SetupIconFile=..\app\ui\icon.ico
UninstallDisplayIcon={app}\MaxP Tasks.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "arabic"; MessagesFile: "compiler:Languages\Arabic.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\dist\MaxP Tasks\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\MaxP Tasks"; Filename: "{app}\MaxP Tasks.exe"
Name: "{group}\{cm:UninstallProgram,MaxP Tasks}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\MaxP Tasks"; Filename: "{app}\MaxP Tasks.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\MaxP Tasks.exe"; Description: "{cm:LaunchProgram,MaxP Tasks}"; Flags: nowait postinstall skipifsilent
