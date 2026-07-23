import express from 'express';
import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const PORT = 8080;

const __dirname = dirname(fileURLToPath(import.meta.url));

// allowlist of files/dirs to serve
var allowlist = [
  'index.html', 'favicon.ico', 'browserWarning.html', 'mobileWarning.html',
  'package.json', 'yarn.lock',
  'audio/', 'css/', 'img/', 'lang/', 'lib/', 'script/', 'doc/', 'tools/', 'node_modules/'
];

var app = express();

app.use(function(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(function(req, res, next) {
  var path = req.path.replace(/^\/+/, '');
  if (!path || path === '') path = 'index.html';
  var allowed = allowlist.some(function(p) {
    if (p.endsWith('/')) return path === p.slice(0, -1) || path.startsWith(p);
    return path === p || path.startsWith(p + '/');
  });
  if (!allowed) {
    res.status(403).type('text').send('Forbidden');
    return;
  }
  next();
});

app.use(express.static(__dirname));

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
