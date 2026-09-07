param([Parameter(Mandatory=$true)][string]$Command)
$env:SSH_ASKPASS="C:\Users\shrou\.ssh\askpass.cmd"
$env:SSH_ASKPASS_REQUIRE="force"
$env:DISPLAY="none"
$cmd = "ssh -i C:\Users\shrou\.ssh\id_ed25519_maxp -o StrictHostKeyChecking=no -o ConnectTimeout=15 root@153.92.223.119 `"$Command`""
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile","-Command",$cmd -NoNewWindow -Wait | Out-Null
