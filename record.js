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

  // Start the clock once at the very beginning
  const startTime = Date.now();

  for (let i = 0; i < totalFrames; i++) {
    const frameNum = String(i + 1).padStart(4, '0');
    
    // 1. Take the screenshot
    await page.screenshot({ path: `${framesDir}/frame_${frameNum}.png` });

    // 2. Check total real-world time passed since the VERY START
    const totalTimePassed = Date.now() - startTime;
    
    // 3. Calculate when the NEXT frame is supposed to happen
    const nextFrameTargetMs = (i + 1) * frameDurationMs;
    
    // 4. Wait for the exact remaining time
    const timeToWait = Math.max(0, nextFrameTargetMs - totalTimePassed);
    
    if (timeToWait > 0) {
      await new Promise(r => setTimeout(r, timeToWait));
    }
  }

  await browser.close();
  console.log('Frames captured successfully. Encoding MP4...');

  // High-quality FFmpeg encoding
  execSync(
    `ffmpeg -y -framerate ${fps} -i ${framesDir}/frame_%04d.png -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" output.mp4`
  );

  console.log('High-quality output.mp4 created at perfect speed!');
})();
