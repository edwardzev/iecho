// build-optimized-json.js (Run this during your build process)
const fs = require('fs');

// 1. Load original JSON
const originalData = require('./installations.json');

// 2. Create indexes
const indexes = {
  cities: {},
  models: {} // Optional: add other indexes if needed
};

originalData.forEach((item, index) => {
  // City index
  if (!indexes.cities[item.city]) {
    indexes.cities[item.city] = [];
  }
  indexes.cities[item.city].push(index);
  
  // Model index (example)
  if (!indexes.models[item.model]) {
    indexes.models[item.model] = [];
  }
  indexes.models[item.model].push(index);
});

// 3. Save optimized JSON
const optimizedData = {
  data: originalData,
  indexes: indexes
};

fs.writeFileSync(
  './installations-optimized.json', 
  JSON.stringify(optimizedData)
);