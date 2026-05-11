$ErrorActionPreference = 'Stop'
$src = "D:\ポノのおへや\Dr.owl'quiz\Character\kurumi\pose"
$dst = 'd:\AppDevelopment\pono-asobiba-app\assets\images\characters\kurumi\dance'
$ffmpeg = 'D:\ffmpeg-8.0-essentials_build\bin\ffmpeg.exe'
$tmp = Join-Path $env:TEMP ('kurumi_pose_' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp | Out-Null
Write-Host "Temp staging: $tmp"

$map = [ordered]@{
  '001' = 'kurumi_hooray'
  '002' = 'kurumi_point'
  '003' = 'kurumi_idea'
  '004' = 'kurumi_wave'
  '005' = 'kurumi_hi'
  '006' = 'kurumi_clasp'
  '007' = 'kurumi_pray'
  '008' = 'kurumi_book'
  '009' = 'kurumi_wink'
  '010' = 'kurumi_calm'
}

# Copy sources to ASCII-safe staging using PowerShell (handles unicode + apostrophe)
foreach ($k in $map.Keys) {
  $srcFile = Join-Path $src ("Kurumi_pose_20260511-120850_" + $k + ".png")
  $stageFile = Join-Path $tmp ($k + ".png")
  Copy-Item -LiteralPath $srcFile -Destination $stageFile
}
Write-Host "Staged $((Get-ChildItem $tmp).Count) files"

foreach ($k in $map.Keys) {
  $in  = Join-Path $tmp ($k + ".png")
  $out = Join-Path $dst ($map[$k] + ".webp")
  Write-Host ("Converting " + $k + " -> " + $map[$k] + ".webp")
  & $ffmpeg -y -hide_banner -loglevel error -i $in -c:v libwebp -lossless 0 -q:v 80 -compression_level 6 $out
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed for $k" }
}

Remove-Item -Recurse -Force $tmp
Write-Host "Done."
