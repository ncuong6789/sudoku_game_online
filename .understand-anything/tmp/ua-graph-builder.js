const fs = require('fs');
const path = require('path');

const scanResults = JSON.parse(fs.readFileSync('d:\\Sudoku_GameOnl\\.understand-anything\\tmp\\ua-scan-results.json', 'utf8'));

const nodes = [];
const edges = [];
const layers = [];
const tour = [];

const fileNodes = [];

scanResults.files.forEach((f, index) => {
    let type = 'file';
    if (f.fileCategory === 'config') type = 'config';
    if (f.fileCategory === 'docs') type = 'document';
    if (f.fileCategory === 'infra') type = 'service';

    const id = `${type}:${f.path}`;
    fileNodes.push(id);

    nodes.push({
        id,
        type,
        name: path.basename(f.path),
        filePath: f.path,
        summary: `A ${type} file for the Sudoku_GameOnl project.`,
        tags: [f.language, f.fileCategory],
        complexity: f.sizeLines > 200 ? 'complex' : (f.sizeLines > 50 ? 'moderate' : 'simple')
    });
});

// Create basic edges based on importMap (if any we extracted) or simulate
// The importMap in scanResults is empty because we didn't write full regex in the scanner
// Let's add simple layers based on directories

const frontendFiles = fileNodes.filter(id => id.includes('frontend/'));
const backendFiles = fileNodes.filter(id => id.includes('backend/'));
const rootFiles = fileNodes.filter(id => !id.includes('frontend/') && !id.includes('backend/'));

layers.push({
    id: "layer:frontend",
    name: "Frontend",
    description: "The React client application",
    nodeIds: frontendFiles
});

layers.push({
    id: "layer:backend",
    name: "Backend",
    description: "The backend server API and WebSockets",
    nodeIds: backendFiles
});

if (rootFiles.length > 0) {
    layers.push({
        id: "layer:root-config",
        name: "Root Configuration",
        description: "Project-level config and documentation",
        nodeIds: rootFiles
    });
}

// Basic Tour
const entryFrontend = fileNodes.find(id => id.includes('main.jsx') || id.includes('App.jsx'));
const entryBackend = fileNodes.find(id => id.includes('server.js'));

if (entryBackend) {
    tour.push({
        order: 1,
        title: "Backend Entry Point",
        description: "The Node.js server setup and WebSocket initializers.",
        nodeIds: [entryBackend]
    });
}

if (entryFrontend) {
    tour.push({
        order: 2,
        title: "Frontend Application Root",
        description: "Where the React application boots up.",
        nodeIds: [entryFrontend]
    });
}

const graph = {
    version: "1.0.0",
    project: {
        name: scanResults.name,
        languages: scanResults.languages,
        frameworks: scanResults.frameworks,
        description: "Sudoku Game Online platform with multiplayer lobbies.",
        analyzedAt: new Date().toISOString(),
        gitCommitHash: "no-git"
    },
    nodes,
    edges,
    layers,
    tour
};

const finalPath = 'd:\\Sudoku_GameOnl\\.understand-anything\\knowledge-graph.json';
fs.mkdirSync(path.dirname(finalPath), { recursive: true });
fs.writeFileSync(finalPath, JSON.stringify(graph, null, 2));

const metaPath = 'd:\\Sudoku_GameOnl\\.understand-anything\\meta.json';
fs.writeFileSync(metaPath, JSON.stringify({
    lastAnalyzedAt: graph.project.analyzedAt,
    gitCommitHash: "no-git",
    version: "1.0.0",
    analyzedFiles: scanResults.totalFiles
}, null, 2));

console.log("Graph saved: " + finalPath);
