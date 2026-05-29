$ErrorActionPreference = "Stop"

function Run-Step {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][scriptblock]$Command
  )
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Name gagal dengan exit code $LASTEXITCODE"
  }
}

Write-Host "=== NextVWT Windows Chrome Test Runner ===" -ForegroundColor Cyan
Write-Host "Folder: $PWD" -ForegroundColor Gray

if (-not (Test-Path "package.json")) {
  throw "package.json tidak ditemukan. Jalankan script ini dari folder project NextVWT yang berisi package.json."
}

$name = (Get-Content package.json -Raw | ConvertFrom-Json).name
if ($name -ne "nextvwt") {
  throw "Folder salah. package.json saat ini bernama '$name', bukan 'nextvwt'. Ekstrak ZIP ini ke folder baru lalu jalankan script dari folder nextvwt."
}

$chromeCandidates = @(
  "$Env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${Env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$Env:LocalAppData\Google\Chrome\Application\chrome.exe"
)

$chrome = $chromeCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $chrome) {
  throw "Google Chrome tidak ditemukan. Install Chrome atau set manual: `$Env:PLAYWRIGHT_EXECUTABLE_PATH='C:\Path\To\chrome.exe'"
}

Write-Host "Chrome: $chrome" -ForegroundColor Green
$Env:PLAYWRIGHT_EXECUTABLE_PATH = $chrome
$Env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"

Write-Host "Membersihkan node_modules lama..." -ForegroundColor Cyan
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

Write-Host "`n=== npm ci ===" -ForegroundColor Cyan
npm ci
if ($LASTEXITCODE -ne 0) {
  Write-Host "npm ci gagal. Mencoba fallback: bersihkan cache lalu npm install..." -ForegroundColor Yellow
  Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
  npm cache clean --force
  npm install --no-audit
  if ($LASTEXITCODE -ne 0) {
    throw "Instalasi dependency gagal. Coba update Node.js ke versi LTS terbaru lalu jalankan ulang script ini."
  }
}

Run-Step "npm run lint" { npm run lint }
Run-Step "npm run build" { npm run build }
Run-Step "npm audit --omit=dev" { npm audit --omit=dev }
Run-Step "npm run test:e2e:system-browser" { npm run test:e2e:system-browser }

Write-Host "`nSELESAI: semua command berhasil." -ForegroundColor Green
