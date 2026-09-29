// 生成交付物：连云港美食打卡地图.html + 连云港美食打卡清单.md + items_lyg.json
// 数据源：抖音探店视频 + 评论区本地人推荐 → 高德地图定位（amap_lyg*.json）
const fs = require('fs');
const path = require('path');
const dir = __dirname;

function load(file) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return []; }
}
const all = []
  .concat(load('amap_lyg1.json'))
  .concat(load('amap_lyg_test.json'))
  .concat(load('amap_lyg_rest.json'))
  .concat(load('amap_lyg3.json'))
  .concat(load('amap_lyg4.json'))
  .concat(load('amap_lyg5.json'));

// keyword -> 该关键词下「评价数最多」的 POI（过滤掉停车场/大门等非店铺）
const byKw = new Map();
for (const r of all) {
  const pois = (r.pois || []).filter((p) => p.lng && p.lat && !/停车场|大门|公交|站$|门前/.test(p.name || ''));
  if (!pois.length) continue;
  pois.sort((a, b) => (Number(b.reviews) || 0) - (Number(a.reviews) || 0));
  byKw.set(r.keyword, pois);
}

// 相关性校验：高德会把搜不到的词模糊匹配到不相干的店，必须拦掉
const GENERIC = ['凉皮', '凉面', '记凉皮', '海鲜', '烧烤', '米线', '煎饼', '饭店', '菜馆', '火锅', '鱼火锅', '大酒店', '酒楼', '面馆', '炒面', '面食', '小吃', '美食', '餐厅', '酒店', '私房菜', '家常菜', '大排档', '特色', '川菜', '酸辣粉', '麻辣烫', '香肠', '烧鸡', '风鹅', '熏鸡', '豆腐卷', '千层饼', '凉粉', '鸡蛋饼', '菜煎饼', '里脊肉', '焖锅'];
function lcsStr(a, b) {
  let best = '';
  for (let i = 0; i < a.length; i++) for (let l = 1; i + l <= a.length; l++) {
    const s = a.substr(i, l);
    if (s.length > best.length && b.includes(s)) best = s;
  }
  return best;
}
function relevant(kw, name) {
  const s = lcsStr(kw, name);
  // 关键词越长，要求的重合度越高；且只靠"凉皮/海鲜/川菜"这种品类词重合不算数
  const need = kw.length >= 4 ? 3 : 2;
  if (s.length < need) return false;
  if (GENERIC.includes(s)) return false;
  return true;
}

// 人工挑选：kw=高德检索词，idx=取该词下第几个（0=评价最多），cat/tier/note 人工标注
const picks = [
  // ---- 豆丹 · 连云港特色 ----
  { kw: '豆丹', idx: 0, cat: '豆丹·特色', tier: 'core', src: '抖音综合', note: '灌云豆丹是连云港第一特色——外地人不敢下筷、本地人拿它招待贵客。评论区聊"来连云港吃什么"时出现频率最高的一道菜' },
  { kw: '沙光鱼', idx: 0, cat: '豆丹·特色', tier: 'core', src: '抖音评论区', note: '本地名鱼，老话讲"十月沙光赛羊汤"，秋季最肥' },
  // ---- 凉皮凉面（连云港独有的糖醋口）----
  { kw: '小老头凉皮凉面', idx: 0, cat: '凉皮凉面', tier: 'core', src: '抖音评论区', note: '评论区被点名最多的凉皮店，4.6分/100+评。连云港的凉皮是酸甜口，跟别处完全不一样' },
  { kw: '小武凉皮', idx: 0, cat: '凉皮凉面', tier: 'core', src: '抖音评论区', note: '评论原话"小武凉皮凉面，12块一碗"' },
  { kw: '一品香凉皮', idx: 0, cat: '凉皮凉面', tier: 'core', src: '抖音评论区', note: '评论说在幸福时光斜对面，本地人常去' },
  { kw: '潘氏凉皮', idx: 0, cat: '凉皮凉面', tier: 'alt', src: '抖音评论区', note: '赣榆潘氏果蔬凉皮，评论点名' },
  // ---- 米线 · 面食 ----
  { kw: '仲小仲纯粮米线', idx: 0, cat: '米线·面食', tier: 'core', src: '抖音评论区', note: '评论说原名"仲氏米线"，开了20多年，本地人从小吃到大' },
  { kw: '小三元米线', idx: 0, cat: '米线·面食', tier: 'core', src: '抖音评论区', note: '评论点名"小三元炒米线"，繁荣路一带' },
  { kw: '黄记炒面', idx: 0, cat: '米线·面食', tier: 'core', src: '抖音评论区', note: '4.6分，本地炒面的代表，评论里被反复推荐' },
  { kw: '状元面馆', idx: 0, cat: '米线·面食', tier: 'core', src: '抖音评论区', note: '评论点名炸酱面/六鲜面，老新浦的招牌面馆' },
  { kw: '春城米线馆', idx: 0, cat: '米线·面食', tier: 'alt', src: '抖音评论区', note: '民主路老街，评论说开了40年' },
  { kw: '延中米线', idx: 0, cat: '米线·面食', tier: 'alt', src: '抖音评论区', note: '砂锅米线，学校旁的老店' },

  // ---- 海鲜 ----
  { kw: '八仙渔港', idx: 0, cat: '海鲜', tier: 'core', src: '抖音评论区', note: '市区老牌海鲜楼，评论说"贵是贵，但确实正宗"' },
  { kw: '墟沟海鲜', idx: 0, cat: '海鲜', tier: 'core', src: '抖音评论区', note: '连云区墟沟的海鲜一条街——本地人吃海鲜的基本都往这儿跑' },
  // ---- 烧烤 ----
  { kw: '元泰烧烤', idx: 0, cat: '烧烤', tier: 'core', src: '抖音评论区', note: '评论区反复出现的"元泰"，灌云起家、市区也有店。评论原话：个人喜欢烧烤——永进、元泰、为人民（三家都是灌云的）' },
  { kw: '百味烧烤', idx: 0, cat: '烧烤', tier: 'core', src: '抖音评论区', note: '评论点名，本地人气烧烤' },
  { kw: '老陈烧烤', idx: 0, cat: '烧烤', tier: 'alt', src: '抖音评论区', note: '评论提到的老牌烧烤摊' },
  // ---- 本地菜馆 ----
  { kw: '兄弟酒家', idx: 0, cat: '本地菜馆', tier: 'core', src: '抖音评论区', note: '评论区评价极高——"鱼子酱卷饼封神"，室内大排档风格' },
  { kw: '世纪饭店', idx: 0, cat: '本地菜馆', tier: 'core', src: '抖音评论区', note: '评论点名的老饭店，招牌龙虾豆腐' },
  { kw: '海州辣子鸡', idx: 0, cat: '本地菜馆', tier: 'core', src: '抖音评论区', note: '海州本地做法，评论里作为"本地人才知道"的菜被反复提到' },
  { kw: '川味苑酒楼', idx: 0, cat: '本地菜馆', tier: 'alt', src: '抖音评论区', note: '黄金海岸那家，位置分享里出现' },
  { kw: '郑庄饭店', idx: 0, cat: '本地菜馆', tier: 'alt', src: '抖音评论区', note: '评论提到的本地饭店' },
  { kw: '福聚德', idx: 0, cat: '本地菜馆', tier: 'alt', src: '抖音评论区', note: '评论说在盐业公司楼下' },
  { kw: '老八秘制川菜馆', idx: 0, cat: '本地菜馆', tier: 'alt', src: '抖音评论区', note: '评论点名——连云港人很认的川菜（本地化川菜）' },
  { kw: '朝阳小周川菜馆', name: '小周四川饭店', idx: 0, cat: '本地菜馆', tier: 'alt', src: '抖音评论区', note: '同上，开了很多年的本地川菜——高德上挂的招牌是"小周四川饭店(朝阳店)"' },
  // ---- 小吃 · 早点 ----
  { kw: '祥和豆腐卷', idx: 0, cat: '小吃·早点', tier: 'core', src: '抖音评论区', note: '评论热推，"去晚了就没了"——连云港特色小吃豆腐卷' },
  { kw: '闻老大香掉牙千层饼', idx: 0, cat: '小吃·早点', tier: 'core', src: '抖音评论区', note: '评论里带[位置]分享的那家，千层酥饼' },
  { kw: '大嘴巴酸辣粉', idx: 0, cat: '小吃·早点', tier: 'core', src: '抖音评论区', note: '连云区的老牌——评论说除了酸辣粉，鱿鱼串也好吃' },
  { kw: '苏记后街娃娃鱼', idx: 0, cat: '小吃·早点', tier: 'core', src: '抖音评论区', note: '娃娃鱼（本地叫法，其实是粉类小吃），后街老摊' },
  { kw: '美味斋', idx: 0, cat: '小吃·早点', tier: 'alt', src: '抖音评论区', note: '评论说浦街80后的记忆：包子配虾米馄饨' },
  { kw: '孙姐鸡蛋饼', idx: 0, cat: '小吃·早点', tier: 'alt', src: '抖音评论区', note: '评论点名的早点摊' },
  { kw: '徐凤琴酸辣粉', name: '徐凤芹', idx: 0, cat: '小吃·早点', tier: 'alt', src: '抖音评论区', note: '港城老牌酸辣粉（评论写"徐凤琴"，店里是"徐凤芹"）' },
  { kw: '王伟里脊肉', idx: 0, cat: '小吃·早点', tier: 'alt', src: '抖音评论区', note: '赣榆时代广场步行街，评论点名' },
  { kw: '二妮菜煎饼', idx: 0, cat: '小吃·早点', tier: 'alt', src: '抖音评论区', note: '东海方向，评论提到的菜煎饼' },
  { kw: '振兴桥油炸', idx: 0, cat: '小吃·早点', tier: 'alt', src: '抖音评论区', note: '东海的老牌油炸摊' },
  { kw: '多一味鸡煲', idx: 0, cat: '本地菜馆', tier: 'alt', src: '抖音评论区', note: '评论点名"多一味鸡煲"' },
  // ---- 烧鸡 · 卤味 · 特产 ----
  { kw: '桃林烧鸡', idx: 0, cat: '烧鸡·卤味', tier: 'core', src: '抖音评论区', note: '东海桃林烧鸡——连云港本地名吃，评论里被当作"带走的特产"' },
  { kw: '花果山风鹅', idx: 0, cat: '烧鸡·卤味', tier: 'core', src: '抖音评论区', note: '花果山风鹅——连云港最有名的伴手礼之一。另外板浦镇还有"三样"：滴醋、香肠、大刀面' },
  { kw: '张记熏鸡', idx: 0, cat: '烧鸡·卤味', tier: 'alt', src: '抖音评论区', note: '评论说在第一池边上' },
  // ---- 补充：后续从 7800+ 条评论里追加 ----
  { kw: '海州红霞米线', idx: 0, cat: '米线·面食', tier: 'alt', src: '抖音评论区', note: '评论原话"躲在巷子里的……海州红霞米线"' },

  { kw: '伟志凉皮凉面', idx: 0, cat: '凉皮凉面', tier: 'alt', src: '抖音评论区', note: '西小区伟志凉皮凉面，评论点名' },
  { kw: '潘德鹏麻辣烫', name: '潘德朋麻辣烫', idx: 0, cat: '小吃·早点', tier: 'alt', src: '抖音评论区', note: '评论清单："小三元米线，延中米线，黄记炒面，状元面馆的炸酱面，潘德鹏麻辣烫"（高德上是"潘德朋"）' },

  { kw: '邓记川菜', idx: 0, cat: '本地菜馆', tier: 'alt', src: '抖音评论区', note: '评论原话"躲在巷子里的川菜，邓记"' },
  { kw: '猴嘴凉粉', name: '小黄凉粉', idx: 0, cat: '小吃·早点', tier: 'alt', src: '抖音评论区', note: '猴嘴的凉粉分绿豆、黄豆两种，本地人当早饭；高德上猴嘴收录的凉粉店是"小黄凉粉(融盛猴嘴生活广场店)"' },
  { kw: '赣榆煎饼', idx: 0, cat: '小吃·早点', tier: 'alt', src: '抖音评论区', note: '赣榆煎饼——连云港煎饼的正宗在赣榆，普遍是卷炸串/卷油条吃' },
  { kw: '聿可糕行', idx: 0, cat: '小吃·早点', tier: 'alt', src: '抖音评论区', note: '赣榆的年糕铺，评论点名' },

];
