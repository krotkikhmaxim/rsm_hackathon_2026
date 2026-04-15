import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 6 типов угроз из threatdescriptions.json
const THREATS = [
  { code: 'THREAT-1', name: 'Вредоносное ПО (Malware)', description: 'Распространение вредоносного ПО, включая вирусы, трояны и ransomware.', cluster: '1' },
  { code: 'THREAT-2', name: 'Атаки типа DDoS', description: 'Распределенные атаки на отказ в обслуживании, перегружающие сетевую инфраструктуру.', cluster: '2' },
  { code: 'THREAT-3', name: 'Brute Force / Подбор паролей', description: 'Попытки подбора учетных данных через словарные атаки и перебор.', cluster: '3' },
  { code: 'THREAT-4', name: 'Социальная инженерия / Фишинг', description: 'Фишинговые атаки на сотрудников с целью кражи учетных данных и доступа.', cluster: '4' },
  { code: 'THREAT-5', name: 'Эксплуатация уязвимостей', description: 'Попытки использования известных уязвимостей в ПО и инфраструктуре.', cluster: '5' },
  { code: 'THREAT-6', name: 'Инсайдерские угрозы', description: 'Несанкционированные действия сотрудников или подрядчиков.', cluster: '6' },
];

// 3 рекомендации на каждую угрозу (18 всего)
const RECOMMENDATIONS: { rec_code: string; title: string; description: string; priority: number; threatCode: string }[] = [
  // Malware
  { rec_code: 'REC-1-1', title: 'Обновить антивирусные базы', description: 'Установить последние обновления антивирусного ПО на всех узлах.', priority: 1, threatCode: 'THREAT-1' },
  { rec_code: 'REC-1-2', title: 'Включить поведенческий анализ', description: 'Активировать эвристический анализ для обнаружения неизвестных угроз.', priority: 2, threatCode: 'THREAT-1' },
  { rec_code: 'REC-1-3', title: 'Ограничить выполнение макросов', description: 'Запретить автоматическое выполнение макросов в офисных документах.', priority: 3, threatCode: 'THREAT-1' },
  // DDoS
  { rec_code: 'REC-2-1', title: 'Включить DDoS-защиту провайдера', description: 'Активировать фильтрацию трафика на уровне провайдера.', priority: 1, threatCode: 'THREAT-2' },
  { rec_code: 'REC-2-2', title: 'Настроить rate limiting', description: 'Ограничить частоту запросов для защиты от перегрузки.', priority: 2, threatCode: 'THREAT-2' },
  { rec_code: 'REC-2-3', title: 'Увеличить пропускную способность', description: 'Масштабировать ресурсы для обработки аномального трафика.', priority: 3, threatCode: 'THREAT-2' },
  // Brute Force
  { rec_code: 'REC-3-1', title: 'Внедрить MFA', description: 'Включить многофакторную аутентификацию для всех пользователей.', priority: 1, threatCode: 'THREAT-3' },
  { rec_code: 'REC-3-2', title: 'Блокировка после N попыток', description: 'Настроить автоматическую блокировку после 5 неудачных попыток входа.', priority: 2, threatCode: 'THREAT-3' },
  { rec_code: 'REC-3-3', title: 'Использовать сложные пароли', description: 'Установить политику минимальной сложности паролей (12+ символов).', priority: 3, threatCode: 'THREAT-3' },
  // Phishing
  { rec_code: 'REC-4-1', title: 'Обучение сотрудников', description: 'Провести тренинг по распознаванию фишинговых писем.', priority: 1, threatCode: 'THREAT-4' },
  { rec_code: 'REC-4-2', title: 'Фильтрация входящей почты', description: 'Настроить антиспам и антифишинг фильтры на почтовом сервере.', priority: 2, threatCode: 'THREAT-4' },
  { rec_code: 'REC-4-3', title: 'Внедрение DMARC', description: 'Настроить DMARC/DKIM/SPF для защиты от подделки отправителя.', priority: 3, threatCode: 'THREAT-4' },
  // Exploits
  { rec_code: 'REC-5-1', title: 'Регулярное обновление ПО', description: 'Установить критические патчи безопасности в течение 48 часов.', priority: 1, threatCode: 'THREAT-5' },
  { rec_code: 'REC-5-2', title: 'Сканирование уязвимостей', description: 'Проводить еженедельное сканирование инфраструктуры.', priority: 2, threatCode: 'THREAT-5' },
  { rec_code: 'REC-5-3', title: 'Сегментация сети', description: 'Разделить сеть на зоны для ограничения распространения атак.', priority: 3, threatCode: 'THREAT-5' },
  // Insider
  { rec_code: 'REC-6-1', title: 'Принцип наименьших привилегий', description: 'Выдавать минимально необходимые права доступа.', priority: 1, threatCode: 'THREAT-6' },
  { rec_code: 'REC-6-2', title: 'Мониторинг действий пользователей', description: 'Внедрить систему аудита и мониторинга привилегированных сессий.', priority: 2, threatCode: 'THREAT-6' },
  { rec_code: 'REC-6-3', title: 'Использование DLP-систем', description: 'Развернуть систему предотвращения утечки данных.', priority: 3, threatCode: 'THREAT-6' },
];

// 3 демо-предприятия
const ENTERPRISES = [
  { enterprise_code: 'DEMO-01', type: 'Финансовые и IT-компании', host_count: 1500, region: 'Москва' },
  { enterprise_code: 'DEMO-02', type: 'Промышленные предприятия', host_count: 800, region: 'Санкт-Петербург' },
  { enterprise_code: 'DEMO-03', type: 'Государственные учреждения', host_count: 200, region: 'Новосибирск' },
];

async function main() {
  console.log('=== Сидирование базы данных ===');

  // 1. Угрозы
  console.log('Загрузка угроз...');
  for (const threat of THREATS) {
    await prisma.threat.upsert({
      where: { code: threat.code },
      update: { name: threat.name, description: threat.description, cluster: threat.cluster },
      create: threat,
    });
  }
  console.log(`Загружено ${THREATS.length} угроз`);

  // 2. Рекомендации
  console.log('Загрузка рекомендаций...');
  for (const rec of RECOMMENDATIONS) {
    const threat = await prisma.threat.findUnique({ where: { code: rec.threatCode } });
    if (!threat) {
      console.warn(`Угроза ${rec.threatCode} не найдена, пропуск рекомендации ${rec.rec_code}`);
      continue;
    }
    await prisma.recommendation.upsert({
      where: { rec_code: rec.rec_code },
      update: { title: rec.title, description: rec.description, priority: rec.priority, threatId: threat.id },
      create: {
        rec_code: rec.rec_code,
        title: rec.title,
        description: rec.description,
        priority: rec.priority,
        threatId: threat.id,
      },
    });
  }
  console.log(`Загружено ${RECOMMENDATIONS.length} рекомендаций`);

  // 3. Демо-предприятия
  console.log('Загрузка демо-предприятий...');
  for (const enterprise of ENTERPRISES) {
    await prisma.enterpriseProfile.upsert({
      where: { enterprise_code: enterprise.enterprise_code },
      update: {},
      create: enterprise,
    });
  }
  console.log(`Загружено ${ENTERPRISES.length} предприятий`);

  console.log('=== Сидирование завершено ===');
}

main()
  .catch((e) => {
    console.error('Ошибка при выполнении скрипта:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
