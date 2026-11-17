// 仅校验此切片的语法、配置和静态约定；不是微信编译器。
const assert = require('node:assert/strict');
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { execFileSync } = require('node:child_process');

const root = resolve(__dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const checks = [];
function check(name, run) {
  run();
  checks.push(name);
  console.log(`PASS ${name}`);
}

const config = json('project.config.json');
check('项目入口与类型', () => {
  assert.equal(config.compileType, 'miniprogram');
  assert.equal(config.miniprogramRoot, 'miniprogram/');
  assert.equal(config.appid, undefined, '不写入虚构 AppID');
});

const app = json('miniprogram/app.json');
check('唯一原生页面和四件套', () => {
  assert.deepEqual(app.pages, ['pages/title/index']);
  assert.equal(app.window.navigationBarTitleText, '报数');
  for (const page of app.pages) {
    for (const ext of ['js', 'json', 'wxml', 'wxss']) read(`miniprogram/${page}.${ext}`);
    json(`miniprogram/${page}.json`);
  }
});

function files(directory) {
  return readdirSync(resolve(root, directory)).flatMap((name) => {
    const path = join(directory, name);
    return statSync(resolve(root, path)).isDirectory() ? files(path) : [path];
  });
}

const sources = files('miniprogram');
check('产品脚本、测试和校验脚本语法', () => {
  const scripts = [...sources, ...files('tests'), ...files('scripts')];
  for (const path of scripts.filter((path) => /\.(?:c?js)$/.test(path))) {
    execFileSync(process.execPath, ['--check', resolve(root, path)], { stdio: 'pipe' });
  }
});

const wxml = read('miniprogram/pages/title/index.wxml');
check('原文输入、独立空态和普通文本预览约定', () => {
  for (const fragment of [
    'for="activity-title"', 'id="activity-title"', 'value="{{title}}"',
    'maxlength="-1"', 'bindinput="onTitleInput"', 'bindtap="onLabelTap"',
    'focus="{{focused}}"', 'bindfocus="onTitleFocus"', 'bindblur="onTitleBlur"',
    'wx:if="{{title === \'\'}}"', '尚未输入活动标题。',
    '<text wx:else class="preview-title">{{title}}</text>',
    '仅当前页面预览，不会保存。',
  ]) assert.ok(wxml.includes(fragment), `缺少约定：${fragment}`);
  assert.doesNotMatch(wxml, /<(?:rich-text|button)\b|\sstyle\s*=/i);
});

check('原文预览换行和非固定高度约定', () => {
  const style = read('miniprogram/pages/title/index.wxss');
  assert.match(style, /white-space:\s*pre-wrap/);
  assert.match(style, /overflow-wrap:\s*anywhere/);
  assert.match(style, /min-height:\s*var\(--preview-min-height\)/);
});

check('当前产品入口不包含存储、网络或云能力调用', () => {
  for (const path of sources.filter((path) => path.endsWith('.js'))) {
    assert.doesNotMatch(read(path), /\b(?:wx|cloud)\s*\.|\b(?:fetch|require|import)\b/);
  }
  assert.equal(app.permission, undefined);
  assert.equal(app.plugins, undefined);
  assert.deepEqual(json('package.json').dependencies || {}, {});
  assert.deepEqual(json('package.json').devDependencies || {}, {});
});

console.log(`${checks.length} 项静态检查通过；未执行微信编译、渲染或真机验证。`);
