import { useEffect, useCallback } from 'react';
import axios from 'axios';
import useEcoStore from '../store/useEcoStore';

const API_KEY = '4d8fb5b93d4af21d66a2948710284366'; // Free tier demo key
const MOCK_DATA = { temp: 28, clouds: 40, wind_speed: 5, city: 'Demo City', description: 'partly cloudy', humidity: 65 };

export function useWeather() {
  const setWeatherData = useEcoStore((s) => s.setWeatherData);
  const pincode = useEcoStore((s) => s.pincode);
  const weatherData = useEcoStore((s) => s.weatherData);

  const fetchWeather = useCallback(async (query) => {
    try {
      const res = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${API_KEY}&units=metric`
      );
      const data = {
        temp: Math.round(res.data.main.temp),
        clouds: res.data.clouds.all,
        wind_speed: res.data.wind.speed,
        city: res.data.name,
        description: res.data.weather[0]?.description || 'clear',
        humidity: res.data.main.humidity,
      };
      console.log('[Weather] Loaded:', data);
      setWeatherData(data);
    } catch (err) {
      console.log('[Weather] API failed, using mock data:', err.message);
      setWeatherData(MOCK_DATA);
    }
  }, [setWeatherData]);

  useEffect(() => {
    fetchWeather(pincode);
  }, []);

  return { fetchWeather, weatherData };
}

export default useWeather;
