Set-Location "E:\max_p_new\max_p_new\apps\frontend"
$env:CI = "false"
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "npx.cmd"
$psi.Arguments = "vite --port 3000"
$psi.WorkingDirectory = "E:\max_p_new\max_p_new\apps\frontend"
$psi.UseShellExecute = $true
$psi.CreateNoWindow = $true
$psi.WindowStyle = "Hidden"
$p = [System.Diagnostics.Process]::Start($psi)
Write-Host "Vite PID: $($p.Id)"
