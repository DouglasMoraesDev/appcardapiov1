# Backend - AppCardápio

Backend minimal com Express + Prisma + MySQL para o frontend de gestão.

Passos rápidos:

1. Instalar dependências:

```bash
cd backend
npm install
```

2. Configurar banco MySQL e atualizar `DATABASE_URL` em `.env`.

3. Gerar cliente Prisma e rodar migration inicial:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. Rodar em modo de desenvolvimento:

```bash
npm run dev
```

API base: `http://localhost:4000/api`.
