const API_KEY = '{{secrets.OPENWEATHER_API_KEY}}';
const DEFAULT_CITIES = ['Kyiv', 'Lviv', 'Odesa'];
const columnData = {};

function saveCity(city, columnId) {
    localStorage.setItem(`lastCity_${columnId}`, city);
}

function getSavedCity(columnId) {
    return localStorage.getItem(`lastCity_${columnId}`);
}

function initColumn(columnId, defaultCity) {
    const cityInput = document.getElementById(`cityInput${columnId}`);
    const searchButton = document.getElementById(`searchButton${columnId}`);
    
    let savedCity = getSavedCity(columnId) || defaultCity;
    cityInput.value = savedCity;

    searchButton.addEventListener('click', () => {
        const city = cityInput.value;
        if (city) {
            getWeatherData(city, columnId);
            saveCity(city, columnId);
        }
    });

    cityInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            searchButton.click();
        }
    });

    columnData[columnId] = { tempChartInstance: null, pressureChartInstance: null };
    getWeatherData(savedCity, columnId);
}

function getWeatherData(city, columnId) {
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=ua`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=ua`;

    fetch(weatherUrl)
        .then(response => response.json())
        .then(data => {
            if (data.cod === 200) {
                displayWeather(data, columnId);
                getAstroData(data.coord.lat, data.coord.lon, columnId);
                calculateSuccessIndex(data, columnId);
            } else {
                document.getElementById(`weather-info-${columnId}`).innerHTML = `<p>Місто не знайдено.</p>`;
            }
        })
        .catch(error => console.error('Помилка при отриманні поточних даних:', error));

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
                document.getElementById(`pressure-advice-${columnId}`).innerHTML = `<p><b>Тиск:</b> ${currentPressure} hPa. ${pressureAdvice}</p>`;

                const labels = data.list.map(item => new Date(item.dt * 1000).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }));
                const temperatures = data.list.map(item => item.main.temp);
                const pressures = data.list.map(item => item.main.pressure);

                if (columnData[columnId].tempChartInstance) {
                    columnData[columnId].tempChartInstance.destroy();
                }
                if (columnData[columnId].pressureChartInstance) {
                    columnData[columnId].pressureChartInstance.destroy();
                }

                const tempChartCtx = document.getElementById(`tempChart${columnId}`).getContext('2d');
                columnData[columnId].tempChartInstance = new Chart(tempChartCtx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{ label: 'Температура (°C)', data: temperatures, backgroundColor: 'rgba(255, 99, 132, 0.2)', borderColor: 'rgba(255, 99, 132, 1)', borderWidth: 1, tension: 0.4 }]
                    }, options: { scales: { y: { beginAtZero: false } } }
                });

                const pressureChartCtx = document.getElementById(`pressureChart${columnId}`).getContext('2d');
                columnData[columnId].pressureChartInstance = new Chart(pressureChartCtx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{ label: 'Тиск (hPa)', data: pressures, backgroundColor: 'rgba(54, 162, 235, 0.2)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1 }]
                    }, options: { scales: { y: { beginAtZero: false } } }
                });
            }
        })
        .catch(error => console.error('Помилка при отриманні прогнозу:', error));
}

function displayWeather(data, columnId) {
    const temperature = data.main.temp;
    const description = data.weather[0].description;
    const windSpeed = data.wind.speed;
    const windDeg = data.wind.deg;

    document.getElementById(`weather-info-${columnId}`).innerHTML = `
        <h3>Поточні дані в ${data.name}</h3>
        <p>Температура: ${temperature}°C</p>
        <p>Опис: ${description}</p>
    `;

    document.getElementById(`wind-info-${columnId}`).innerHTML = `
        <p>
            Швидкість вітру: ${windSpeed} м/с
            <span style="display: inline-block; transform: rotate(${windDeg}deg);">↑</span>
        </p>
    `;
}

function getAstroData(lat, lon, columnId) {
    const today = new Date();
    const times = SunCalc.getTimes(today, lat, lon);
    const moonIllumination = SunCalc.getMoonIllumination(today);
    const sunrise = times.sunrise.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const sunset = times.sunset.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const moonPhase = moonIllumination.phase;
    const moonIlluminationPercent = Math.round(moonPhase * 100);

    let moonAdvice = "";
    if (moonPhase > 0.45 && moonPhase < 0.55) {
        moonAdvice = "Повний Місяць. Активний кльов. 🌕";
    } else if (moonPhase < 0.05 || moonPhase > 0.95) {
        moonAdvice = "Новий Місяць. Сприятливий час для риболовлі. 🌑";
    } else {
        moonAdvice = "Змінюється фаза. Кльов може бути менш передбачуваним.";
    }

    document.getElementById(`astro-info-${columnId}`).innerHTML = `
        <h3>Астрономічні дані</h3>
        <p>Схід сонця: ${sunrise}</p>
        <p>Захід сонця: ${sunset}</p>
        <p>Фаза Місяця: ${moonIlluminationPercent}% освітлення. ${moonAdvice}</p>
    `;
}

function calculateSuccessIndex(data, columnId) {
    let index = 0;
    const temp = data.main.temp;
    const windSpeed = data.wind.speed;
    const pressure = data.main.pressure;
    const moonPhase = SunCalc.getMoonIllumination(new Date()).phase;

    if (temp >= 10 && temp <= 25) { index += 3; } else if (temp > 5 && temp < 30) { index += 2; }
    if (windSpeed < 5) { index += 3; } else if (windSpeed >= 5 && windSpeed < 10) { index += 2; } else { index += 1; }
    if (pressure > 1013) { index += 2; } else { index += 1; }
    if (moonPhase > 0.45 && moonPhase < 0.55 || moonPhase < 0.05 || moonPhase > 0.95) { index += 2; } else { index += 1; }

    const finalIndex = Math.min(10, Math.max(1, Math.round(index * 1.25)));

    let indexMessage = "";
    if (finalIndex >= 8) { indexMessage = "Дуже високий шанс на успішну риболовлю! 🎉"; } else if (finalIndex >= 5) { indexMessage = "Умови хороші. Варто спробувати! 👍"; } else { indexMessage = "Умови не найкращі. Може пощастить. 🎣"; }

    document.getElementById(`success-index-${columnId}`).innerHTML = `
        <h3>Прогноз успіху</h3>
        <p><b>Індекс риболовлі:</b> ${finalIndex}/10. ${indexMessage}</p>
    `;
}

// Ініціалізуємо всі три колонки
initColumn(1, DEFAULT_CITIES[0]);
initColumn(2, DEFAULT_CITIES[1]);
initColumn(3, DEFAULT_CITIES[2]);
