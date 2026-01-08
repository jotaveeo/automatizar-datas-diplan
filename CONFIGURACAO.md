# ⚙️ Configuração do .env para o Seu Pipe

## 🎯 IDs Identificados do Pipefy

Com base na query GraphQL que você executou, aqui estão os campos corretos:

**Pipe ID:** `306429648`

**Campos na fase "Em andamento":**
- **Data de início do SLA:** `data_de_in_cio_do_sla` (tipo: datetime)
- **Data limite do SLA:** `data_limite_do_sla` (tipo: due_date)

---

## 📝 Arquivo .env Configurado

**Copie e cole o conteúdo abaixo no seu arquivo `.env`:**

```env
# 🔐 SEGURANÇA
# Token secreto para validar webhooks do Pipefy
# IMPORTANTE: Troque por um token seguro e aleatório antes de usar em produção!
WEBHOOK_TOKEN=diplan-webhook-token-2026-seguro

# Token de autenticação da API do Pipefy
# Obtenha em: https://app.pipefy.com/tokens
# IMPORTANTE: Substitua pelo seu token real do Pipefy!
PIPEFY_TOKEN=SEU_TOKEN_PIPEFY_AQUI

# 🌍 TIMEZONE E HORÁRIO COMERCIAL
TIMEZONE=America/Fortaleza
BUSINESS_START=08:00
BUSINESS_END=18:00

# 📅 FERIADOS DE 2026
HOLIDAYS_JSON=["2026-01-01","2026-02-16","2026-02-17","2026-04-03","2026-04-21","2026-05-01","2026-06-04","2026-09-07","2026-10-12","2026-11-02","2026-11-15","2026-12-25"]

# 🎯 CONFIGURAÇÃO DO PIPEFY
PIPE_ID=306429648
FIELD_SLA_START=data_de_in_cio_do_sla
FIELD_SLA_DEADLINE=data_limite_do_sla
FIELD_SLA_STATUS=

# ⚙️ CONFIGURAÇÃO DO SERVIDOR
PORT=3000
NODE_ENV=development
```

---

## ✅ Passos para Configurar

### 1. Edite o arquivo .env

Abra o arquivo `c:\Users\jotavee\Documents\PROJETOS DE PROGRAMAÇÃO\api-diplan-data\.env` e substitua todo o conteúdo pelo código acima.

### 2. Configure seu Token do Pipefy

Substitua `SEU_TOKEN_PIPEFY_AQUI` pelo seu token real:
- Acesse: https://app.pipefy.com/tokens
- Clique em "Gerar novo token"
- Copie e cole no `.env`

### 3. (Opcional) Personalize o Token do Webhook

O token `WEBHOOK_TOKEN` é usado para autenticar os webhooks. Você pode:
- Manter o atual: `diplan-webhook-token-2026-seguro`
- Ou gerar um novo token aleatório mais seguro

**Sugestão de comando para gerar token aleatório (PowerShell):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## 🚀 Próximos Passos

### 1. Teste a API localmente

```bash
npm start
```

Você verá algo como:
```
🚀 API DE SLA PIPEFY INICIADA
📡 Servidor rodando em: http://localhost:3000
🌍 Timezone: America/Fortaleza
⏰ Horário comercial: 8:00 - 18:00
📅 Feriados cadastrados: 12
```

### 2. Teste com um card real

```bash
curl -X POST http://localhost:3000/webhook/sla \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: diplan-webhook-token-2026-seguro" \
  -d "{\"card_id\":\"ID_REAL_DO_CARD\",\"phase_name\":\"Em andamento\"}"
```

**Substitua `ID_REAL_DO_CARD`** por um ID real de um card do seu pipe.

### 3. Configure o Webhook no Pipefy

No Pipefy:
1. Vá em **Automações** → **Nova automação**
2. **Gatilho:** "Quando um card entra na fase" → selecione **"Em andamento"**
3. **Ação:** "Fazer uma requisição HTTP"
   - **Método:** POST
   - **URL:** `http://localhost:3000/webhook/sla` (mude para URL de produção depois do deploy)
   - **Headers:**
     ```
     Content-Type: application/json
     X-Webhook-Token: diplan-webhook-token-2026-seguro
     ```
   - **Body:**
     ```json
     {
       "card_id": "{{card_id}}",
       "phase_name": "{{phase_name}}"
     }
     ```

---

## 📌 Observações Importantes

### Campo de Status (Opcional)

Deixei `FIELD_SLA_STATUS` vazio porque não identifiquei um campo específico para isso no seu pipe. Se quiser adicionar um campo de texto para mostrar o status (NO_PRAZO, PROXIMO_VENCIMENTO, VENCIDO), você pode:

1. Criar um campo de "Texto curto" na fase "Em andamento"
2. Executar a query GraphQL novamente para pegar o ID
3. Adicionar ao `.env`

### Tipos de Campo

- `data_de_in_cio_do_sla` é type **datetime** ✅
- `data_limite_do_sla` é type **due_date** ✅

Ambos são compatíveis com datas/horas, então a API funcionará perfeitamente!

---

## 🐛 Troubleshooting

Se os campos não forem atualizados:
1. Verifique se o token do Pipefy tem permissões de escrita
2. Confirme que os IDs dos campos estão corretos (executar query GraphQL novamente)
3. Veja os logs da API para identificar erros

Se tiver dúvidas, revise o [README.md](file:///c:/Users/jotavee/Documents/PROJETOS%20DE%20PROGRAMAÇÃO/api-diplan-data/README.md) completo!
