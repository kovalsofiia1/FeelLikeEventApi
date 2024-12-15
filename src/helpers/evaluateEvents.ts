import { MY_SCORES } from "../static/myScores";

const fs = require('fs');
const path = require('path');

let wordScores = { ...MY_SCORES };

// Оцінки для типів подій
const eventTypeScores = {
  "CONCERT": 2,
  "LECTURE": -1,
  "WEBINAR": -1,
  "WORKSHOP": -1,
  "SEMINAR": 0,
  "MEETUP": -1,
  "EXHIBITION": -1,
  "CONFERENCE": -1,
  "FESTIVAL": 2,
  "PARTY": 2,
  "GALA": 1,
  "SPORTS": 1,
  "CHARITY": -1,
};

/**
 * Функція для аналізу тексту та підрахунку оцінки
 * @param {string} text - Текст для аналізу
 * @param {object} wordScores - Об'єкт з оцінками слів
 * @returns {number} - Сума балів
 */
function analyzeText(text, wordScores) {
  if (!text) return 0;
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;

  words.forEach(word => {
    if (wordScores[word] !== undefined) {
      score += wordScores[word];
    }
  });

  return score;
}

/**
 * Функція для емоційної оцінки події
 * @param {object} event - Подія
 * @returns {string} - Категорія події ("Весела", "Сумна", "Нейтральна")
 */
export function evaluateEvent(event) {
  const { name, description, eventType, tags } = event;

  // Оцінка назви та опису
  let score = analyzeText(name, wordScores) + analyzeText(description, wordScores);

  // Оцінка типу події
  if (eventTypeScores[eventType]) {
    score += eventTypeScores[eventType];
  }

  // Оцінка тегів
  if (tags && Array.isArray(tags)) {
    tags.forEach(tag => {
      score += analyzeText(tag, wordScores);
    });
  }

  // // Визначення категорії
  // if (score > 4) return { score, type: "HAPPY" };
  // if (score < -1) return {
  //   score, type: "SAD"
  // };
  // return {
  //   score, type: "NEUTRAL"
  // };

  return score
}