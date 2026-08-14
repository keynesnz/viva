const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');

(async () => {
  const browser = await puppeteer.launch({
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const filePath = 'file://' + __dirname + '/index.html';
  await page.goto(filePath, { waitUntil: 'networkidle0' }); 

  const framesDir = './frames';
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir);

  const fps = 30;
  const durationSeconds = 5; // Change this to make the video longer/shorter
  const totalFrames = fps * durationSeconds;

  console.log(`Capturing ${totalFrames} frames...`);

  // We ask the browser for its exact internal clock time
  const startTime = await page.evaluate(() => performance.now());
  const intervalMs = 1000 / fps;

  for (let i = 0; i < totalFrames; i++) {
    const frameNum = String(i + 1).padStart(4, '0');
    
    // Take the screenshot directly from Node.js (prevents timeout)
    await page.screenshot({ path: `${framesDir}/frame_${frameNum}.png` });

    // Calculate exactly how long to wait so the next screenshot happens 
    // perfectly on the next frame boundary (e.g., exactly 33.33ms later)
    const elapsed = await page.evaluate((start) => performance.now() - start, startTime);
    const targetTime = (i + 1) * intervalMs;
    const waitTime = Math.max(0, targetTime - elapsed);
    
    if (waitTime > 0) {
      await new Promise(r => setTimeout(r, waitTime));
    }
  }

  await browser.close();
  console.log('Frames captured successfully. Encoding MP4...');

  // FFmpeg command for highest quality
  execSync(
    `ffmpeg -y -framerate ${fps} -i ${framesDir}/frame_%04d.png -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" output.mp4`
  );

  console.log('High-quality output.mp4 created!');
})();
