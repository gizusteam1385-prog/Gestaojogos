# 🎰 Gestão de Jogos — Raspadinhas & Euromilhões

Aplicação web para gerir dinheiro de raspadinhas e Euromilhões.

## 🎫 Raspadinhas
- Gerir pessoas participantes
- Controlar pagamentos mensais
- Caixa: metade guardada, metade jogada

## ⭐ Euromilhões
- Adicionar saldo
- Semanas criadas automaticamente (25€/semana)
- Desconta a cada sexta-feira
- Lucro editável por semana
- Notificação quando o saldo é insuficiente

---

## 🚀 Deploy no Vercel

### 1. Colocar no GitHub
```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU-USER/gestao-jogos.git
git push -u origin main
```

### 2. Importar no Vercel
1. Ir a [vercel.com](https://vercel.com) → **Add New → Project**
2. Selecionar o repositório
3. Adicionar **Environment Variable**:
   - **Key**: `DATABASE_URL`
   - **Value**: a connection string do Supabase (Transaction Pooler)
4. Clicar **Deploy**

### 3. Criar tabelas no Supabase
Correr o ficheiro `supabase_schema.sql` no **SQL Editor** do Supabase.

---

## 🛠️ Desenvolvimento Local

```bash
npm install
cp .env.example .env
# Editar .env com a DATABASE_URL
npm run dev
```

---

## 📦 Tecnologias
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- Drizzle ORM
- PostgreSQL (Supabase)
