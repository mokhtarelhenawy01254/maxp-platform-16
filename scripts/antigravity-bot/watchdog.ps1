# Antigravity Telegram Bot Watchdog
# Ensures bot.js is always running in the background.

$nodeExe = "C:\Users\mokhtar\AppData\Local\Programs\nodejs\node.exe"
$botScript = "H:\maxp-platform\scripts\antigravity-bot\bot.js"
$workingDir = "H:\maxp-platform\scripts\antigravity-bot"

$proc = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -match "antigravity-bot\\bot\.js" }

if (-not $proc) {
    Start-Process -FilePath $nodeExe -ArgumentList "`"$botScript`"" -WorkingDirectory $workingDir -WindowStyle Hidden
}
