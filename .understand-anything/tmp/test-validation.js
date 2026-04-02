const fs = require('fs');
const json = JSON.parse(fs.readFileSync('d:\\Sudoku_GameOnl\\.understand-anything\\knowledge-graph.json', 'utf-8'));
console.log(json.project);
const reqKeys = ["name", "languages", "frameworks", "description", "analyzedAt", "gitCommitHash"];
reqKeys.forEach(k => console.log(`${k}: ${typeof json.project[k]}`));
