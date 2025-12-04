const fs = require('fs');
const path = require('path');

const apiGuidePath = path.join(__dirname, 'src/api/endpoints/apiGuide.js');
const newSectionPath = path.join(__dirname, 'db-migration-section.html');

// Read both files
let apiGuideContent = fs.readFileSync(apiGuidePath, 'utf8');
const newSection = fs.readFileSync(newSectionPath, 'utf8');

// Find line 788-789 and insert before </section>
const lines = apiGuideContent.split('\n');

// Find the line with "symbolCache.json은 삭제하지 마세요" note closing tag
let insertIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('symbolCache.json은 삭제하지 마세요') && i + 2 < lines.length && lines[i + 2].trim() === '</div>') {
    insertIndex = i + 3; // Insert after </div>
    break;
  }
}

if (insertIndex === -1) {
  console.error('ERROR: Could not find insertion point');
  process.exit(1);
}

// Insert the new section
const newSectionLines = newSection.split('\n');
lines.splice(insertIndex, 0, ...newSectionLines);

// Join back
const updatedContent = lines.join('\n');

// Write the updated content
fs.writeFileSync(apiGuidePath, updatedContent, 'utf8');

console.log('Successfully inserted Database Migration section in apiGuide.js');
console.log('Inserted at line:', insertIndex);
console.log('New section lines:', newSectionLines.length);
