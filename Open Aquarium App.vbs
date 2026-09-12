Set shell = CreateObject("WScript.Shell")
Set filesystem = CreateObject("Scripting.FileSystemObject")
projectRoot = filesystem.GetParentFolderName(WScript.ScriptFullName)
command = "cmd /c cd /d """ & projectRoot & """ && ""Open Aquarium.bat"""
shell.Run command, 0, False
