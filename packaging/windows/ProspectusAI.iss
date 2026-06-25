; Inno Setup script for the Prospectus AI Windows installer.
; Compile with Inno Setup 6 after staging dist\ProspectusAI.

#ifndef SourceDir
#define SourceDir "dist\ProspectusAI"
#endif

#ifndef OutputDir
#define OutputDir "dist"
#endif

#ifndef MyAppVersion
#define MyAppVersion "0.1.0"
#endif

#define MyAppName "Prospectus AI"
#define MyAppPublisher "AI Prospectus"
#define MyAppExeName "Open-Prospectus-UI.cmd"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL=https://ai-prospectus.com
AppSupportURL=https://github.com/GuangzhiSu/Prospectus-AI
AppUpdatesURL=https://github.com/GuangzhiSu/Prospectus-AI/releases
DefaultDirName={localappdata}\Programs\ProspectusAI
DefaultGroupName={#MyAppName}
OutputDir={#OutputDir}
OutputBaseFilename=ProspectusAI-Setup-{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
UninstallDisplayName={#MyAppName}
UninstallDisplayIcon={app}\app.ico
SetupIconFile={#SourceDir}\app.ico
WizardStyle=modern

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\app.ico"
Name: "{userdesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\app.ico"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: unchecked

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent
