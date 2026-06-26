Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
Dim appDir
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
desktop = WshShell.SpecialFolders("Desktop")
Set sc = WshShell.CreateShortCut(desktop & "\MusicFloat.lnk")
sc.TargetPath = appDir & "\node_modules\electron\dist\electron.exe"
sc.Arguments = Chr(34) & appDir & Chr(34)
sc.WorkingDirectory = appDir
sc.IconLocation = appDir & "\music.ico"
sc.Save
WScript.Echo "Done"
