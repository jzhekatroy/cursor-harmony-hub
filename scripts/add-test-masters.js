const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

// Тестовые данные
const ADMIN_EMAIL = 'salon@example.com';
const ADMIN_PASSWORD = 'password123';

const TEST_MASTERS = [
  {
    email: 'anna@example.com',
    firstName: 'Анна',
    lastName: 'Петрова',
    description: 'Мастер маникюра и педикюра с 5-летним опытом работы. Специализируется на европейском маникюре и nail-арте.',
    photoUrl: 'https://images.unsplash.com/photo-1594824475317-2f7da8e7c2b0?w=300&h=300&fit=crop&crop=face',
    password: 'password123'
  },
  {
    email: 'elena@example.com', 
    firstName: 'Елена',
    lastName: 'Сидорова',
    description: 'Парикмахер-стилист. Работает с окрашиванием, стрижками и укладками. Постоянно повышает квалификацию.',
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop&crop=face',
    password: 'password123'
  }
];

async function loginAdmin() {
  console.log('🔐 Авторизация администратора...');
  
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Ошибка авторизации: ${error.error}`);
  }

  const data = await response.json();
  console.log('✅ Авторизация успешна');
  return data.token;
}

async function getServices(token) {
  console.log('📋 Получение списка услуг...');
  
  const response = await fetch(`${API_BASE}/services`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Ошибка получения услуг: ${error.error}`);
  }

  const data = await response.json();
  console.log(`✅ Найдено ${data.services.length} услуг`);
  return data.services;
}

async function addMaster(token, masterData, services) {
  console.log(`👤 Добавление мастера ${masterData.firstName} ${masterData.lastName}...`);
  
  // Назначаем мастеру случайные услуги (1-3 услуги)
  const shuffledServices = services.sort(() => 0.5 - Math.random());
  const assignedServices = shuffledServices.slice(0, Math.floor(Math.random() * 3) + 1);
  const serviceIds = assignedServices.map(s => s.id);
  
  const response = await fetch(`${API_BASE}/masters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      ...masterData,
      serviceIds
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Ошибка добавления мастера: ${error.error}`);
  }

  const data = await response.json();
  console.log(`✅ Мастер ${masterData.firstName} добавлен с услугами: ${assignedServices.map(s => s.name).join(', ')}`);
  return data.master;
}

async function main() {
  try {
    console.log('🚀 Добавление тестовых мастеров...');
    console.log('================================');

    // Авторизуемся
    const token = await loginAdmin();

    // Получаем услуги
    const services = await getServices(token);

    if (services.length === 0) {
      console.log('⚠️ Нет доступных услуг. Сначала добавьте услуги.');
      return;
    }

    // Добавляем мастеров
    for (const masterData of TEST_MASTERS) {
      try {
        await addMaster(token, masterData, services);
      } catch (error) {
        console.log(`❌ Ошибка добавления мастера ${masterData.firstName}: ${error.message}`);
      }
    }

    console.log('');
    console.log('🎉 Добавление тестовых мастеров завершено!');
    console.log('');
    console.log('📋 Тестовые аккаунты мастеров:');
    TEST_MASTERS.forEach(master => {
      console.log(`   - ${master.firstName} ${master.lastName}: ${master.email} / ${master.password}`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

// Запускаем только если файл выполняется напрямую
if (require.main === module) {
  main();
}

module.exports = { main };