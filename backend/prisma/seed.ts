const { PrismaClient } = require('@prisma/client');
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Чтение файла');
  const profilesMap = new Map(); 
  const csvFilePath = path.join(__dirname, '../data/incidents_2000.csv');

  if (!fs.existsSync(csvFilePath)) {
      console.error('Файл не найден');
      process.exit(1);
  }

  const parser = fs.createReadStream(csvFilePath).pipe(
    csv({
      separator: ',',
      mapHeaders: ({ header }) => header.trim()
    })
  );

  for await (const row of parser) {
    const code = row['Код предприятия'];
    
    if (code && !profilesMap.has(code)) {
      const rawHosts = row['Количество хостов'] || '0';
      const hostCount = parseInt(rawHosts.replace(/\D/g, ''), 10) || 0;

      profilesMap.set(code, {
        enterprise_code: code,
        type: row['Тип предприятия'] || 'Неизвестно',
        host_count: hostCount,
        region: row['Регион размещения предприятия'] || 'Не указан'
      });
    }
  }

  console.log(`Найдено уникальных компаний: ${profilesMap.size}`);
  console.log('Загрузка в базу данных');

  let count = 0;
  for (const profile of profilesMap.values()) {
    await prisma.enterpriseProfile.upsert({
      where: { enterprise_code: profile.enterprise_code },
      update: {},
      create: profile,
    });
    
    count++;
    if (count % 200 === 0) {
        console.log(`Загружено ${count} профилей...`);
    }
  }

  console.log('Загрузка успешно завершена');
}

main()
  .catch((e) => {
    console.error('Ошибка при выполнении скрипта:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
