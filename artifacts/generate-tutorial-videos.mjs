import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const STUDIO = path.join(import.meta.dirname, 'jumptake-tutorial-video-studio.html');
const ARTIFACT_DIR = path.join(import.meta.dirname, 'tutorials');
const PUBLIC_DIR = path.join(ROOT, 'client', 'public', 'tutorials');
const IDS = [
  'tailor-resume',
  'react-work-news',
  'comment-work-news',
  'message-someone',
  'create-ai-post',
  'search-jumptake',
  'ai-notepad-reminder',
  'match-job-posts'
];

fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

const studioServer = http.createServer((request, response) => {
  if (request.url?.startsWith('/jumptake-logo-light.png')) {
    response.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
    response.end(fs.readFileSync(path.join(import.meta.dirname, 'jumptake-logo-light.png')));
    return;
  }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(fs.readFileSync(STUDIO));
});
await new Promise((resolve, reject) => {
  studioServer.once('error', reject);
  studioServer.listen(4199, '127.0.0.1', resolve);
});

const targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const target = targets.find((item) => item.type === 'page' && item.url === 'about:blank')
  || targets.find((item) => item.type === 'page' && item.url.startsWith('http://localhost:3000'))
  || targets.find((item) => item.type === 'page');
if (!target) throw new Error('No Chrome page is available on debugging port 9223.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextCommandId = 0;
const pendingCommands = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pendingCommands.has(message.id)) return;
  const handlers = pendingCommands.get(message.id);
  pendingCommands.delete(message.id);
  if (message.error) handlers.reject(new Error(message.error.message));
  else handlers.resolve(message.result);
});

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextCommandId;
  pendingCommands.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression, awaitPromise = false) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed.');
  return result.result.value;
};
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const waitFor = async (expression, timeout = 20000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      if (await evaluate(expression)) return;
    } catch {
      // Navigation briefly invalidates the previous page context.
    }
    await sleep(180);
  }
  throw new Error(`Timed out waiting for ${expression}`);
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1600,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
  screenWidth: 1600,
  screenHeight: 900
});

for (const tutorialId of IDS) {
  const studioUrl = new URL('http://127.0.0.1:4199/studio.html');
  studioUrl.searchParams.set('scenario', tutorialId);
  studioUrl.searchParams.set('record', '1');
  process.stdout.write(`Recording ${tutorialId}... `);
  await send('Page.navigate', { url: studioUrl.href });
  await waitFor("document.readyState === 'complete' && typeof window.renderTutorialFrame === 'function'");
  await waitFor("document.title.startsWith('RECORDING_DONE|') || document.title.startsWith('STUDIO_ERROR|')", 22000);

  const recordingTitle = await evaluate('document.title');
  if (recordingTitle.startsWith('STUDIO_ERROR|')) throw new Error(recordingTitle);
  const metadata = await evaluate("({ mime: window.__recordedVideoBlob?.type || '', size: window.__recordedVideoBlob?.size || 0 })");
  if (!metadata.mime.includes('mp4')) throw new Error(`Chrome produced ${metadata.mime || 'an unknown format'} instead of MP4.`);
  const base64Video = await evaluate(`(async () => {
    const bytes = new Uint8Array(await window.__recordedVideoBlob.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 32768) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    }
    return btoa(binary);
  })()`, true);
  const videoBuffer = Buffer.from(base64Video, 'base64');
  const posterData = await evaluate(`window.renderTutorialFrame(8.15, ${JSON.stringify(tutorialId)})`);
  const posterBuffer = Buffer.from(posterData.split(',')[1], 'base64');

  for (const destination of [ARTIFACT_DIR, PUBLIC_DIR]) {
    fs.writeFileSync(path.join(destination, `${tutorialId}.mp4`), videoBuffer);
    fs.writeFileSync(path.join(destination, `${tutorialId}.png`), posterBuffer);
  }
  console.log(`${(videoBuffer.length / 1048576).toFixed(2)} MB`);
}

fs.copyFileSync(path.join(ARTIFACT_DIR, 'tailor-resume.mp4'), path.join(import.meta.dirname, 'JumpTake-AI-Resume-Demo.mp4'));
fs.copyFileSync(path.join(ARTIFACT_DIR, 'tailor-resume.png'), path.join(import.meta.dirname, 'JumpTake-AI-Resume-Demo-preview.png'));
fs.copyFileSync(STUDIO, path.join(import.meta.dirname, 'resume-ai-action-demo-source.html'));
socket.close();
studioServer.closeAllConnections?.();
studioServer.close();
console.log(`Generated ${IDS.length} illustrated JumpTake tutorial videos and posters.`);
