const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/**/*.jsx');
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('right-panel') || content.includes('Right Panel')) {
    const rightPanelMatch = content.match(/className=[\"'][^\"]*right-panel[\"'][^>]*style=\{\{([^}]+)\}\}/);
    if (rightPanelMatch) {
      console.log(f, rightPanelMatch[1].includes('justifyContent: \\'center\\'') || rightPanelMatch[1].includes('justifyContent: \"center\"') ? 'OK' : 'MISSING');
    }
  }
});
