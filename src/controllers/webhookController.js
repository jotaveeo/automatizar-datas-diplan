import { DateTime } from 'luxon';
import { config } from '../config/environment.js';
import { slaCalculator } from '../services/slaCalculator.js';
import { pipefyClient } from '../services/pipefyClient.js';

/**
 * Controller para processar webhooks do Pipefy
 * Orquestra todo o fluxo de cálculo e atualização de SLA
 */

/**
 * Processa webhook quando card entra em fase
 * @param {Object} webhookData - Dados recebidos do webhook
 * @returns {Promise<Object>} Resultado do processamento
 */
export async function handleSlaWebhook(webhookData) {
  const { card_id, phase_name, timestamp } = webhookData;

  console.log(`\n🔔 Webhook recebido para card ${card_id} na fase "${phase_name}"`);

  try {
    // 1. Busca dados do card no Pipefy
    console.log('📥 Buscando dados do card...');
    const card = await pipefyClient.getCard(card_id);
    
    if (!card) {
      throw new Error(`Card ${card_id} não encontrado`);
    }

    console.log(`✅ Card encontrado: "${card.title}"`);

    // 2. Define início do SLA (agora ou horário do webhook)
    const now = timestamp 
      ? DateTime.fromISO(timestamp, { zone: config.timezone })
      : DateTime.now().setZone(config.timezone);

    console.log(`⏰ Início do SLA: ${now.toFormat('dd/MM/yyyy HH:mm')}`);

    // 3. Calcula deadline (2 dias úteis)
    console.log('🧮 Calculando deadline...');
    const slaResult = slaCalculator.calculateMaintenanceSla(now);

    console.log(`📅 Deadline calculado: ${slaResult.deadline.toFormat('dd/MM/yyyy HH:mm')}`);
    console.log(`   Total: ${slaResult.businessDays} dias úteis (${slaResult.totalHours} horas comerciais)`);

    // 4. Determina status inicial do SLA
    const slaStatus = slaCalculator.getSlaStatus(slaResult.deadline);
    console.log(`📊 Status inicial: ${slaStatus}`);

    // 5. Formata datas para exibição (formato brasileiro)
    const formatDate = (dateTime) => {
      const day = String(dateTime.day).padStart(2, '0');
      const month = String(dateTime.month).padStart(2, '0');
      const year = dateTime.year;
      const hours = String(dateTime.hour).padStart(2, '0');
      const minutes = String(dateTime.minute).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    const slaInicio = formatDate(slaResult.start);
    const slaDeadline = formatDate(slaResult.deadline);

    console.log(`✅ SLA calculado com sucesso!`);
    console.log(`   Início: ${slaInicio}`);
    console.log(`   Deadline: ${slaDeadline}`);
    console.log(`   Status: ${slaStatus}`);

    // 6. Retorna resposta para o Pipefy preencher automaticamente
    // O Pipefy usará esses valores para preencher os campos de texto
    console.log('📤 Retornando resposta para Pipefy preencher campos automaticamente...');
    
    return {
      success: true,
      cardId: card_id,
      sla_inicio: slaInicio,
      sla_deadline: slaDeadline,
      sla_status: slaStatus,
      sla_dias_uteis: slaResult.businessDays,
      sla_horas_comerciais: slaResult.totalHours,
      message: `SLA calculado: ${slaInicio} até ${slaDeadline}`
    };

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    
    return {
      success: false,
      cardId: card_id,
      error: error.message,
      stack: config.nodeEnv === 'development' ? error.stack : undefined
    };
  }
}

/**
 * Valida dados do webhook
 * @param {Object} data - Dados recebidos
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateWebhookData(data) {
  const errors = [];

  if (!data) {
    errors.push('Dados do webhook ausentes');
    return { valid: false, errors };
  }

  if (!data.card_id) {
    errors.push('card_id é obrigatório');
  }

  if (!data.phase_name) {
    errors.push('phase_name é obrigatório');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
