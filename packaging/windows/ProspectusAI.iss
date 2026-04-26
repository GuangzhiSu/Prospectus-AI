; Inno Setup script (template) — compile with Inno Setup 6 on Windows.
; Paths assume you ran packaging/windows/build.ps1 and point SourceDir at the staged folder.

#define MyAppName "Prospectus AI"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "Your Company"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
DefaultDirName={autopf}\ProspectusAI
DefaultGroupName={#MyAppName}
OutputBaseFilename=ProspectusAI-Setup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64

[Files]
; Populate after build.ps1 — example:
; Source: "dist\ProspectusAI\*"; DestDir: "{app}"; Flags: recursesubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\start-prospectus-ui.bat"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\start-prospectus-ui.bat"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop icon"; GroupDescription: "Additional icons:"

[Run]
; Optional: post-install model download — better handled in-app via Settings page
