const API_KEY = '{{secrets.OPENWEATHER_API_KEY}}';
// Отримання елементів
const cityInput = document.getElementById('cityInput');
const searchButton = document.getElementById('searchButton');
let tempChartInstance = null;
let pressureChartInstance = null;

// Функція для збереження міста в localStorage
function saveCity(city) {
    localStorage.setItem('lastCity', city);
}

// Функція для отримання міста з localStorage
function getSavedCity() {
    return localStorage.getItem('lastCity');
}

// Обробник події кліку на кнопці
searchButton.addEventListener('click', () => {
    const city = cityInput.value;
    if (city) {
        getWeatherData(city);
        saveCity(city); // Зберігаємо нове місто
    }
});

// Додаємо обробник для натискання Enter в полі вводу
cityInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        searchButton.click();
    }
});

function getWeatherData(city) {
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=ua`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=ua`;

    // Отримуємо поточні дані
    fetch(weatherUrl)
        .then(response => response.json())
        .then(data => {
            if (data.cod === 200) {
                displayWeather(data);
                getAstroData(data.coord.lat, data.coord.lon);
                // Розрахунок індексу успіху після отримання всіх даних
                calculateSuccessIndex(data);
            } else {
                document.getElementById('weather-info').innerHTML = `<p>Місто не знайдено.</p>`;
            }
        })
        .catch(error => console.error('Помилка при отриманні поточних даних:', error));

    // Отримуємо прогноз на 5 днів
    fetch(forecastUrl)
        .then(response => response.json())
        .then(data => {
            if (data.cod === "200") {
                const currentPressure = data.list[0].main.pressure;
                const nextPressure = data.list[1].main.pressure;
                let pressureAdvice = "";
                if (currentPressure > nextPressure) {
                    pressureAdvice = "Тиск зростає: риба може бути більш активна. Чудовий час для риболовлі.";
                } else if (currentPressure < nextPressure) {
                    pressureAdvice = "Тиск падає: можливі зміни у поведінці риби. Будьте уважні.";
                } else {
                    pressureAdvice = "Тиск стабільний: хороші умови для риболовлі.";
                }
                document.getElementById('pressure-advice').innerHTML = `<p><b>Тиск:</b> ${currentPressure} hPa. ${pressureAdvice}</p>`;

                const labels = data.list.map(item => {
                    const date = new Date(item.dt * 1000);
                    return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
                });
                const temperatures = data.list.map(item => item.main.temp);
                const pressures = data.list.map(item => item.main.pressure);

                if (tempChartInstance) {
                    tempChartInstance.destroy();
                }
                if (pressureChartInstance) {
                    pressureChartInstance.destroy();
                }

                const tempChartCtx = document.getElementById('tempChart').getContext('2d');
                tempChartInstance = new Chart(tempChartCtx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Температура (°C)',
                            data: temperatures,
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1,
                            tension: 0.4
                        }]
                    },
                    options: {
                        scales: { y: { beginAtZero: false } }
                    }
                });

                const pressureChartCtx = document.getElementById('pressureChart').getContext('2d');
                pressureChartInstance = new Chart(pressureChartCtx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Тиск (hPa)',
                            data: pressures,
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: { y: { beginAtZero: false } }
                    }
                });
            }
        })
        .catch(error => console.error('Помилка при отриманні прогнозу:', error));
}

function displayWeather(data) {
    const temperature = data.main.temp;
    const description = data.weather[0].description;
    const pressure = data.main.pressure;
    const windSpeed = data.wind.speed;
    const windDeg = data.wind.deg; // Напрямок вітру в градусах

    document.getElementById('weather-info').innerHTML = `
        <h3>Поточні дані в ${data.name}</h3>
        <p>Температура: ${temperature}°C</p>
        <p>Опис: ${description}</p>
        <p>Тиск: ${pressure} hPa</p>
    `;
    document.getElementById('wind-info').innerHTML = `
        <p>
            Швидкість вітру: ${windSpeed} м/с
            <span id="windDirectionIcon" style="display: inline-block; transform: rotate(${windDeg}deg);">↑</span>
        </p>
    `;
}

function getAstroData(lat, lon) {
    const today = new Date();
    
    // Отримання астрономічних даних
    const times = SunCalc.getTimes(today, lat, lon);
    const moonIllumination = SunCalc.getMoonIllumination(today);

    // Дані про схід та захід сонця
    const sunrise = times.sunrise.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const sunset = times.sunset.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

    // Дані про Місяць
    const moonPhase = moonIllumination.phase; // Від 0 до 1
    const moonIlluminationPercent = Math.round(moonPhase * 100);
    
    let moonAdvice = "";
    if (moonPhase > 0.45 && moonPhase < 0.55) {
        moonAdvice = "Повний Місяць. Час активного кльову. 🌕";
    } else if (moonPhase < 0.05 || moonPhase > 0.95) {
        moonAdvice = "Новий Місяць. Сприятливий час для риболовлі. 🌑";
    } else {
        moonAdvice = "Змінюється фаза. Кльов може бути менш передбачуваним.";
    }

    document.getElementById('astro-info').innerHTML = `
        <h3>Астрономічні дані</h3>
        <p>Схід сонця: ${sunrise}</p>
        <p>Захід сонця: ${sunset}</p>
        <p>Фаза Місяця: ${moonIlluminationPercent}% освітлення. ${moonAdvice}</p>
    `;
}

// Нова функція для розрахунку індексу успіху
function calculateSuccessIndex(data) {
    let index = 0;
    const temp = data.main.temp;
    const windSpeed = data.wind.speed;
    const pressure = data.main.pressure;
    const moonPhase = SunCalc.getMoonIllumination(new Date()).phase;

    // Оцінка температури
    if (temp >= 10 && temp <= 25) {
        index += 3;
    } else if (temp > 5 && temp < 30) {
        index += 2;
    }

    // Оцінка швидкості вітру
    if (windSpeed < 5) {
        index += 3;
    } else if (windSpeed >= 5 && windSpeed < 10) {
        index += 2;
    } else {
        index += 1;
    }

    // Оцінка тиску (спрощена, вважаємо, що поточний тиск — це найкращий показник)
    if (pressure > 1013) {
        index += 2;
    } else {
        index += 1;
    }

    // Оцінка фази Місяця
    if (moonPhase > 0.45 && moonPhase < 0.55 || moonPhase < 0.05 || moonPhase > 0.95) {
        index += 2;
    } else {
        index += 1;
    }

    // Зводимо до шкали від 1 до 10
    const finalIndex = Math.min(10, Math.max(1, Math.round(index * 1.25)));

    let indexMessage = "";
    if (finalIndex >= 8) {
        indexMessage = "Дуже високий шанс на успішну риболовлю! 🎉";
    } else if (finalIndex >= 5) {
        indexMessage = "Умови хороші. Варто спробувати! 👍";
    } else {
        indexMessage = "Умови не найкращі. Може пощастить. 🎣";
    }

    document.getElementById('success-index').innerHTML = `
        <h3>Прогноз успіху</h3>
        <p><b>Індекс риболовлі:</b> ${finalIndex}/10. ${indexMessage}</p>
    `;
}

// Визначаємо початкове місто
const savedCity = getSavedCity();
const initialCity = savedCity || 'Kyiv'; // Використовуємо збережене місто або "Kyiv"
cityInput.value = initialCity;

// Завантаження даних за замовчуванням при першому відкритті
getWeatherData(cityInput.value);
