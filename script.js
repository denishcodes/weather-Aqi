let userName = "";
let userGender = "male";

window.setUserGreeting = function () {
  const nameInput = document.getElementById("userName").value.trim();
  const genderInput = document.getElementById("userGender").value;

  if (!nameInput) {
    alert("Please enter your name.");
    return;
  }

  userName = nameInput;
  userGender = genderInput;

  const title = userGender === "female" ? "Mrs." : "Mr.";
  const greetText = `Hi ${title} ${userName}, Nice to meet you 😊`;

  document.getElementById("greetTitle").textContent = greetText;
  document.getElementById("userSetup").style.display = "none";
  document.getElementById("greetingSection").style.display = "block";
};

import API_KEY from './config.js';

const greetingReply = document.getElementById("greetingReply");
const errorElem = document.getElementById("error");
const weatherElem = document.getElementById("weather");
const aqiElem = document.getElementById("aqi");
const adviceElem = document.getElementById("healthAdvice");
const forecastElem = document.getElementById("forecast");
const coordsElem = document.getElementById("coords");
const timestampElem = document.getElementById("timestamp");
const languageSelect = document.getElementById("languageSelect");

let aqiChart, tempChart;
let refreshInterval;

document.getElementById("darkModeToggle").addEventListener("change", () => {
  document.body.classList.toggle("light");
});

window.sendGreeting = function () {
  const message = document.getElementById("greetingInput").value;
  if (message.trim()) {
    greetingReply.textContent = translate("Thank you for your response 😊");
  }
};

window.fetchData = function () {
  const location = document.getElementById("locationInput").value;
  const unit = document.querySelector('input[name="unit"]:checked').value;
  if (!location) return;
  getWeatherAQI(location, unit);
};

window.useMyLocation = function () {
  const unit = document.querySelector('input[name="unit"]:checked').value;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        getWeatherAQI(null, unit, position.coords.latitude, position.coords.longitude);
      },
      () => {
        errorElem.textContent = translate("Location access denied");
      }
    );
  } else {
    errorElem.textContent = translate("Geolocation not supported");
  }
};

function setAutoRefresh(city, unit, lat, lon) {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    getWeatherAQI(city, unit, lat, lon);
  }, 900000); // 15 minutes
}

async function getWeatherAQI(city, unit, lat = null, lon = null) {
  try {
    errorElem.textContent = "";
    weatherElem.textContent = "";
    aqiElem.textContent = "";
    adviceElem.textContent = "";
    forecastElem.innerHTML = "";
    coordsElem.textContent = "";
    timestampElem.textContent = "";

    let coords, cityName;

    if (city) {
      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${unit}&appid=${API_KEY}`
      );
      if (!weatherRes.ok) throw new Error("Invalid location");
      const weatherData = await weatherRes.json();
      coords = weatherData.coord;
      cityName = weatherData.name;
      displayWeather(weatherData, cityName);
    } else {
      coords = { lat, lon };
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${unit}&appid=${API_KEY}`
      );
      const data = await res.json();
      cityName = data.name;
      displayWeather(data, cityName);
    }

    setAutoRefresh(city, unit, coords.lat, coords.lon);

    coordsElem.textContent = `📍 Coordinates: ${coords.lat.toFixed(2)}, ${coords.lon.toFixed(2)}`;

    const aqiRes = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${coords.lat}&lon=${coords.lon}&appid=${API_KEY}`
    );
    const aqiData = await aqiRes.json();

    const aqi = aqiData.list[0].main.aqi;
    const quality = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];

    aqiElem.textContent = translate("Air Quality Index") + `: ${aqi} (${translate(quality[aqi - 1])})`;

    if (aqi >= 3) {
      adviceElem.textContent = translate(
        "If the AQI is bad, stay indoors. If you must go outside, wear a mask and glasses to protect yourself from pollution."
      );
    }

    drawAQIChart(aqi);

    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&units=${unit}&appid=${API_KEY}`
    );
    const forecastData = await forecastRes.json();

    const forecastList = forecastData.list.slice(0, 5);
    const tempLabels = forecastList.map((item) => item.dt_txt.split(" ")[1].slice(0, 5));
    const tempValues = forecastList.map((item) => item.main.temp);

    drawTempChart(tempLabels, tempValues);

    const next7Days = {};
    forecastData.list.forEach((item) => {
      const date = item.dt_txt.split(" ")[0];
      if (!next7Days[date]) {
        next7Days[date] = item.weather[0].description;
      }
    });

    forecastElem.innerHTML = "<strong>" + translate("7-Day Forecast (Rain Check):") + "</strong>";
    Object.entries(next7Days)
      .slice(0, 7)
      .forEach(([day, desc]) => {
        const rainEmoji = desc.includes("rain") ? "🌧️" : "☀️";
        forecastElem.innerHTML += `<li>${day}: ${translate(desc)} ${rainEmoji}</li>`;
      });
  } catch (err) {
    errorElem.textContent = translate("Invalid location") + `: "${city}"`;
  }
}

function displayWeather(data, city) {
  const temp = data.main.temp;
  const desc = data.weather[0].description;
  const time = new Date(data.dt * 1000).toLocaleString();

  weatherElem.textContent = `${translate("Current Temp in")} ${city}: ${temp}°, ${translate(desc)}`;
  timestampElem.textContent = `🕒 Data Time: ${time}`;
}

function drawAQIChart(aqi) {
  const ctx = document.getElementById("aqiChart").getContext("2d");

  if (aqiChart) aqiChart.destroy();

  aqiChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["AQI"],
      datasets: [
        {
          label: "Air Quality Index",
          data: [aqi],
          backgroundColor: ["rgba(255, 99, 132, 0.6)"],
          borderColor: ["rgba(255, 99, 132, 1)"],
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 5,
        },
      },
    },
  });
}

function drawTempChart(labels, values) {
  const ctx = document.getElementById("tempChart").getContext("2d");

  if (tempChart) tempChart.destroy();

  tempChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Temperature",
          data: values,
          fill: true,
          backgroundColor: "rgba(54, 162, 235, 0.3)",
          borderColor: "rgba(54, 162, 235, 1)",
          tension: 0.3,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: false,
        },
      },
    },
  });
}

const translations = {
  np: {
    "How are your summer days going?": "तपाईंका गर्मी दिनहरू कस्ता छन्?",
    "Thank you for your response 😊": "जवाफको लागि धन्यवाद 😊",
    "Current Temp in": "हालको तापक्रम",
    "Air Quality Index": "हावाको गुणस्तर सूचकांक",
    Good: "राम्रो",
    Fair: "सन्तोषजनक",
    Moderate: "मध्यम",
    Poor: "न्यून",
    "Very Poor": "धेरै न्यून",
    "If the AQI is bad, stay indoors. If you must go outside, wear a mask and glasses to protect yourself from pollution.":
      "यदि AQI खराब छ भने घरमै बस्नुहोस्। बाहिर जानुपरेमा मास्क र चश्मा लगाउनुहोस्।",
    "Invalid location": "अमान्य स्थान",
    "Location access denied": "स्थान पहुँच अस्वीकृत",
    "Geolocation not supported": "जियोलोकेशन समर्थन छैन",
    "7-Day Forecast (Rain Check):": "७-दिने मौसम पूर्वानुमान (वर्षाको जानकारी):",
  },
};

function translate(text) {
  const lang = languageSelect.value;
  return translations[lang]?.[text] || text;
}

window.changeLanguage = function () {
  document.getElementById("greetSub").textContent = translate("How are your summer days going?");
};
