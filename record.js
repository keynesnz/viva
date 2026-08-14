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
  const durationSeconds = 5; // Change this for longer/shorter videos
  const totalFrames = fps * durationSeconds;
  const frameDurationMs = 1000 / fps;

  console.log(`Capturing ${totalFrames} frames at real-time speed...`);

  // Use Node.js's real-world clock, NOT the browser's clock
  const globalStartTime = Date.now();

  for (let i = 0; i < totalFrames; i++) {
    const frameNum = String(i + 1).padStart(4, '0');
    
    // 1. Take the screenshot
    await page.screenshot({ path: `${framesDir}/frame_${frameNum}.png` });

    // 2. Check how much real-world time has passed since we started THIS specific frame
    const frameTimeTaken = Date.now() - globalStartTime;
    
    // 3. Calculate when the NEXT frame should happen in real-world time
    const nextFrameTargetMs = (i + 1) * frameDurationMs;
    
    // 4. If we finished taking the screenshot early, wait the exact remaining time.
    // If we took too long (server lag), wait 0ms so we don't pause and cause more lag.
    const timeToWait = Math.max(0, nextFrameTargetMs - frameTimeTaken);
    
    if (timeToWait > 0) {
      await new Promise(r => setTimeout(r, timeToWait));
    }
    
    // Reset the timer for the next loop iteration
    globalStartTime.setTime(Date.now());
  }

  await browser.close();
  console.log('Frames captured successfully. Encoding MP4...');

  // High-quality FFmpeg encoding
  execSync(
    `ffmpeg -y -framerate ${fps} -i ${framesDir}/frame_%04d.png -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" output.mp4`
  );

  console.log('High-quality output.mp4 created at perfect speed!');
})();
