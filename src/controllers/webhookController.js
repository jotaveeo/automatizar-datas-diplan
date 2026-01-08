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

    // 5. Formata datas para ISO-8601 (formato requerido pelo Pipefy para datetime)
    // Formato: YYYY-MM-DDTHH:mm:ssZ
    const slaInicio = slaResult.start.toISO();
    const slaDeadline = slaResult.deadline.toISO();

    // Também cria versões para exibição (brasileiro)
    const slaInicioDisplay = slaResult.start.toFormat('dd/MM/yyyy HH:mm');
    const slaDeadlineDisplay = slaResult.deadline.toFormat('dd/MM/yyyy HH:mm');

    console.log(`✅ SLA calculado com sucesso!`);
    console.log(`   Início: ${slaInicioDisplay} (ISO: ${slaInicio})`);
    console.log(`   Deadline: ${slaDeadlineDisplay} (ISO: ${slaDeadline})`);
    console.log(`   Status: ${slaStatus}`);

    // 6. Retorna resposta para o Pipefy preencher automaticamente
    // Usando formato ISO-8601 para campos datetime/due_date
    console.log('📤 Retornando resposta para Pipefy preencher campos automaticamente...');
    
    return {
      success: true,
      cardId: card_id,
      sla_inicio: slaInicio,              // ISO-8601 para campo datetime
      sla_deadline: slaDeadline,          // ISO-8601 para campo due_date
      sla_inicio_display: slaInicioDisplay, // Formato brasileiro para texto
      sla_deadline_display: slaDeadlineDisplay, // Formato brasileiro para texto
      sla_status: slaStatus,
      sla_dias_uteis: slaResult.businessDays,
      sla_horas_comerciais: slaResult.totalHours,
      message: `SLA calculado: ${slaInicioDisplay} até ${slaDeadlineDisplay}`
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
