import { DateTime } from 'luxon';
import { config } from '../config/environment.js';
import { businessHoursCalculator } from './businessHoursCalculator.js';
import { holidayService } from './holidayService.js';

/**
 * Motor de cálculo de SLA
 * Calcula prazos considerando apenas horas comerciais efetivas
 */

class SlaCalculator {
  constructor() {
    this.timezone = config.timezone;
  }

  /**
   * Calcula o deadline de SLA somando dias úteis em horas comerciais
   * 
   * IMPORTANTE: 2 dias úteis = 20 horas de trabalho (2 dias × 10h/dia)
   * O cálculo considera apenas o tempo dentro do expediente
   * 
   * @param {DateTime|string} startTime - Data/hora de início (string ISO ou DateTime)
   * @param {number} businessDays - Número de dias úteis a adicionar
   * @returns {Object} { start: DateTime, deadline: DateTime }
   */
  calculateDeadline(startTime, businessDays) {
    // Converte string para DateTime se necessário
    let start = typeof startTime === 'string' 
      ? DateTime.fromISO(startTime, { zone: this.timezone })
      : startTime.setZone(this.timezone);

    // Ajusta para próximo horário comercial válido
    start = businessHoursCalculator.adjustToNextBusinessTime(start);

    // Calcula total de horas a adicionar
    const hoursPerDay = businessHoursCalculator.totalBusinessHoursPerDay();
    const totalHoursToAdd = businessDays * hoursPerDay;

    // Calcula o deadline
    const deadline = this.addBusinessHours(start, totalHoursToAdd);

    return {
      start,
      deadline,
      businessDays,
      totalHours: totalHoursToAdd
    };
  }

  /**
   * Adiciona horas comerciais a uma data
   * Pula finais de semana, feriados e período noturno
   * 
   * @param {DateTime} startTime - Data/hora de início
   * @param {number} hoursToAdd - Horas comerciais a adicionar
   * @returns {DateTime} Data/hora final
   */
  addBusinessHours(startTime, hoursToAdd) {
    let current = startTime;
    let remainingHours = hoursToAdd;

    // Proteção contra loop infinito
    let iterations = 0;
    const maxIterations = 1000;

    while (remainingHours > 0 && iterations < maxIterations) {
      iterations++;

      // Garante que estamos em horário comercial
      current = businessHoursCalculator.adjustToNextBusinessTime(current);

      // Verifica quantas horas restam no dia atual
      const hoursLeftToday = businessHoursCalculator.remainingHoursInDay(current);

      if (remainingHours <= hoursLeftToday) {
        // Cabe no dia atual
        current = current.plus({ hours: remainingHours });
        remainingHours = 0;
      } else {
        // Usa todo o tempo do dia atual e continua no próximo
        remainingHours -= hoursLeftToday;
        
        // Vai para o próximo dia útil às 08:00
        current = current.plus({ days: 1 }).set({
          hour: config.businessHours.start.hours,
          minute: config.businessHours.start.minutes,
          second: 0,
          millisecond: 0
        });

        // Pula finais de semana e feriados
        while (!holidayService.isBusinessDay(current)) {
          current = current.plus({ days: 1 });
        }
      }
    }

    if (iterations >= maxIterations) {
      console.warn('⚠️ Limite de iterações atingido no cálculo de SLA');
    }

    return current;
  }

  /**
   * Calcula SLA para manutenção (2 dias úteis)
   * Atalho para o caso de uso mais comum
   * 
   * @param {DateTime|string} startTime - Data/hora de início
   * @returns {Object} { start, deadline, businessDays, totalHours }
   */
  calculateMaintenanceSla(startTime) {
    return this.calculateDeadline(startTime, config.sla.maintenanceDays);
  }

  /**
   * Determina o status do SLA baseado no deadline
   * 
   * @param {DateTime} deadline - Prazo limite
   * @param {DateTime} currentTime - Hora atual (opcional, padrão: agora)
   * @returns {string} Status: 'NO_PRAZO', 'PROXIMO_VENCIMENTO', 'VENCIDO'
   */
  getSlaStatus(deadline, currentTime = null) {
    const now = currentTime || DateTime.now().setZone(this.timezone);
    const hoursUntilDeadline = deadline.diff(now, 'hours').hours;

    if (hoursUntilDeadline < 0) {
      return 'VENCIDO';
    } else if (hoursUntilDeadline <= 2) {
      return 'PROXIMO_VENCIMENTO';
    } else {
      return 'NO_PRAZO';
    }
  }

  /**
   * Formata data/hora para exibição no Pipefy
   * 
   * @param {DateTime} dateTime - Data/hora a formatar
   * @returns {string} String em formato ISO 8601
   */
  formatForPipefy(dateTime) {
    return dateTime.toISO();
  }
}

// Exporta instância única
export const slaCalculator = new SlaCalculator();
