# Issues Backend

## Setup
Install dependencies:
```bash
yarn
```
Start DB container:
```bash
docker compose -f compose.yaml up -d
```
Create an initial DB migration:
```bash
npx prisma migrate dev --name init
```
Apply migration:
```bash
yarn run db:migrate:dev
```
Add seed data
```bash
yarn db:seed
```
Start the Backend
```bash
yarn run dev
```
