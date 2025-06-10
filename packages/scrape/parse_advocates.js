// Node.js script to parse advocate information from HTML content
const fs = require('fs');
const path = require('path');

// Read the fetched HTML content (saved from the previous step)
const content = fs.readFileSync(path.join(__dirname, 'advocates_page.txt'), 'utf-8');

// Extract advocate information using regex pattern matching
const pattern = /\[([^\]]+)\]\([^)]+\)\[([^\]]+)\]\([^)]+\)(?:\[@([^)]+)\]\([^)]+\))?\n([^[]*)/g;
let match;
const advocates = [];
const matches = [];

// Collect all matches first
while ((match = pattern.exec(content)) !== null) {
  matches.push(match);
}

// Process matches
for (const match of matches) {
  const name = match[1];
  
  // Skip duplicated names (the page has each name twice)
  if (advocates.some(adv => adv.name === name)) {
    continue;
  }
  
  const twitterHandle = match[3] || null;
  
  // Clean up and extract specialties
  let specialtiesText = match[4] ? match[4].trim() : "";
  
  // Remove any country/location info
  specialtiesText = specialtiesText.replace(/^\s*[A-Za-z]+\s*\n+/, '');
  
  // Split specialties by '/' or '|' and clean up
  let specialties = [];
  if (specialtiesText) {
    if (specialtiesText.includes('/')) {
      specialties = specialtiesText.split('/').map(s => s.trim());
    } else if (specialtiesText.includes('|')) {
      specialties = specialtiesText.split('|').map(s => s.trim());
    } else {
      specialties = [specialtiesText.trim()];
    }
  }
  
  // Create advocate object
  const advocate = {
    name,
    profile_url: `https://developer.microsoft.com/en-us/advocates/${name.toLowerCase().replace(/ /g, "-")}`,
    twitter: twitterHandle,
    specialties,
    github: null // To be filled later
  };
  
  advocates.push(advocate);
}

// Write to JSON file
const outputPath = path.join(__dirname, '../../data/advocates.json');
fs.writeFileSync(outputPath, JSON.stringify(advocates, null, 2));

console.log(`Extracted ${advocates.length} advocates and saved to advocates.json`);
