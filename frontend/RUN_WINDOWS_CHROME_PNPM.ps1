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

function Assert-Path {
  param([Parameter(Mandatory=$true)][string]$PathToCheck)
  if (-not (Test-Path $PathToCheck)) {
    throw "Dependency belum lengkap: $PathToCheck tidak ditemukan. Install dependency gagal/terputus."
  }
}

Write-Host "=== NextVWT Windows Chrome Test Runner - PNPM Mode ===" -ForegroundColor Cyan
Write-Host "Folder: $PWD" -ForegroundColor Gray

if (-not (Test-Path "package.json")) {
  throw "package.json tidak ditemukan. Jalankan script ini dari folder project NextVWT yang berisi package.json."
}

$name = (Get-Content package.json -Raw | ConvertFrom-Json).name
if ($name -ne "nextvwt") {
  throw "Folder salah. package.json saat ini bernama '$name', bukan 'nextvwt'."
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
$Env:NODE_ENV = "development"

Write-Host "Membersihkan node_modules lama..." -ForegroundColor Cyan
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force pnpm-lock.yaml -ErrorAction SilentlyContinue

Run-Step "Aktifkan PNPM via Corepack" {
  corepack prepare pnpm@10.20.0 --activate
}

Run-Step "Install dependency dengan PNPM" {
  corepack pnpm install --no-frozen-lockfile
}

Write-Host "`n=== Validasi dependency penting ===" -ForegroundColor Cyan
Assert-Path ".\node_modules\@tailwindcss\vite"
Assert-Path ".\node_modules\@playwright\test"
Assert-Path ".\node_modules\@types\node"
Assert-Path ".\node_modules\@babel\core"
Write-Host "Dependency penting lengkap." -ForegroundColor Green

Run-Step "pnpm run lint" { corepack pnpm run lint }
Run-Step "pnpm run build" { corepack pnpm run build }
Run-Step "pnpm audit --prod" { corepack pnpm audit --prod }
Run-Step "pnpm run test:e2e:system-browser" { corepack pnpm run test:e2e:system-browser }

Write-Host "`nSELESAI: semua command berhasil." -ForegroundColor Green
