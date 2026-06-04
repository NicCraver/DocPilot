# 构建 Tauri sidecar：内嵌 markitdown + poppler + tesseract（Windows）
$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Build = Join-Path $Root "build\sidecar-work-win"
$Binaries = Join-Path $Root "src-tauri\binaries"

if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") {
    $Triple = "aarch64-pc-windows-msvc"
} else {
    $Triple = "x86_64-pc-windows-msvc"
}
$OutName = "docpilot-convert-$Triple.exe"

Write-Host "==> 构建 DocPilot 转换 sidecar ($OutName)"

if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    throw "需要 Chocolatey（GitHub windows runner 已预装）"
}

choco install python311 tesseract -y --no-progress | Out-Host
$chocoBin = Join-Path $env:ChocolateyInstall "bin"
$env:Path = "$chocoBin;" + [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

$py = (Get-Command py -ErrorAction SilentlyContinue)
if ($py) {
    & py -3.11 -c "import sys; print(sys.version_info[:2])" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $Python = "py -3.11" }
}
if (-not $Python) {
    $pythonExe = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonExe) { throw "未找到 Python 3.11" }
    $Python = $pythonExe.Source
}

function Copy-ToolWithDlls([string]$ExePath, [string]$DestDir) {
    $srcDir = Split-Path $ExePath -Parent
    Copy-Item $ExePath $DestDir -Force
    Get-ChildItem $srcDir -Filter "*.dll" -ErrorAction SilentlyContinue | Copy-Item -Destination $DestDir -Force
}

function Ensure-PopplerBinDir {
    $dir = Join-Path $Build "poppler-windows"
    $pdftoppm = Join-Path $dir "Library\bin\pdftoppm.exe"
    if (Test-Path $pdftoppm) {
        return (Split-Path $pdftoppm -Parent)
    }
    $zip = Join-Path $Build "poppler-windows.zip"
    $url = "https://github.com/oschwartz10612/poppler-windows/releases/download/v24.08.0-0/Release-24.08.0-0.zip"
    Write-Host "==> 下载 poppler-windows"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath $dir -Force
    if (-not (Test-Path $pdftoppm)) {
        throw "poppler-windows 中未找到 pdftoppm.exe"
    }
    return (Split-Path $pdftoppm -Parent)
}

function Resolve-Executable([string]$Name) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }
    throw "未找到 $Name"
}

if (Test-Path $Build) { Remove-Item $Build -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Join-Path $Build "runtime\bin"), (Join-Path $Build "runtime\tessdata"), $Binaries | Out-Null

Write-Host "==> Python venv + 依赖"
$venv = Join-Path $Build "venv"
if ($Python -eq "py -3.11") {
    & py -3.11 -m venv $venv
} else {
    & $Python -m venv $venv
}
$venvPy = Join-Path $venv "Scripts\python.exe"
& $venvPy -m pip install -U pip
& $venvPy -m pip install -r (Join-Path $Root "scripts\markitdown-sidecar-requirements.txt")

Write-Host "==> 打包 poppler / tesseract"
$popplerBin = Ensure-PopplerBinDir
$binDir = Join-Path $Build "runtime\bin"
Get-ChildItem $popplerBin -Filter "*.exe" | ForEach-Object { Copy-ToolWithDlls $_.FullName $binDir }
Get-ChildItem $popplerBin -Filter "*.dll" | Copy-Item -Destination $binDir -Force
$tesseract = Resolve-Executable "tesseract"
Copy-ToolWithDlls $tesseract $binDir

$tessRoot = Split-Path $tesseract -Parent
$tessdata = Join-Path $tessRoot "tessdata"
if (-not (Test-Path $tessdata)) {
    $tessdata = "C:\Program Files\Tesseract-OCR\tessdata"
}
Copy-Item (Join-Path $tessdata "*") (Join-Path $Build "runtime\tessdata") -Recurse -Force

$req = Join-Path $Root "scripts\markitdown-sidecar-requirements.txt"
$pi = Join-Path $venv "Scripts\pyinstaller.exe"
$tessdataPath = Join-Path $Build "runtime\tessdata"
$binPath = Join-Path $Build "runtime\bin"
$addTess = "$tessdataPath;tessdata"
$addBin = "$binPath;bin"

Write-Host "==> PyInstaller"
& $pi --noconfirm --clean --onefile `
    --name docpilot-convert `
    --distpath (Join-Path $Build "dist") `
    --workpath (Join-Path $Build "pyinstaller-work") `
    --specpath $Build `
    --add-data $addTess `
    --add-data $addBin `
    --collect-data magika `
    --hidden-import markitdown `
    --hidden-import pdf2image `
    --hidden-import pytesseract `
    --hidden-import PIL `
    (Join-Path $Root "scripts\docpilot_convert.py")

$built = Join-Path $Build "dist\docpilot-convert.exe"
$out = Join-Path $Binaries $OutName
Copy-Item $built $out -Force
Write-Host "已生成: $out"
Get-Item $out | Format-List Name, Length
