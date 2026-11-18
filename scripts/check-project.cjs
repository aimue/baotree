// 仅校验此切片的语法、配置和静态约定；不是微信编译器。
const assert = require('node:assert/strict');
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { execFileSync } = require('node:child_process');
const { runInNewContext } = require('node:vm');

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

// 这里只识别当前原生切片的标签和带引号属性，不是 WXML 编译器。
const wxml = read('miniprogram/pages/title/index.wxml').replace(/<!--[\s\S]*?-->/g, '');
function elements(tag) {
  return [...wxml.matchAll(new RegExp(`<${tag}\\b([^>]*?)/?>`, 'g'))].map((match) => {
    const attributes = {};
    for (const [, name, , value] of match[1].matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)) {
      assert.equal(Object.hasOwn(attributes, name), false, `重复属性：${name}`);
      attributes[name] = value;
    }
    return attributes;
  });
}
check('原文输入、独立空态和普通文本预览约定', () => {
  const inputs = elements('input');
  assert.equal(inputs.length, 1, '必须保留唯一生效的原生输入控件');
  for (const [name, value] of Object.entries({
    id: 'activity-title', type: 'text', value: '{{title}}', maxlength: '-1',
    bindinput: 'onTitleInput', focus: '{{focused}}',
    bindfocus: 'onTitleFocus', bindblur: 'onTitleBlur',
  })) assert.equal(inputs[0][name], value, `输入控件属性：${name}`);
  const labels = elements('label').filter((label) => label.for === 'activity-title');
  assert.equal(labels.length, 1, '必须保留关联输入控件的标签');
  assert.equal(labels[0].bindtap, 'onLabelTap');
  for (const fragment of [
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
    // 禁止能力根标识符，而非只禁止点号调用；涵盖方括号与别名赋值。
    // 这是本切片的保守源码约定，注释/字符串同样受限；不是混淆代码安全边界。
    assert.doesNotMatch(read(path), /\b(?:wx|cloud|fetch|require|import|globalThis|global|window|self|eval|Function|WebSocket|XMLHttpRequest|localStorage|indexedDB)\b/,
      `本地切片不得引入平台、动态代码、存储或网络能力：${path}`);
  }
  assert.equal(app.permission, undefined);
  assert.equal(app.plugins, undefined);
  assert.deepEqual(json('package.json').dependencies || {}, {});
  assert.deepEqual(json('package.json').devDependencies || {}, {});
});

check('应用和页面入口各注册一次且绑定处理函数存在', () => {
  for (const [path, registration, handlers] of [
    ['miniprogram/app.js', 'App', []],
    ['miniprogram/pages/title/index.js', 'Page', ['onTitleInput', 'onLabelTap', 'onTitleFocus', 'onTitleBlur']],
  ]) {
    const definitions = [];
    runInNewContext(read(path), { [registration](definition) { definitions.push(definition); } }, { timeout: 1000 });
    assert.equal(definitions.length, 1, `${registration} 必须注册一次`);
    assert.ok(definitions[0] && typeof definitions[0] === 'object', `${registration} 需要定义对象`);
    for (const handler of handlers) assert.equal(typeof definitions[0][handler], 'function', `缺少处理函数：${handler}`);
  }
});

console.log(`${checks.length} 项静态检查通过；未执行微信编译、渲染或真机验证。`);
