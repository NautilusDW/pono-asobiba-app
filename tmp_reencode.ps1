$path = 'd:\AppDevelopment\pono-asobiba-app\tmp_kurumi_convert.ps1'
$content = Get-Content -Raw -Encoding UTF8 $path
$enc = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($path, $content, $enc)
Write-Host "Re-encoded with UTF-8 BOM"
