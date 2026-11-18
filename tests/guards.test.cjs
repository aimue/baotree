// 在隔离副本中破坏真实源码；不修改工作树，也不模拟微信运行环境。
const assert = require('node:assert/strict');
const { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, unlinkSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const root = resolve(__dirname, '..');
const page = 'miniprogram/pages/title/index.js';
const template = 'miniprogram/pages/title/index.wxml';
function replace(directory, path, before, after) {
  const file = join(directory, path);
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  before = before.replace(/\r\n/g, '\n');
  assert.equal(source.split(before).length, 2, `变异锚点必须唯一：${before}`);
  writeFileSync(file, source.replace(before, after));
}
function fixture(run) {
  // Linux/macOS 使用 /var/tmp；Windows 使用系统临时目录。
  const parent = process.platform === 'win32' ? tmpdir() : '/var/tmp';
  const directory = mkdtempSync(join(parent, 'baotree-guards-'));
  try {
    for (const path of ['miniprogram', 'scripts', 'project.config.json', 'package.json']) {
      cpSync(join(root, path), join(directory, path), { recursive: true });
    }
    // 保持既有逻辑测试的相对路径，不把变异测试复制进副本，避免递归运行。
    cpSync(join(root, 'tests/title.test.cjs'), join(directory, 'tests/title.test.cjs'), { recursive: true });
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
function commands(directory) {
  return [
    ['静态检查', ['scripts/check-project.cjs']],
    ['既有逻辑测试', ['--test', 'tests/title.test.cjs']],
  ].map(([name, args]) => {
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT; // 子进程是独立测试运行器，必须使用自己的退出码。
    const result = spawnSync(process.execPath, args, { cwd: directory, env, encoding: 'utf8', timeout: 20000 });
    assert.ifError(result.error);
    assert.notEqual(result.signal, 'SIGTERM', `${name}超时不能算成功拦截`);
    return { name, status: result.status, output: result.stdout + result.stderr };
  });
}

for (const [name, change] of [
  ['原始源码', () => {}],
  ['输入属性换序和单引号', (dir) => replace(dir, template,
    '    value="{{title}}"\n    maxlength="-1"', "    maxlength='-1'\n    value='{{title}}'")],
]) {
  test(`防护正向对照：${name}`, () => fixture((dir) => {
    change(dir);
    for (const result of commands(dir)) assert.equal(result.status, 0, result.output);
  }));
}

const mutations = [
  ['注释掉整个输入控件', (dir) => {
    const source = readFileSync(join(dir, template), 'utf8');
    const input = source.match(/<input\b[\s\S]*?\/>/)[0];
    replace(dir, template, input, `<!-- ${input} -->`);
  }],
  ['错误输入绑定由注释伪装', (dir) => replace(dir, template,
    'bindinput="onTitleInput"', 'bindinput="missingHandler"\n    data-note="unchanged"')],
  ['原文值绑定损坏由注释伪装', (dir) => replace(dir, template,
    'value="{{title}}"', 'value="{{wrongTitle}}"')],
  ['预览被注释隐藏', (dir) => replace(dir, template,
    '<text wx:else class="preview-title">{{title}}</text>',
    '<!-- <text wx:else class="preview-title">{{title}}</text> -->')],
  ['标签聚焦绑定被注释伪装', (dir) => replace(dir, template,
    'bindtap="onLabelTap"', 'bindtap="missingHandler"')],
  ['应用入口文件缺失', (dir) => unlinkSync(join(dir, 'miniprogram/app.js'))],
  ['应用注册缺失', (dir) => writeFileSync(join(dir, 'miniprogram/app.js'), '// no registration\n')],
  ['应用重复注册', (dir) => writeFileSync(join(dir, 'miniprogram/app.js'), 'App({}); App({});\n')],
  ['页面路由缺失', (dir) => replace(dir, 'miniprogram/app.json', '["pages/title/index"]', '[]')],
  ['页面四件套缺失', (dir) => unlinkSync(join(dir, 'miniprogram/pages/title/index.json'))],
  ['输入处理函数损坏', (dir) => replace(dir, page,
    'this.setData({ title: event.detail.value });', 'this.setData({ title: event.detail.value.trim() });')],
  ['隐藏生命周期新增点号存储', (dir) => replace(dir, page, '  data: {',
    "  onHide() { wx.setStorageSync('title', this.data.title); },\n  data: {")],
  ['隐藏生命周期新增方括号存储', (dir) => replace(dir, page, '  data: {',
    "  onHide() { wx['setStorageSync']('title', this.data.title); },\n  data: {")],
  ['未测生命周期新增方括号网络', (dir) => replace(dir, page, '  data: {',
    "  onLoad() { wx['request']({ url: 'https://example.invalid' }); },\n  data: {")],
  ['应用入口通过别名新增存储', (dir) => writeFileSync(join(dir, 'miniprogram/app.js'),
    "const platform = wx; App({ onLaunch() { platform['setStorageSync']('title', 'x'); } });\n")],
  ['全局对象间接新增网络', (dir) => replace(dir, page, '  data: {',
    "  onHide() { globalThis['wx']['request']({ url: 'https://example.invalid' }); },\n  data: {")],
  ['新增脚本包含方括号云调用', (dir) => writeFileSync(join(dir, 'miniprogram/extra.js'),
    "function later() { cloud['callFunction']({ name: 'save' }); }\n")],
];

for (const [name, change] of mutations) {
  test(`拒绝回归：${name}`, () => fixture((dir) => {
    // 保留旧的片段匹配所需文字，证明检查的是生效元素而非注释。
    const original = readFileSync(join(dir, template), 'utf8');
    change(dir);
    if (['错误输入绑定由注释伪装', '原文值绑定损坏由注释伪装', '标签聚焦绑定被注释伪装'].includes(name)) {
      const file = join(dir, template);
      writeFileSync(file, `${readFileSync(file, 'utf8')}\n<!-- ${original} -->\n`);
    }
    const results = commands(dir);
    assert.ok(results.some((result) => result.status !== 0),
      `漏检：${name}；静态检查与既有 11 项逻辑测试均退出 0`);
  }));
}
