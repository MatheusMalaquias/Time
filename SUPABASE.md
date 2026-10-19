# Sincronização com o Supabase

Sem isso o TimeMind funciona normalmente, só que salvando apenas no navegador de cada aparelho.

## 1. Criar o projeto (uma vez)
1. Crie uma conta e um projeto gratuito em https://supabase.com.
2. Abra **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e execute. Isso cria a tabela `items` com
   segurança por linha: cada pessoa só lê e altera as próprias atividades.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon / publishable**.
   Nunca use nem publique a chave `service_role`.

## 2. Rodar no computador
```bash
cp .env.example .env     # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```
Abra a aba **Conta**, crie a conta e entre.

## 3. Ajustes de autenticação (Authentication no painel)
- **Sign In / Providers → Email**: por padrão exige confirmar o e-mail. Para uso pessoal você pode desligar
  "Confirm email"; se deixar ligado, clique no link que chega por e-mail antes de entrar.
- **URL Configuration**: em *Site URL* coloque o endereço do app publicado
  (ex.: `https://SEU-USUARIO.github.io/NOME-DO-REPO/`) e, em *Redirect URLs*, adicione também
  `http://localhost:5173/`. Sem isso, os links de confirmação e de "esqueci a senha" não voltam para o app.

## 4. Publicar no GitHub Pages
1. No repositório: **Settings → Secrets and variables → Actions → Variables** e crie
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (a chave anon é pública, pode ser variável comum).
2. **Settings → Pages → Source: GitHub Actions**.
3. A cada push na `main` o app é testado, construído e publicado.

## Como a sincronização funciona
- O app lê e grava no aparelho (funciona sem internet) e sincroniza em segundo plano: ao entrar, ao voltar
  para o app, ao reconectar, a cada minuto e logo depois de cada edição.
- Cada atividade é uma linha. Se a mesma atividade mudar em dois aparelhos, vale a última mudança
  (usa o relógio de cada aparelho; mantenha data e hora automáticas).
- Os lembretes (aba Avisos) ficam só no aparelho.
