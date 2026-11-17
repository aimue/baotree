const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const source = readFileSync(resolve(__dirname, '../miniprogram/pages/title/index.js'), 'utf8');

function createPage() {
  let page;
  runInNewContext(source, { Page(definition) { page = definition; } });
  page.setData = function (values) { Object.assign(this.data, values); };
  return page;
}

test('页面初始标题为空，没有样例标题或持久化值', () => {
  const page = createPage();
  assert.equal(page.data.title, '');
  assert.equal(page.data.focused, false);
});

const cases = [
  ['中文标题', '周六读书会'],
  ['普通文字', 'Tree gathering 2026'],
  ['前后及重复空格', '  周六  读书会  '],
  ['纯空格', '   '],
  ['emoji 与组合字符', '🌳👨‍👩‍👧‍👦 e\u0301 许愿'],
  ['超过140字符', '长标题🌳'.repeat(80)],
  ['类似标签与实体', '<script>alert("标题")</script> &amp; {{title}}'],
];

for (const [name, value] of cases) {
  test(`输入原文逐字保留：${name}`, () => {
    const page = createPage();
    const result = page.onTitleInput({ detail: { value } });
    assert.equal(page.data.title, value);
    assert.equal(result, undefined, '不向输入控件返回替代字符串');
  });
}

test('连续输入、清空与重新输入均更新同一页面状态', () => {
  const page = createPage();
  for (const value of ['周', '周六', '周六读书会', '', '新的标题']) {
    page.onTitleInput({ detail: { value } });
    assert.equal(page.data.title, value);
  }
});

test('页面实例不共享标题状态', () => {
  const first = createPage();
  const second = createPage();
  first.onTitleInput({ detail: { value: '只在第一页' } });
  assert.equal(second.data.title, '');
  assert.equal(createPage().data.title, '');
});

test('标签、聚焦和失焦只更新界面焦点状态', () => {
  const page = createPage();
  page.onTitleInput({ detail: { value: '保留标题' } });
  page.onLabelTap();
  assert.equal(page.data.focused, true);
  page.onTitleBlur();
  assert.equal(page.data.focused, false);
  page.onTitleFocus();
  assert.equal(page.data.focused, true);
  assert.equal(page.data.title, '保留标题');
});
