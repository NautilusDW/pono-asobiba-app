// Read questions.js and count by category/level
const fs = require('fs');
const path = require('path');

// Import the data
const questionsFile = 'd:\AppDevelopment\pono-asobiba-app\quizland\data\questions.js';
let content = fs.readFileSync(questionsFile, 'utf-8');

// Execute the code to get the objects
eval(content);

// Count by category and level
const results = {};

for (const [category, questions] of Object.entries(QUIZLAND_QUESTIONS)) {
  results[category] = { Lv1: 0, Lv2: 0, Lv3: 0, total: 0 };
  
  for (const q of questions) {
    const level = `Lv${q.level}`;
    results[category][level]++;
    results[category].total++;
  }
}

// Print results
console.log('\n===== QUIZLAND QUESTIONS COUNT =====\n');
let grandTotal = 0;

for (const [cat, counts] of Object.entries(results)) {
  console.log(`${cat}: Lv1=${counts.Lv1}, Lv2=${counts.Lv2}, Lv3=${counts.Lv3}, Total=${counts.total}`);
  grandTotal += counts.total;
}

console.log(`\nGrand Total: ${grandTotal}`);
