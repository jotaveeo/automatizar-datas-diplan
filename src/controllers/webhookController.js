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

    // 5. Prepara dados para atualização
    const slaData = {
      start: slaCalculator.formatForPipefy(slaResult.start),
      deadline: slaCalculator.formatForPipefy(slaResult.deadline),
      status: slaStatus
    };

    // 6. Atualiza campos no Pipefy
    console.log('💾 Atualizando campos no Pipefy...');
    const updateResult = await pipefyClient.updateSlaFields(card_id, slaData);

    if (!updateResult.success) {
      console.warn('⚠️ Alguns campos não foram atualizados:', updateResult.results);
    } else {
      console.log('✅ Todos os campos atualizados com sucesso!');
    }

    // 7. (Opcional) Cria comentário para auditoria
    if (config.nodeEnv === 'development') {
      const comment = `🤖 SLA calculado automaticamente:\n` +
        `• Início: ${slaResult.start.toFormat('dd/MM/yyyy HH:mm')}\n` +
        `• Prazo: ${slaResult.deadline.toFormat('dd/MM/yyyy HH:mm')}\n` +
        `• Status: ${slaStatus}`;
      
      await pipefyClient.createComment(card_id, comment);
    }

    // 8. Retorna resposta de sucesso
    return {
      success: true,
      cardId: card_id,
      sla: {
        start: slaResult.start.toISO(),
        deadline: slaResult.deadline.toISO(),
        status: slaStatus,
        businessDays: slaResult.businessDays,
        totalHours: slaResult.totalHours
      },
      updateResult
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
