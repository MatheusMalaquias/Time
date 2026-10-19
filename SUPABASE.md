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

## 2.1. Excluir conta (obrigatório para abrir a outras pessoas)
O app tem o botão "Excluir minha conta e meus dados" (aba Conta). Ele chama uma função do banco que você precisa criar:
1. No painel do Supabase, abra **SQL Editor → New query**.
2. Abra o arquivo `supabase/delete_account.sql` deste repositório, copie **todo** o conteúdo e cole na query.
3. Clique em **Run**. Deve aparecer "Success. No rows returned".
4. Para conferir: **Database → Functions** deve listar `delete_my_account`.
5. Teste com uma conta descartável: crie, adicione uma atividade, exclua pelo app e confira em
   **Authentication → Users** (a conta sumiu) e **Table Editor → items** (as linhas dela sumiram).

Sem esse passo o botão mostra um erro e nada é apagado. A função só apaga a conta de quem está logado
(`auth.uid()`); não é preciso (nem se deve) usar a chave `service_role`.

## 3. Ajustes de autenticação (Authentication no painel)
- **Sign In / Providers → Email**: por padrão exige confirmar o e-mail (veja o checklist abaixo).
- **URL Configuration** (obrigatório para "Esqueci a senha" e para o link de confirmação):
  - *Site URL*: `https://matheusmalaquias.github.io/Time/`
  - *Redirect URLs*: adicione `https://matheusmalaquias.github.io/Time/` e `http://localhost:5173/`
  Sem isso, os links dos e-mails não voltam para o app.

### Como a recuperação de senha funciona
1. Na tela de login a pessoa digita o e-mail e toca em **Esqueci a senha**.
2. O Supabase envia um e-mail com um link. Ao tocar nele, o app abre já na tela **Nova senha**
   (o app reconhece o link de recuperação), a pessoa escolhe a senha (mínimo 8 caracteres) e entra.
3. Se o link expirou ou já foi usado, o app avisa e volta ao login para pedir outro.
4. Para testar: use uma conta descartável, peça o link, abra-o no navegador e troque a senha.
   Se o link abrir só a página inicial sem pedir senha nova, confira as Redirect URLs acima.

## 3.1. Checklist para abrir a mais pessoas
- [ ] **Confirmação de e-mail** (hoje desligada): em *Sign In / Providers → Email → Confirm email*.
  Desligada, qualquer pessoa cria conta com qualquer e-mail (inclusive de terceiros) e entra na hora.
  Para abrir ao público, ligue: evita contas com e-mail falso ou de outra pessoa e garante que a recuperação
  de senha chegue ao dono do e-mail. O app já avisa "Confirme pelo link enviado ao seu e-mail".
- [ ] **Limite de e-mails do Supabase**: o envio padrão é só para testes e tem um limite muito baixo por hora
  (poucos e-mails; confira o valor atual em *Authentication → Rate Limits*) e só entrega para membros da
  equipe do projeto em alguns planos. Com várias pessoas, cadastro e "esqueci a senha" falham.
- [ ] **SMTP próprio** (ex.: Resend, que tem plano gratuito): crie conta, verifique um domínio seu, gere uma
  chave SMTP e preencha em *Authentication → Emails → SMTP Settings* (host, porta, usuário, senha, remetente).
  Revise também os textos dos e-mails em *Authentication → Emails → Templates*. A senha SMTP fica só no painel
  do Supabase, nunca no código.
- [ ] **Função `delete_my_account` criada** (passo 2.1) e testada.
- [ ] **Destino das sugestões** (opcional): defina a variável `VITE_FEEDBACK_URL` (URL https ou e-mail) no `.env`
  e em *Settings → Secrets and variables → Actions → Variables*. Vazia, o botão "Enviar sugestão" não aparece.
- [ ] **Privacidade e LGPD**: o aviso de privacidade (criação de conta e aba Conta) e a exclusão de conta e dados
  ajudam a cumprir a LGPD (transparência e direito de eliminação), mas não substituem uma política de privacidade
  completa nem orientação jurídica. O aviso diz a verdade: os dados ficam no Supabase sem criptografia de ponta a
  ponta, cada pessoa só vê os próprios (RLS), e você, como dono, tem acesso técnico pelo painel e se comprometeu a não usá-lo.
- [ ] Backups e limites do plano gratuito do Supabase (projetos inativos podem ser pausados).

## Vários usuários no mesmo aparelho
Quando outra pessoa entra num aparelho usado por alguém, o app descarta os dados locais da anterior
(a agenda dela continua na conta dela). Assim, nada vaza de uma conta para outra.

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
