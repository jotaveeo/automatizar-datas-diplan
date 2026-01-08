import { DateTime } from 'luxon';
import { slaCalculator } from '../services/slaCalculator.js';
import { holidayService } from '../services/holidayService.js';
import { config } from '../config/environment.js';

/**
 * Testes simples para validar cálculo de SLA
 * Execute: npm test
 */

console.log('\n' + '='.repeat(70));
console.log('🧪 TESTES DE CÁLCULO DE SLA');
console.log('='.repeat(70) + '\n');

// Configuração de teste
console.log('⚙️ Configuração:');
console.log(`   Timezone: ${config.timezone}`);
console.log(`   Horário comercial: ${config.businessHours.start.hours}:${String(config.businessHours.start.minutes).padStart(2, '0')} - ${config.businessHours.end.hours}:${String(config.businessHours.end.minutes).padStart(2, '0')}`);
console.log(`   Feriados: ${config.holidays.length} cadastrados\n`);

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, testFn) {
  try {
    console.log(`\n📋 Teste: ${name}`);
    testFn();
    console.log('   ✅ PASSOU');
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ FALHOU: ${error.message}`);
    testsFailed++;
  }
}

// TESTE 1: Card entra durante horário comercial
runTest('Card entra às 09:00 de segunda-feira', () => {
  const start = DateTime.fromObject(
    { year: 2026, month: 1, day: 12, hour: 9, minute: 0 }, // Segunda-feira
    { zone: config.timezone }
  );

  const result = slaCalculator.calculateMaintenanceSla(start);
  
  console.log(`   Início: ${result.start.toFormat('EEE dd/MM HH:mm')}`);
  console.log(`   Deadline: ${result.deadline.toFormat('EEE dd/MM HH:mm')}`);
  
  // Deve adicionar 20 horas (2 dias × 10h)
  // 09:00 segunda + 9h = 18:00 segunda (fim do expediente)
  // + 10h na terça = 18:00 terça
  // + 1h na quarta = 10:00 quarta
  const expectedDeadline = DateTime.fromObject(
    { year: 2026, month: 1, day: 14, hour: 9, minute: 0 },
    { zone: config.timezone }
  );

  if (Math.abs(result.deadline.diff(expectedDeadline, 'hours').hours) > 1) {
    throw new Error(`Deadline incorreto. Esperado próximo de ${expectedDeadline.toFormat('dd/MM HH:mm')}`);
  }
});

// TESTE 2: Card entra fora do horário comercial
runTest('Card entra às 20:00 (fora do expediente)', () => {
  const start = DateTime.fromObject(
    { year: 2026, month: 1, day: 12, hour: 20, minute: 0 }, // Segunda 20h
    { zone: config.timezone }
  );

  const result = slaCalculator.calculateMaintenanceSla(start);
  
  console.log(`   Início ajustado: ${result.start.toFormat('EEE dd/MM HH:mm')}`);
  console.log(`   Deadline: ${result.deadline.toFormat('EEE dd/MM HH:mm')}`);
  
  // Deve iniciar terça às 08:00
  if (result.start.hour !== 8 || result.start.day !== 13) {
    throw new Error('Não ajustou para próximo horário comercial');
  }
});

// TESTE 3: Card entra na sexta-feira
runTest('Card entra sexta às 17:00 (próximo ao fim de semana)', () => {
  const start = DateTime.fromObject(
    { year: 2026, month: 1, day: 16, hour: 17, minute: 0 }, // Sexta 17h
    { zone: config.timezone }
  );

  const result = slaCalculator.calculateMaintenanceSla(start);
  
  console.log(`   Início: ${result.start.toFormat('EEE dd/MM HH:mm')}`);
  console.log(`   Deadline: ${result.deadline.toFormat('EEE dd/MM HH:mm')}`);
  
  // Deve pular final de semana e ir para segunda/terça
  const deadlineDay = result.deadline.weekday;
  if (deadlineDay === 6 || deadlineDay === 7) {
    throw new Error('Deadline caiu em final de semana!');
  }
});

// TESTE 4: Validação de feriado
runTest('Valida se 01/01/2026 é feriado', () => {
  const holiday = DateTime.fromObject(
    { year: 2026, month: 1, day: 1 },
    { zone: config.timezone }
  );

  const isHoliday = holidayService.isHoliday(holiday);
  console.log(`   01/01/2026 é feriado? ${isHoliday}`);
  
  if (!isHoliday) {
    throw new Error('Ano Novo deveria ser feriado');
  }
});

// TESTE 5: Validação de final de semana
runTest('Valida detecção de final de semana', () => {
  const saturday = DateTime.fromObject(
    { year: 2026, month: 1, day: 17 }, // Sábado
    { zone: config.timezone }
  );

  const isWeekend = holidayService.isWeekend(saturday);
  console.log(`   17/01/2026 (sábado) é final de semana? ${isWeekend}`);
  
  if (!isWeekend) {
    throw new Error('Sábado deveria ser detectado como final de semana');
  }
});

// TESTE 6: Status de SLA
runTest('Calcula status do SLA corretamente', () => {
  const now = DateTime.now().setZone(config.timezone);
  
  // Deadline no futuro = NO_PRAZO
  const futureDeadline = now.plus({ days: 5 });
  const status1 = slaCalculator.getSlaStatus(futureDeadline, now);
  console.log(`   Deadline em 5 dias: ${status1}`);
  
  // Deadline em 1 hora = PROXIMO_VENCIMENTO
  const soonDeadline = now.plus({ hours: 1 });
  const status2 = slaCalculator.getSlaStatus(soonDeadline, now);
  console.log(`   Deadline em 1 hora: ${status2}`);
  
  // Deadline no passado = VENCIDO
  const pastDeadline = now.minus({ hours: 1 });
  const status3 = slaCalculator.getSlaStatus(pastDeadline, now);
  console.log(`   Deadline há 1 hora: ${status3}`);
  
  if (status1 !== 'NO_PRAZO' || status2 !== 'PROXIMO_VENCIMENTO' || status3 !== 'VENCIDO') {
    throw new Error('Status de SLA incorretos');
  }
});

// Resumo dos testes
console.log('\n' + '='.repeat(70));
console.log('📊 RESUMO DOS TESTES');
console.log('='.repeat(70));
console.log(`✅ Passou: ${testsPassed}`);
console.log(`❌ Falhou: ${testsFailed}`);
console.log(`📈 Total: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 Todos os testes passaram com sucesso!\n');
  process.exit(0);
} else {
  console.log('\n⚠️ Alguns testes falharam. Revise a implementação.\n');
  process.exit(1);
}
