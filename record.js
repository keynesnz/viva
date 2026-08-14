const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');

(async () => {
  const browser = await puppeteer.launch({
    // THIS IS THE MAGIC FIX: It forces Chrome to render at normal speed
    headless: 'shell', 
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-gpu',
      '--disable-dev-shm-usage' // Prevents memory crashes on GitHub Actions
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const filePath = 'file://' + __dirname + '/index.html';
  await page.goto(filePath, { waitUntil: 'networkidle0' }); 

  const framesDir = './frames';
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir);

  const fps = 30;
  const durationSeconds = 5; 
  const totalFrames = fps * durationSeconds;
  const frameDurationMs = 1000 / fps;

  console.log(`Capturing ${totalFrames} frames...`);

  const startTime = Date.now();

  for (let i = 0; i < totalFrames; i++) {
    const frameNum = String(i + 1).padStart(4, '0');
    
    await page.screenshot({ path: `${framesDir}/frame_${frameNum}.png` });

    const totalTimePassed = Date.now() - startTime;
    const nextFrameTargetMs = (i + 1) * frameDurationMs;
    const timeToWait = Math.max(0, nextFrameTargetMs - totalTimePassed);
    
    if (timeToWait > 0) {
      await new Promise(r => setTimeout(r, timeToWait));
    }
  }

  await browser.close();
  console.log('Frames captured. Encoding MP4...');

  execSync(
    `ffmpeg -y -framerate ${fps} -i ${framesDir}/frame_%04d.png -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" output.mp4`
  );

  console.log('Perfect 1x speed output.mp4 created!');
})();
