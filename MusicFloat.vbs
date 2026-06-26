Set WshShell = CreateObject("WScript.Shell")
Dim appDir
appDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run """" & appDir & "\node_modules\electron\dist\electron.exe"" """ & appDir & """", 0, False
