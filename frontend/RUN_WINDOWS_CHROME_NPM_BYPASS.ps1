$ErrorActionPreference = "Stop"

function Run-Step {
  param([string]$Name, [scriptblock]$Command)
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "$Name gagal dengan exit code $LASTEXITCODE" }
}
function Assert-Path { param([string]$PathToCheck); if (-not (Test-Path $PathToCheck)) { throw "Dependency belum lengkap: $PathToCheck tidak ditemukan." } }

Write-Host "=== NextVWT Windows Chrome Test Runner - NPM Bypass Mode ===" -ForegroundColor Cyan
if (-not (Test-Path "package.json")) { throw "package.json tidak ditemukan." }
$name = (Get-Content package.json -Raw | ConvertFrom-Json).name
if ($name -ne "nextvwt") { throw "Folder salah: $name" }

$chromeCandidates = @("$Env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${Env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$Env:LocalAppData\Google\Chrome\Application\chrome.exe")
$chrome = $chromeCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $chrome) { throw "Google Chrome tidak ditemukan." }
$Env:PLAYWRIGHT_EXECUTABLE_PATH = $chrome
$Env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
$Env:NODE_ENV = "development"

Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

Run-Step "npm install bypass" { npm install --no-audit --include=dev --legacy-peer-deps --foreground-scripts }

Assert-Path ".\node_modules\@tailwindcss\vite"
Assert-Path ".\node_modules\@playwright\test"
Assert-Path ".\node_modules\@types\node"
Assert-Path ".\node_modules\@babel\core"

Run-Step "npm run lint" { npm run lint }
Run-Step "npm run build" { npm run build }
Run-Step "npm audit --omit=dev" { npm audit --omit=dev }
Run-Step "npm run test:e2e:system-browser" { npm run test:e2e:system-browser }
Write-Host "`nSELESAI: semua command berhasil." -ForegroundColor Green
