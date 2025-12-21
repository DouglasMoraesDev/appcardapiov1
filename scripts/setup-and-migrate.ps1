# PowerShell script to sync repo, optionally backup DB, install deps and apply Prisma migrations
param(
  [switch]$BackupDB,
  [ValidateSet('dev','deploy')]
  [string]$MigrateMode = 'dev',
  [switch]$StartFrontend
)

$ErrorActionPreference = 'Stop'
Write-Host "==> Iniciando atualização do repositório e setup (MigrateMode=$MigrateMode, BackupDB=$BackupDB)" -ForegroundColor Cyan

# Check working dir is repo root (has backend and frontend)
if (-not (Test-Path "backend" -PathType Container -ErrorAction SilentlyContinue)) {
  Write-Error "Parece que você não está na raiz do projeto. Navegue até a pasta do repositório antes de rodar este script."
  exit 1
}

# Optionally stash local changes
$gitStatus = git status --porcelain
if ($gitStatus) {
  Write-Host "Existem alterações locais não commitadas." -ForegroundColor Yellow
  $stashChoice = Read-Host "Deseja dar 'git stash' antes de pull? (y/N)"
  if ($stashChoice -match '^[yY]') {
    git stash
    Write-Host "Alterações stashed." -ForegroundColor Green
  }
}

# Pull remote
git pull origin main

# Backend steps
Push-Location backend
Write-Host "==> Instalando dependências do backend..." -ForegroundColor Cyan
npm install

# Optional DB backup
if ($BackupDB) {
  Write-Host "==> Tentando backup do banco..." -ForegroundColor Cyan
  $envFile = ".env"
  $dbUrl = $null
  if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if ($content -match 'DATABASE_URL=(.+)') { $dbUrl = $Matches[1].Trim() }
  }

  if (-not $dbUrl) {
    Write-Warning "Não foi possível encontrar DATABASE_URL em backend/.env. Informe a string de conexão manualmente ou crie backend/.env com DATABASE_URL."
  } else {
    Write-Host "DATABASE_URL encontrada (ocultada)" -ForegroundColor Green
    # tenta parse simples para mysql://user:pass@host:port/dbname
    $m = [regex]::Match($dbUrl, 'mysql:\/\/(?<user>[^:]+):(?<pass>[^@]+)@(?<host>[^:\/]+)(:(?<port>\d+))?\/(?<db>[^?]+)')
    if ($m.Success) {
      $user = $m.Groups['user'].Value
      $pass = $m.Groups['pass'].Value
      $db = $m.Groups['db'].Value
      Write-Host "Tentando mysqldump para base '$db' com usuário '$user'..." -ForegroundColor Cyan
      $dumpCmd = "mysqldump -u $user -p$pass $db > ..\backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
      try {
        if (Get-Command mysqldump -ErrorAction SilentlyContinue) {
          Invoke-Expression $dumpCmd
          Write-Host "Backup realizado com mysqldump." -ForegroundColor Green
        } else {
          Write-Warning "mysqldump não encontrado no PATH. Tentando via Docker..."
          # tenta encontrar container com mysql
          $containers = docker ps --format "{{.ID}} {{.Image}} {{.Names}}" | Select-String -Pattern 'mysql|mariadb' -SimpleMatch
          if ($containers) {
            $first = ($containers -split "\n")[0].Split(' ')[0]
            Write-Host "Usando container $first para executar mysqldump..." -ForegroundColor Cyan
            docker exec $first /usr/bin/mysqldump -u $user -p$pass $db > ..\backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql
            Write-Host "Backup via Docker concluído." -ForegroundColor Green
          } else {
            Write-Warning "Não foi possível localizar mysqldump nem container MySQL. Faça backup manualmente." 
          }
        }
      } catch {
        Write-Warning "Falha ao executar backup automático: $_"
      }
    } else {
      Write-Warning "DATABASE_URL não está no formato mysql://user:pass@host:port/dbname. Faça o backup manualmente." 
    }
  }
}

# Apply migrations
if ($MigrateMode -eq 'dev') {
  Write-Host "==> Aplicando migrations (dev)..." -ForegroundColor Cyan
  npx prisma migrate dev --name from-sync-script
} else {
  Write-Host "==> Aplicando migrations (deploy)..." -ForegroundColor Cyan
  npx prisma migrate deploy
}

Write-Host "Gerando Prisma Client..." -ForegroundColor Cyan
npx prisma generate

Pop-Location

# Frontend steps
Push-Location frontend
Write-Host "==> Instalando dependências do frontend..." -ForegroundColor Cyan
npm install

if ($StartFrontend) {
  Write-Host "Iniciando frontend (npm run dev)" -ForegroundColor Cyan
  npm run dev
} else {
  Write-Host "Frontend pronto. Rode 'npm run dev' em 'frontend' quando quiser iniciar o dev server." -ForegroundColor Green
}
Pop-Location

Write-Host "==> Finalizado." -ForegroundColor Green
