import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { run7PillarsTestSuite } from '../src/tests/gameTestSuite';

async function main() {
  console.log('====================================================');
  console.log('🚀 EXECUTING 7 PILLARS OF SOFTWARE TESTING FOR TANK STARS 3D');
  console.log('====================================================');

  const report = run7PillarsTestSuite();

  console.log(`\n📊 TEST REPORT SUMMARY (${report.timestamp}):`);
  console.log(`Total Tests Run: ${report.totalTests}`);
  console.log(`Passed: ${report.passedTests} ✅`);
  console.log(`Failed: ${report.failedTests} ❌`);
  console.log('\n--- Results by Pillar ---');

  for (const [pillar, stats] of Object.entries(report.pillarsSummary)) {
    const icon = stats.passed === stats.total ? '✅' : '❌';
    console.log(`${icon} ${pillar}: ${stats.passed}/${stats.total} PASSED`);
  }

  console.log('\n--- Detailed Test Cases ---');
  report.results.forEach((r, idx) => {
    const status = r.passed ? 'PASS' : 'FAIL';
    console.log(`${idx + 1}. [${status}] (${r.durationMs}ms) ${r.pillar} -> ${r.name}`);
  });

  if (report.failedTests > 0) {
    console.error('\n❌ Testing failed with errors.');
    process.exit(1);
  }

  console.log('\n====================================================');
  console.log('📦 PACKAGING ALL PROJECT FILES INTO A STRUCTURED ZIP');
  console.log('====================================================');

  const zip = new JSZip();
  const rootDir = process.cwd();

  const ignoreDirs = new Set(['node_modules', '.git', 'dist', '.system_generated', 'assets']);
  const ignoreFiles = new Set(['tankstars-game-source.zip']);

  function addFolderToZip(currentDir: string, zipFolder: JSZip) {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      if (ignoreDirs.has(item) || ignoreFiles.has(item)) continue;
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        const nextZipFolder = zipFolder.folder(item);
        if (nextZipFolder) {
          addFolderToZip(fullPath, nextZipFolder);
        }
      } else {
        const fileData = fs.readFileSync(fullPath);
        zipFolder.file(item, fileData);
      }
    }
  }

  addFolderToZip(rootDir, zip);

  // Generate ZIP file buffer
  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  // Ensure public directory exists
  const publicDir = path.join(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Save to public and root
  const publicZipPath = path.join(publicDir, 'tankstars-game-source.zip');
  const rootZipPath = path.join(rootDir, 'tankstars-game-source.zip');

  fs.writeFileSync(publicZipPath, content);
  fs.writeFileSync(rootZipPath, content);

  console.log(`\n🎉 ZIP package generated successfully!`);
  console.log(`📁 File Location 1: ${publicZipPath} (${Math.round(content.length / 1024)} KB)`);
  console.log(`📁 File Location 2: ${rootZipPath} (${Math.round(content.length / 1024)} KB)`);
  console.log('\nAll project files are properly stored and verified.');
}

main().catch((err) => {
  console.error('Fatal error during test and zip:', err);
  process.exit(1);
});
