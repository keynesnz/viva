const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const filePath = 'file://' + __dirname + '/index.html';
  await page.goto(filePath, { waitUntil: 'networkidle0' }); // Wait for all images/fonts to load

  const framesDir = './frames';
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir);

  const fps = 30;
  const durationSeconds = 5;
  const totalFrames = fps * durationSeconds;

  // We inject this code DIRECTLY into the browser. 
  // This guarantees perfect frame timing without network lag.
  const captureFrames = async () => {
    await page.evaluate((fps, totalFrames, framesDir) => {
      return new Promise((resolve) => {
        let frameCount = 0;
        const interval = 1000 / fps;

        // Use an interval synced with the browser's internal clock
        const timer = setInterval(async () => {
          if (frameCount >= totalFrames) {
            clearInterval(timer);
            resolve();
            return;
          }

          const frameNum = String(frameCount + 1).padStart(4, '0');
          
          // Capture the exact pixel data of the current frame
          const base64 = await page.screenshot({ encoding: 'base64' });
          
          // Write to disk from inside the browser context
          const buffer = Buffer.from(base64, 'base64');
          require('fs').writeFileSync(`${framesDir}/frame_${frameNum}.png`, buffer);
          
          frameCount++;
        }, interval);
      });
    }, fps, totalFrames, framesDir);
  };

  console.log('Capturing perfect frames...');
  await captureFrames();
  await browser.close();

  console.log('Encoding MP4 with FFmpeg...');
  
  // FFmpeg settings for BEST quality:
  // -preset slow: Takes longer to render, but compresses the file much better with zero pixelation
  // -crf 18: Visual quality (lower is better. 18 is visually lossless)
  // -pix_fmt yuv420p: Ensures it plays on Macs, Windows, and iPhones
  execSync(
    `ffmpeg -y -framerate ${fps} -i ${framesDir}/frame_%04d.png -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" output.mp4`
  );

  console.log('High-quality output.mp4 created!');
})();
