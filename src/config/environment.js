import dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config();

/**
 * Valida e exporta configurações da aplicação
 * Garante que todas as variáveis obrigatórias estão definidas
 */

// Validação de variáveis obrigatórias
const requiredVars = [
  'WEBHOOK_TOKEN',
  'PIPEFY_TOKEN',
  'FIELD_SLA_START',
  'FIELD_SLA_DEADLINE'
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`❌ Variável de ambiente obrigatória não definida: ${varName}`);
  }
}

// Parse de horário comercial
const parseTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

// Parse de feriados
const parseHolidays = (holidaysJson) => {
  try {
    return JSON.parse(holidaysJson || '[]');
  } catch (error) {
    console.warn('⚠️ Erro ao fazer parse de HOLIDAYS_JSON, usando lista vazia:', error.message);
    return [];
  }
};

export const config = {
  // Segurança
  webhookToken: process.env.WEBHOOK_TOKEN,
  pipefyToken: process.env.PIPEFY_TOKEN,

  // Servidor
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Timezone e horário
  timezone: process.env.TIMEZONE || 'America/Fortaleza',
  businessHours: {
    start: parseTime(process.env.BUSINESS_START || '08:00'),
    end: parseTime(process.env.BUSINESS_END || '18:00')
  },

  // Feriados
  holidays: parseHolidays(process.env.HOLIDAYS_JSON),

  // Pipefy
  pipefy: {
    apiUrl: 'https://api.pipefy.com/graphql',
    pipeId: process.env.PIPE_ID,
    fields: {
      slaStart: process.env.FIELD_SLA_START,
      slaDeadline: process.env.FIELD_SLA_DEADLINE,
      slaStatus: process.env.FIELD_SLA_STATUS // opcional
    }
  },

  // SLA
  sla: {
    maintenanceDays: 2 // 2 dias úteis para manutenção
  }
};

// Log de configuração (apenas em desenvolvimento)
if (config.nodeEnv === 'development') {
  console.log('📋 Configuração carregada:');
  console.log(`   Timezone: ${config.timezone}`);
  console.log(`   Horário comercial: ${process.env.BUSINESS_START} - ${process.env.BUSINESS_END}`);
  console.log(`   Feriados cadastrados: ${config.holidays.length}`);
  console.log(`   Porta: ${config.port}`);
}
