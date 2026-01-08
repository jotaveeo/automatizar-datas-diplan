import { config } from '../config/environment.js';
import { DateTime } from 'luxon';

/**
 * Serviço para gerenciar feriados
 * Valida se uma data é feriado e fornece lista de feriados
 */

class HolidayService {
  constructor() {
    // Converte strings de feriados para objetos DateTime para comparação eficiente
    this.holidays = new Set(config.holidays);
  }

  /**
   * Verifica se uma data é feriado
   * @param {DateTime} date - Data em formato Luxon DateTime
   * @returns {boolean} true se for feriado
   */
  isHoliday(date) {
    if (!DateTime.isDateTime(date)) {
      throw new Error('Data deve ser um objeto DateTime do Luxon');
    }

    // Converte para formato YYYY-MM-DD para comparação
    const dateStr = date.toFormat('yyyy-MM-dd');
    return this.holidays.has(dateStr);
  }

  /**
   * Verifica se uma data é final de semana
   * @param {DateTime} date - Data em formato Luxon DateTime
   * @returns {boolean} true se for sábado ou domingo
   */
  isWeekend(date) {
    if (!DateTime.isDateTime(date)) {
      throw new Error('Data deve ser um objeto DateTime do Luxon');
    }

    // weekday: 1 = Monday, 6 = Saturday, 7 = Sunday
    const weekday = date.weekday;
    return weekday === 6 || weekday === 7;
  }

  /**
   * Verifica se uma data é dia útil (não é final de semana nem feriado)
   * @param {DateTime} date - Data em formato Luxon DateTime
   * @returns {boolean} true se for dia útil
   */
  isBusinessDay(date) {
    return !this.isWeekend(date) && !this.isHoliday(date);
  }

  /**
   * Retorna lista de feriados cadastrados
   * @returns {string[]} Array de datas em formato YYYY-MM-DD
   */
  getHolidays() {
    return Array.from(this.holidays);
  }

  /**
   * Adiciona um feriado à lista (útil para testes)
   * @param {string} dateStr - Data em formato YYYY-MM-DD
   */
  addHoliday(dateStr) {
    this.holidays.add(dateStr);
  }
}

// Exporta instância única (singleton)
export const holidayService = new HolidayService();
