const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, 'public');

const messages = ["Server booted up successfully"];

let visitorCount = 0;

const adviceList = [
    "Look both ways when crossing a street.",
    "Always wear a seatbelt.",
    "Be kind to others.",
    "Collect 1st Edition Pokemon cards.",
    "Don't forget to water your plants.",
    "Take breaks when working long hours.",
];
const catFacts = [
    "Cats sleep up to 20 hours a day.",
    "A cat's purr can help reduce stress and lower blood pressure.",
    "Cats have a third eyelid called a nictitating membrane.",
    "A group of cats is called a clowder.",
    "Cats can rotate their ears 180 degrees."
];
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.json': 'application/json',
    '.ico': 'image/x-icon'
};
http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const reqPath = parsedUrl.pathname;

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const logLine =
        `[${new Date().toISOString()}] IP: ${clientIp} | Method: ${req.method} | Path: ${reqPath}\n`;

    fs.appendFile(path.join(__dirname, 'server.log'), logLine, (err) => {
        if (err) console.error('Log write failed:', err);
    });

    const DATA_FILE = path.join(__dirname, 'messages.json');

    function getSavedMessages() {
        if (!fs.existsSync(DATA_FILE)) return ["Server booted up."];
        return JSON.parse(fs.readFileSync(DATA_FILE));
    }

    const newMsg = parsedUrl.searchParams.get('msg');
    if (newMsg) {
        const messages = getSavedMessages();
        messages.push(newMsg);
        fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
        res.writeHead(302, { 'Location': '/shoutbox' });
        return res.end();
    }
    if (reqPath === '/roll') {
        console.log("/roll route accessed");
        let roll = Math.floor(Math.random() * 6) + 1;
        console.log(`Roll: ${roll}`);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(`<h1>Roll: ${roll}</h1>`);
    }
    if (reqPath === '/api/stats') {
        const stats = {
            visitorCount: visitorCount,
            uptimeSeconds: process.uptime(),
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(stats));
    }
    let normalizedPath = reqPath === '/' ? '/index.html' : reqPath;
    if (!path.extname(normalizedPath)) {
        normalizedPath += '.html';
    }
    const filePath = path.join(PUBLIC_DIR, normalizedPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mime.lookup(filePath) || 'text/plain';
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            return res.end('<h1>404: Page Not Found</h1>');
        }
        let finalContent = content;
        if (ext === '.html') {
            let randomAdvice = adviceList[Math.floor(Math.random() * adviceList.length)];
            console.log(randomAdvice);
            let randomCatFact = catFacts[Math.floor(Math.random() * catFacts.length)];
            console.log(randomCatFact);
            if (normalizedPath === '/index.html') {
                visitorCount++;
                console.log(`[VISIT #${visitorCount}] Connection from: ${req.socket.remoteAddress}`);
            }
            const theme = parsedUrl.searchParams.get('theme') === 'dark' ? 'dark-mode' : 'light-mode';
            const messageListHTML = messages.map(msg => `<li>${msg}</li>`).join('');
            finalContent = content.toString()
                .replace('{{COUNT}}', String(visitorCount))
                .replace('{{THEME_CLASS}}', theme)
                .replace('{{FACT}}', randomAdvice)
                .replace('{{CAT_FACT}}', randomCatFact)
                .replace('{{MESSAGES}}', messageListHTML);
        }
        console.log(`[REQUEST] ${req.socket.remoteAddress} accessed ${normalizedPath}`);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(finalContent);
    });
}).listen(PORT, () => console.log(`Server listening on port ${PORT}`));