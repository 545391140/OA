/**
 * 简单的日志监控脚本
 */
const { spawn } = require('child_process');

console.log('开始监控后端日志...');
console.log('请在另一个窗口进行 OCR 识别测试');
console.log('========================================\n');

// 监控进程输出
const serverPid = process.argv[2] || '32327';
console.log('监控进程 PID:', serverPid);

// 使用 tail 监控日志文件
const tail = spawn('tail', ['-f', 'server.log'], {
  cwd: __dirname
});

tail.stdout.on('data', (data) => {
  process.stdout.write(data);
});

tail.stderr.on('data', (data) => {
  process.stderr.write(data);
});

tail.on('close', (code) => {
  console.log(`日志监控结束，退出码: ${code}`);
});

process.on('SIGINT', () => {
  console.log('\n停止监控');
  tail.kill();
  process.exit(0);
});


