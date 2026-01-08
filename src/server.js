import express from 'express';
import { config } from './config/environment.js';
import { handleSlaWebhook, validateWebhookData } from './controllers/webhookController.js';

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Middleware de log (apenas em desenvolvimento)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

/**
 * Middleware de autenticação via token
 * Aceita token no header (X-Webhook-Token) ou no body (webhook_token)
 */
function authenticateWebhook(req, res, next) {
  // Tenta pegar token do header primeiro
  let token = req.headers['x-webhook-token'];
  
  // Se não encontrar no header, tenta no body
  if (!token && req.body && req.body.webhook_token) {
    token = req.body.webhook_token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token de autenticação ausente',
      message: 'Envie o header X-Webhook-Token ou o campo webhook_token no body'
    });
  }

  if (token !== config.webhookToken) {
    return res.status(403).json({
      success: false,
      error: 'Token inválido',
      message: 'Token de autenticação não autorizado'
    });
  }

  next();
}

/**
 * Rota de health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    timezone: config.timezone,
    environment: config.nodeEnv
  });
});

/**
 * Endpoint principal: recebe webhook do Pipefy
 * 
 * Método: POST
 * Headers: X-Webhook-Token: <seu-token>
 * Body: { card_id: "123", phase_name: "Em andamento" }
 */
app.post('/webhook/sla', authenticateWebhook, async (req, res) => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 NOVO WEBHOOK RECEBIDO');
  console.log('='.repeat(60));

  // Valida dados do webhook
  const validation = validateWebhookData(req.body);
  if (!validation.valid) {
    console.error('❌ Validação falhou:', validation.errors);
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      details: validation.errors
    });
  }

  // Processa webhook
  try {
    const result = await handleSlaWebhook(req.body);
    
    const statusCode = result.success ? 200 : 500;
    
    console.log('='.repeat(60));
    console.log(result.success ? '✅ WEBHOOK PROCESSADO COM SUCESSO' : '❌ ERRO NO PROCESSAMENTO');
    console.log('='.repeat(60) + '\n');

    res.status(statusCode).json(result);
  } catch (error) {
    console.error('💥 Erro fatal ao processar webhook:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * Rota 404 - não encontrado
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    message: `Rota ${req.method} ${req.path} não existe`
  });
});

/**
 * Middleware de erro global
 */
app.use((err, req, res, next) => {
  console.error('💥 Erro não tratado:', err);
  
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: config.nodeEnv === 'development' ? err.message : 'Erro ao processar requisição'
  });
});

/**
 * Inicia servidor
 */
const PORT = config.port;

app.listen(PORT, () => {
  console.log('\n' + '█'.repeat(60));
  console.log('🚀 API DE SLA PIPEFY INICIADA');
  console.log('█'.repeat(60));
  console.log(`\n📡 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`🌍 Timezone: ${config.timezone}`);
  console.log(`⏰ Horário comercial: ${config.businessHours.start.hours}:${String(config.businessHours.start.minutes).padStart(2, '0')} - ${config.businessHours.end.hours}:${String(config.businessHours.end.minutes).padStart(2, '0')}`);
  console.log(`📅 Feriados cadastrados: ${config.holidays.length}`);
  console.log(`🔧 Ambiente: ${config.nodeEnv}`);
  console.log('\n✅ Pronto para receber webhooks!\n');
  console.log(`Endpoint: POST http://localhost:${PORT}/webhook/sla`);
  console.log(`Header: X-Webhook-Token: ${config.webhookToken.substring(0, 10)}...`);
  console.log('\n' + '█'.repeat(60) + '\n');
});

export default app;
