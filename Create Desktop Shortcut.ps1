$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$shortcutPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Aquarium.lnk'
$targetPath = Join-Path $projectRoot 'Open Aquarium App.vbs'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $projectRoot
$shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,43"
$shortcut.Description = 'Open the Sunday School Aquarium local app'
$shortcut.Save()

Write-Host "Desktop shortcut created: $shortcutPath"
