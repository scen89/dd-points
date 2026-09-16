Add-Type -AssemblyName System.Drawing
$outDir = Join-Path $PSScriptRoot '..\icons'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-Icon([int]$Size, [string]$OutPath, [bool]$Maskable) {
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $orange = [System.Drawing.Color]::FromArgb(255, 255, 138, 61)
  $g.Clear([System.Drawing.Color]::Transparent)

  if ($Maskable) {
    $g.Clear($orange)
    $fontPx = $Size * 0.34
  } else {
    $r = [int]($Size * 0.22)
    $d = $r * 2
    $shape = New-Object System.Drawing.Drawing2D.GraphicsPath
    $shape.AddArc(0, 0, $d, $d, 180, 90)
    $shape.AddArc($Size - $d, 0, $d, $d, 270, 90)
    $shape.AddArc($Size - $d, $Size - $d, $d, $d, 0, 90)
    $shape.AddArc(0, $Size - $d, $d, $d, 90, 90)
    $shape.CloseFigure()
    $brush = New-Object System.Drawing.SolidBrush($orange)
    $g.FillPath($brush, $shape)
    $fontPx = $Size * 0.5
  }

  $font = New-Object System.Drawing.Font('Microsoft YaHei', [float]$fontPx, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rectF = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $g.DrawString('蹬', $font, $white, $rectF, $sf)

  $g.Dispose()
  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

New-Icon -Size 192 -OutPath (Join-Path $outDir 'icon-192.png') -Maskable $false
New-Icon -Size 512 -OutPath (Join-Path $outDir 'icon-512.png') -Maskable $false
New-Icon -Size 512 -OutPath (Join-Path $outDir 'icon-maskable-512.png') -Maskable $true
Write-Output 'icons generated'
