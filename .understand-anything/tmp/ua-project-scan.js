const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.argv[2];
const outputPath = process.argv[3];

if (!projectRoot || !outputPath) {
    console.error("Missing arguments");
    process.exit(1);
}

try {
    const rawFiles = execSync('dir /s /b /a-d', { cwd: projectRoot, encoding: 'utf-8' }).split('\r\n').filter(Boolean);
    const files = [];
    const importMap = {};
    const languages = new Set();
    const frameworks = new Set();
    
    let readmeHead = "";
    let rawDescription = "";
    let name = path.basename(projectRoot);

    for (const file of rawFiles) {
        if (file.includes('node_modules\\') || file.includes('.git\\') || file.includes('dist\\') || file.includes('build\\') || file.includes('.tmp\\')) continue;
        if (file.endsWith('.lock') || file.endsWith('package-lock.json')) continue;
        if (file.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp3|mp4|pdf|zip|tar|gz)$/i)) continue;
        
        let relativePath = path.relative(projectRoot, file).replace(/\\/g, '/');
        
        let fileCategory = 'code';
        let lang = '';
        
        const ext = path.extname(file).toLowerCase();
        if (['.ts', '.tsx'].includes(ext)) { lang = 'typescript'; }
        else if (['.js', '.jsx'].includes(ext)) { lang = 'javascript'; }
        else if (['.html', '.htm'].includes(ext)) { lang = 'html'; fileCategory = 'markup'; }
        else if (['.css'].includes(ext)) { lang = 'css'; fileCategory = 'markup'; }
        else if (['.json'].includes(ext)) { lang = 'json'; fileCategory = 'config'; }
        else if (['.md'].includes(ext)) { lang = 'markdown'; fileCategory = 'docs'; }
        else if (relativePath === 'Dockerfile') { lang = 'dockerfile'; fileCategory = 'infra'; }
        else continue; // generic skip for others
        
        if (lang) languages.add(lang);
        
        let sizeLines = 0;
        let content = '';
        try {
            content = fs.readFileSync(file, 'utf-8');
            sizeLines = content.split('\n').length;
        } catch(e) {}
        
        if (relativePath === 'package.json') {
           try {
               const pkg = JSON.parse(content);
               if (pkg.name) name = pkg.name;
               if (pkg.description) rawDescription = pkg.description;
               const deps = {...(pkg.dependencies||{}), ...(pkg.devDependencies||{})};
               if (deps['react']) frameworks.add('React');
               if (deps['vue']) frameworks.add('Vue');
               if (deps['vite']) frameworks.add('Vite');
           } catch(e) {}
        }
        
        if (relativePath.toLowerCase() === 'readme.md') {
            readmeHead = content.split('\n').slice(0, 10).join('\n');
        }
        
        files.push({
            path: relativePath,
            language: lang,
            sizeLines,
            fileCategory
        });
        
        importMap[relativePath] = [];
    }
    
    let estimatedComplexity = 'small';
    if (files.length > 30) estimatedComplexity = 'moderate';
    if (files.length > 150) estimatedComplexity = 'large';
    if (files.length > 500) estimatedComplexity = 'very-large';

    const result = {
        scriptCompleted: true,
        name,
        rawDescription,
        readmeHead,
        languages: Array.from(languages).sort(),
        frameworks: Array.from(frameworks).sort(),
        files: files.sort((a,b) => a.path.localeCompare(b.path)),
        totalFiles: files.length,
        estimatedComplexity,
        importMap
    };
    
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    process.exit(0);

} catch (err) {
    console.error(err);
    process.exit(1);
}
