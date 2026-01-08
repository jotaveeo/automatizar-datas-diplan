# 🚀 API de Automação de SLA para Pipefy

API Node.js que calcula e gerencia automaticamente prazos de SLA para cards do Pipefy, considerando **dias úteis**, **horário comercial** e **feriados**.

## 📋 Funcionalidades

- ✅ Recebe webhooks do Pipefy quando card muda de fase
- ✅ Calcula deadline de SLA baseado em **horas comerciais reais**
- ✅ Considera finais de semana, feriados e horário de expediente
- ✅ Atualiza campos do card automaticamente via GraphQL
- ✅ Segurança com validação de token
- ✅ Pronta para deploy em ambientes serverless

## 🎯 Caso de Uso: Manutenção

**Regra de negócio**: Solicitações de manutenção devem ser atendidas em **2 dias úteis**.

- **2 dias úteis** = **20 horas comerciais** (2 dias × 10 horas/dia)
- Horário comercial: 08:00 às 18:00
- Pula finais de semana e feriados
- O prazo:
  - Inicia quando o card entra em "Em andamento"
  - É calculado considerando apenas tempo dentro do expediente

### Exemplos Práticos

| Entrada do Card | Início do SLA | Deadline Aproximado |
|---|---|---|
| Segunda 09:00 | Segunda 09:00 | Quarta 09:00 |
| Sexta 17:00 | Sexta 17:00 | Terça 17:00 (pula fim de semana) |
| Segunda 20:00 | Terça 08:00 | Quinta 08:00 |
| Véspera de feriado | Próximo dia útil 08:00 | +2 dias úteis |

## 🛠️ Tecnologias

- **Node.js 18+**
- **Express** - servidor HTTP
- **Luxon** - manipulação avançada de datas e timezones
- **GraphQL Request** - cliente para API do Pipefy
- **dotenv** - variáveis de ambiente

## 📦 Instalação

### 1. Clone/Baixe o projeto

```bash
cd api-diplan-data
```

### 2. Instale dependências

```bash
npm install
```

### 3. Configure variáveis de ambiente

Copie o arquivo de exemplo:

```bash
copy .env.example .env
```

Edite `.env` com suas configurações:

```env
# Token secreto para webhook (crie um aleatório)
WEBHOOK_TOKEN=meu-token-super-secreto-123

# Token do Pipefy (obtenha em https://app.pipefy.com/tokens)
PIPEFY_TOKEN=seu-token-pipefy-aqui

# IDs dos campos (veja como descobrir abaixo)
FIELD_SLA_START=campo_inicio_sla
FIELD_SLA_DEADLINE=campo_prazo_limite
FIELD_SLA_STATUS=campo_status_sla

# Feriados de 2026
HOLIDAYS_JSON=["2026-01-01","2026-02-16","2026-02-17","2026-04-03","2026-04-21","2026-05-01","2026-06-04","2026-09-07","2026-10-12","2026-11-02","2026-11-15","2026-12-25"]
```

### 4. Execute testes (opcional)

```bash
npm test
```

### 5. Inicie servidor

```bash
npm start
```

Ou em modo desenvolvimento com auto-reload:

```bash
npm run dev
```

## 🔧 Como Descobrir IDs dos Campos do Pipefy

### Opção 1: Via Interface

1. Abra o card no Pipefy
2. Inspecione (F12) e vá na aba Network
3. Procure por requisições GraphQL
4. Encontre o `field_id` dos campos de data/hora

### Opção 2: Via GraphQL (Recomendado)

Acesse https://app.pipefy.com/graphiql e execute:

```graphql
{
  pipe(id: "SEU_PIPE_ID") {
    phases {
      name
      fields {
        id
        label
        type
      }
    }
  }
}
```

Procure pelos campos de tipo `datetime` ou `short_text` que você criou para SLA.

## 🌐 Configurando Webhook no Pipefy

### 1. Crie campos customizados no seu pipe

- **Início do SLA** (tipo: Data e hora)
- **Prazo Limite** (tipo: Data e hora)
- **Status SLA** (tipo: Texto curto) - opcional

### 2. Configure a automação

1. No Pipefy, vá em **Automações**
2. Clique em **+ Nova automação**
3. **Gatilho**: "Quando um card entra na fase"
   - Selecione a fase: **"Em andamento"**
4. **Ação**: "Fazer uma requisição HTTP"
   - **Método**: POST
   - **URL**: `https://sua-api.com/webhook/sla`
   - **Headers**:
     ```
     Content-Type: application/json
     X-Webhook-Token: seu-token-secreto
     ```
   - **Body**:
     ```json
     {
       "card_id": "{{card_id}}",
       "phase_name": "{{phase_name}}",
       "timestamp": "{{now}}"
     }
     ```

### 3. Teste a automação

Mova um card para a fase "Em andamento" e verifique se os campos são preenchidos automaticamente.

## 🚀 Deploy

### Opção 1: Render.com (Grátis)

1. Crie conta em https://render.com
2. Conecte seu repositório GitHub
3. Crie um **Web Service**
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Adicione todas do `.env`

### Opção 2: Railway.app

1. Crie conta em https://railway.app
2. **New Project** → Deploy from GitHub
3. Adicione variáveis de ambiente
4. Deploy automático!

### Opção 3: Heroku

```bash
heroku create api-diplan-sla
heroku config:set WEBHOOK_TOKEN=xxx PIPEFY_TOKEN=xxx
git push heroku main
```

## 🧪 Testando a API

### Health Check

```bash
curl http://localhost:3000/health
```

### Testar Webhook Manualmente

```bash
curl -X POST http://localhost:3000/webhook/sla \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: seu-token-secreto" \
  -d "{\"card_id\":\"123456789\",\"phase_name\":\"Em andamento\"}"
```

**Nota**: Substitua `123456789` pelo ID real de um card.

## 📁 Estrutura do Projeto

```
api-diplan-data/
├── src/
│   ├── config/
│   │   └── environment.js       # Configurações e validação de env vars
│   ├── services/
│   │   ├── holidayService.js    # Gerencia feriados
│   │   ├── businessHoursCalculator.js  # Calcula horário comercial
│   │   ├── slaCalculator.js     # Motor de cálculo de SLA
│   │   └── pipefyClient.js      # Cliente GraphQL do Pipefy
│   ├── controllers/
│   │   └── webhookController.js # Orquestra fluxo de webhook
│   ├── tests/
│   │   └── slaCalculator.test.js # Testes automatizados
│   └── server.js                # Servidor Express
├── .env.example                 # Template de configuração
├── .gitignore
├── package.json
└── README.md
```

## 🔒 Segurança

- ✅ Validação de token em todos os webhooks
- ✅ Arquivo `.env` no `.gitignore` (nunca commitar!)
- ✅ Tratamento de erros sem expor dados sensíveis
- ✅ Rate limiting recomendado para produção

## 🐛 Troubleshooting

### Erro: "Variável de ambiente obrigatória não definida"

- Certifique-se de criar o arquivo `.env` baseado no `.env.example`
- Verifique se todas as variáveis obrigatórias estão preenchidas

### Campos não são atualizados no Pipefy

- Verifique se os IDs dos campos estão corretos
- Confirme que seu token do Pipefy tem permissões de escrita
- Veja os logs do servidor para identificar erros da API

### Deadline está incorreto

- Confirme o timezone configurado (`TIMEZONE`)
- Verifique lista de feriados (`HOLIDAYS_JSON`)
- Execute `npm test` para validar cálculos

## 📚 Melhorias Futuras

- [ ] **Pausa/Retomada de SLA**: quando card vai para "Pendente"
- [ ] **Múltiplos tipos de SLA**: manutenção (2d), desenvolvimento (7d), implantação (14d)
- [ ] **Dashboard de monitoramento**: cards vencidos, próximos do vencimento
- [ ] **Notificações**: alertas quando SLA está próximo de vencer
- [ ] **Histórico de SLA**: registrar todas as mudanças
- [ ] **API REST adicional**: endpoints para consultar SLA programaticamente

## 📄 Licença

ISC - Desenvolvido para DIPLAN

## 🤝 Suporte

Para dúvidas ou problemas, abra uma issue ou entre em contato com a equipe de desenvolvimento.

---

**Feito com ❤️ para automatizar SLAs no Pipefy**
