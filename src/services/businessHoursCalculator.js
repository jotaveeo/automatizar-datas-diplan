import { DateTime } from 'luxon';
import { config } from '../config/environment.js';
import { holidayService } from './holidayService.js';

/**
 * Calculador de horário comercial
 * Ajusta datas para horário comercial considerando finais de semana e feriados
 */

class BusinessHoursCalculator {
  constructor() {
    this.timezone = config.timezone;
    this.businessStart = config.businessHours.start;
    this.businessEnd = config.businessHours.end;
  }

  /**
   * Verifica se um horário está dentro do expediente
   * @param {DateTime} dateTime - Data/hora a verificar
   * @returns {boolean} true se estiver no horário comercial
   */
  isWithinBusinessHours(dateTime) {
    const hour = dateTime.hour;
    const minute = dateTime.minute;
    
    const currentMinutes = hour * 60 + minute;
    const startMinutes = this.businessStart.hours * 60 + this.businessStart.minutes;
    const endMinutes = this.businessEnd.hours * 60 + this.businessEnd.minutes;

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * Ajusta uma data/hora para o próximo horário comercial válido
   * Se for fora do expediente, final de semana ou feriado, ajusta para próximo dia útil
   * @param {DateTime} dateTime - Data/hora a ajustar
   * @returns {DateTime} Data/hora ajustada
   */
  adjustToNextBusinessTime(dateTime) {
    let adjusted = dateTime.setZone(this.timezone);

    // Primeiro, verifica se é dia útil
    while (!holidayService.isBusinessDay(adjusted)) {
      // Avança para o próximo dia às 08:00
      adjusted = adjusted.plus({ days: 1 }).set({
        hour: this.businessStart.hours,
        minute: this.businessStart.minutes,
        second: 0,
        millisecond: 0
      });
    }

    // Agora que temos um dia útil, verifica o horário
    const hour = adjusted.hour;
    const minute = adjusted.minute;
    const currentMinutes = hour * 60 + minute;
    const startMinutes = this.businessStart.hours * 60 + this.businessStart.minutes;
    const endMinutes = this.businessEnd.hours * 60 + this.businessEnd.minutes;

    // Se for antes do expediente, ajusta para início do expediente
    if (currentMinutes < startMinutes) {
      adjusted = adjusted.set({
        hour: this.businessStart.hours,
        minute: this.businessStart.minutes,
        second: 0,
        millisecond: 0
      });
    }
    // Se for depois do expediente, vai para próximo dia útil
    else if (currentMinutes >= endMinutes) {
      adjusted = adjusted.plus({ days: 1 }).set({
        hour: this.businessStart.hours,
        minute: this.businessStart.minutes,
        second: 0,
        millisecond: 0
      });

      // Verifica novamente se o próximo dia é útil
      while (!holidayService.isBusinessDay(adjusted)) {
        adjusted = adjusted.plus({ days: 1 });
      }
    }

    return adjusted;
  }

  /**
   * Calcula quantas horas úteis restam no dia atual
   * @param {DateTime} dateTime - Data/hora de início
   * @returns {number} Horas restantes no expediente (pode ser decimal)
   */
  remainingHoursInDay(dateTime) {
    const adjusted = this.adjustToNextBusinessTime(dateTime);
    
    const currentMinutes = adjusted.hour * 60 + adjusted.minute;
    const endMinutes = this.businessEnd.hours * 60 + this.businessEnd.minutes;
    
    const remainingMinutes = endMinutes - currentMinutes;
    return remainingMinutes / 60; // Retorna em horas
  }

  /**
   * Retorna total de horas comerciais em um dia
   * @returns {number} Total de horas (ex: 10 para expediente 08:00-18:00)
   */
  totalBusinessHoursPerDay() {
    const startMinutes = this.businessStart.hours * 60 + this.businessStart.minutes;
    const endMinutes = this.businessEnd.hours * 60 + this.businessEnd.minutes;
    return (endMinutes - startMinutes) / 60;
  }
}

// Exporta instância única
export const businessHoursCalculator = new BusinessHoursCalculator();
