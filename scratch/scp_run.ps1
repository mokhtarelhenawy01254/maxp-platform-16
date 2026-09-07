param([Parameter(Mandatory=$true)][string]$LocalPath, [Parameter(Mandatory=$true)][string]$RemotePath)
$env:SSH_ASKPASS="C:\Users\shrou\.ssh\askpass.cmd"
$env:SSH_ASKPASS_REQUIRE="force"
$env:DISPLAY="none"
$cmd = "scp -i C:\Users\shrou\.ssh\id_ed25519_maxp -o StrictHostKeyChecking=no -o ConnectTimeout=15 $LocalPath root@153.92.223.119:$RemotePath"
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile","-Command",$cmd -NoNewWindow -Wait | Out-Null
