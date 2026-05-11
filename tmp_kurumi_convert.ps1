$src = "D:\ポノのおへや\Dr.owl'quiz\Character\kurumi\pose"
$dst = 'd:\AppDevelopment\pono-asobiba-app\assets\images\characters\kurumi\dance'
$ffmpeg = 'D:\ffmpeg-8.0-essentials_build\bin\ffmpeg.exe'
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
foreach ($k in $map.Keys) {
  $in  = Join-Path $src ("Kurumi_pose_20260511-120850_" + $k + ".png")
  $out = Join-Path $dst ($map[$k] + ".webp")
  Write-Host ("Converting " + $k + " -> " + $map[$k] + ".webp")
  & $ffmpeg -y -i $in -c:v libwebp -lossless 0 -q:v 80 -compression_level 6 $out 2>&1 | Select-Object -Last 1
}
Write-Host "Done."
