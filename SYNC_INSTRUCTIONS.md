# Atualizar repositório e aplicar migrations (script)

Este arquivo descreve um script PowerShell que automatiza os passos para sincronizar o repositório, instalar dependências, realizar backup opcional do banco e aplicar migrations do Prisma.

Arquivos criados:
- `scripts/setup-and-migrate.ps1` — script PowerShell executável.

Uso rápido (PowerShell):

- Rodar o script em modo desenvolvimento (aplica `prisma migrate dev`):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-and-migrate.ps1 -MigrateMode dev -BackupDB
```

- Rodar o script em modo produção (aplica migrations geradas com `prisma migrate deploy`):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-and-migrate.ps1 -MigrateMode deploy
```

O que o script faz:
- Faz `git pull origin main` (com opção para `stash` caso haja alterações locais).
- Instala dependências em `backend` e `frontend` (`npm install`).
- Opcionalmente tenta fazer backup do banco via `mysqldump` (ou tentativa via Docker se disponível).
- Aplica as migrations do Prisma (`dev` ou `deploy`) e roda `prisma generate`.
- Inicia o frontend com `npm run dev` (opcional — o script pode parar após aplicar migrations).

Notas e pré-requisitos:
- Tenha `git`, `node`/`npm` e `npx` instalados.
- Para backup automático, `mysqldump` precisa estar disponível no PATH ou o banco deve estar em um container Docker com `mysqldump` disponível.
- O script tenta extrair `DATABASE_URL` do arquivo `backend/.env` quando presente. Se a URL for complexa, revise e faça o backup manualmente.
- Sempre faça backup antes de aplicar migrations em produção.

Se quiser, eu ajusto o script para não iniciar o frontend automaticamente ou para aceitar variáveis adicionais (ex.: caminho do backup, nome do container Docker).