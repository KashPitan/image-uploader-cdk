import * as fs from 'fs';
import { exec, execSync } from 'child_process';

try {
  console.log('---- PACKAGING STARTED -----');

  // clean out dist folder
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true });
    console.log('removed dist folder');
  }

  // clean out cdk.out folder
  if (fs.existsSync('cdk.out')) {
    fs.rmSync('cdk.out', { recursive: true });
    console.log('removed cdk.out folder');
  }

  // create dist folder
  fs.mkdirSync('dist');
  console.log('\x1b[32m', 'created dist folder');

  // build command should be set to typescript compile command "tsc"
  execSync('tsc');
  console.log('\x1b[32m', 'compiled typescript into dist folder');

  if (fs.existsSync('package.json')) {
    fs.copyFileSync('package.json', 'dist/package.json');
    console.log('\x1b[32m', 'copied package.json to dist');
  } else {
    console.log('\x1b[31m', 'You need a package.json file');
    process.exit(1);
  }

  if (fs.existsSync('package-lock.json')) {
    fs.copyFileSync('package-lock.json', 'dist/package-lock.json');
    console.log('\x1b[32m', 'copied package-lock.json to dist');
  } else {
    console.log('\x1b[31m', 'You need a package-lock.json file');
    process.exit(1);
  }

  exec('cd dist && npm install --only=production');
  console.log('\x1b[32m', 'installed production dependencies into dist');

  console.log('\x1b[0m', '---- PACKAGING FINISHED -----');
} catch (error) {
  console.log(error);
}
