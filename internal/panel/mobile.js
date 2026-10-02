/* mobile.js — 手机端（≤760px）联动逻辑：抽屉开合 + 宽表卡片化的字段名标签。
 *
 * 本文件是本仓库自有文件，上游不维护（同步上游时不参与冲突）。
 * 必须在 app.js 之后加载：依赖 app.js 的全局（$、go、esc、各 render*）与已渲染的 DOM。
 *
 * 分工：样式在 mobile.css；CSS 表达不了的联动（抽屉开关、th 文本 → td[data-l]）放这里。
 */

/* ── 移动端适配（≤760px）──────────────────────────────────────────────
   分工：所有手机端**样式**都在 index.html 末尾那一条 @media (max-width:760px)；
   这里只做 CSS 表达不了的联动：

   1) 侧栏抽屉开合（汉堡 / 遮罩 / 导航项 / ESC / 转回宽屏复位）。
      「转回宽屏复位」不是可选项：遮罩是 fixed 全屏层，窗口拉宽后若不摘掉 .on，
      它会永远盖在面板上，整个页面点不动。

   2) 表格 → 卡片的**字段名**。卡片模式隐藏了表头，用户就看不出哪个值是哪一列。
      做法不是把字段名写死在 CSS 里（表头一改名就漂移），而是把每个 <th> 的纯文本
      抄进同列 <td> 的 data-l，CSS 用 content: attr(data-l) 渲染。
      行全是 JS 动态 innerHTML 出来的（含弹层里的任务表、积分构成里每账号一张表），
      故用 MutationObserver 监听 body 子树，任何一次重渲染后自动补标签。

   两件事在 >760px 时都空转：matchMedia 不匹配；data-l 只是多一个桌面端不参与
   渲染的属性。桌面端表现与改动前完全一致。 */
const MOBILE_MQ = matchMedia('(max-width: 760px)');

const navDrawer = document.querySelector('.nav');
const navBtn = $('navBtn'), navVeil = $('navVeil');

/* drawerSet 幂等设置抽屉三态载体：侧栏 .open / 遮罩 .on / 按钮 aria-expanded。 */
function drawerSet(open) {
  if (navDrawer) navDrawer.classList.toggle('open', open);
  if (navVeil) navVeil.classList.toggle('on', open);
  if (navBtn) navBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function drawerClose() { drawerSet(false); }
function drawerToggle() { drawerSet(!(navDrawer && navDrawer.classList.contains('open'))); }

if (navBtn) navBtn.addEventListener('click', drawerToggle);          // 汉堡：开/关
if (navVeil) navVeil.addEventListener('click', drawerClose);         // 点遮罩关
// 点导航项关：事件委托，不去改上方既有的 go() 绑定
if (navDrawer) navDrawer.addEventListener('click', ev => { if (ev.target.closest('a')) drawerClose(); });
addEventListener('keydown', ev => { if (ev.key === 'Escape') drawerClose(); }); // ESC 关
// 转回 >760px 自动复位：matchMedia 的 change 在跨过断点时触发，resize 兜底
function drawerResetIfWide() { if (!MOBILE_MQ.matches) drawerClose(); }
if (MOBILE_MQ.addEventListener) MOBILE_MQ.addEventListener('change', drawerResetIfWide);
else if (MOBILE_MQ.addListener) MOBILE_MQ.addListener(drawerResetIfWide); // 旧 Safari
addEventListener('resize', drawerResetIfWide);

/* ── 表格字段名 → data-l ─────────────────────────────────────────────── */
/* thLabel 只取表头里的**纯文本节点**：表头里可能还有排序箭头之类的装饰 <span>，
   innerText 会把它们的字符一并算成字段名。 */
function thLabel(th) {
  let t = '';
  for (const n of th.childNodes) if (n.nodeType === 3) t += n.nodeValue;
  return t.replace(/\s+/g, ' ').trim();
}
/* labelTable 按列把表头文字抄进每一行：td[data-l] = 同列 th 的纯文本。
   跨列单元格（colspan：空态提示、包分组汇总）不参与列对齐，也不打标签。 */
/* SHORT_LABEL 手机卡片用的短字段名：一行要并排放好几个指标，表头原名太长会挤成
   两行（「成功 / 失败」「支持的思考档位」「上下文长度」）。未列出的沿用表头纯文本。 */
const SHORT_LABEL = {
  '成功 / 失败': '成功',
  '支持的思考档位': '档位',
  '上下文长度': '上下文',
  '最大输出': '输出',
  '积分倍率': '倍率',
  '均延迟': '延迟',
  '均速率': '速率',
  '最近成功': '最近',
};
function labelTable(table) {
  const head = table.tHead;
  if (!head || !head.rows.length) return;
  const labels = [];
  for (const th of head.rows[head.rows.length - 1].cells) labels.push(thLabel(th));
  for (const body of table.tBodies) {
    for (const tr of body.rows) {
      let col = 0;
      for (const td of tr.cells) {
        const span = td.colSpan > 1 ? td.colSpan : 1;
        const full = span === 1 ? (labels[col] || '') : '';
        const label = SHORT_LABEL[full] || full;
        if (label) td.setAttribute('data-l', label);
        else td.removeAttribute('data-l');
        col += span;
      }
    }
  }
}
function labelTables() {
  document.querySelectorAll('table').forEach(labelTable);
}
/* 一次重渲染会连发多条 mutation（整段 tbody 换掉），合并成一次批处理。 */
let labelPending = false;
function queueLabels() {
  if (labelPending) return;
  labelPending = true;
  setTimeout(() => { labelPending = false; labelTables(); }, 0);
}
labelTables(); // 首屏：把已存在的行先标好
new MutationObserver(queueLabels).observe(document.body, { childList: true, subtree: true });
