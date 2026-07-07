Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap(200,200)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.FillRectangle([System.Drawing.Brushes]::Navy,0,0,200,200)
$font = New-Object System.Drawing.Font("Arial",36)
$g.DrawString("Swan",$font,[System.Drawing.Brushes]::White,30,70)
$bmp.Save("H:\maxp-platform\temp-test-image.png")
$g.Dispose()
$bmp.Dispose()
Write-Output "done"
