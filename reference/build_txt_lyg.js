const fs = require('fs');
const items = JSON.parse(fs.readFileSync('items_lyg.json', 'utf8'));
const catOrder = ['豆丹·特色', '凉皮凉面', '米线·面食', '海鲜', '烧烤', '本地菜馆', '小吃·早点', '烧鸡·卤味'];
const clean = (s) => (s || '').replace(/[（(][^）)]*(步行|号口|[0-9]+\s*米)[^）)]*[）)]/g, '').trim();

const out = [];
out.push('连云港美食打卡清单（手机速查版）');
out.push('来源：抖音连云港相关探店视频 + 评论区本地人推荐；坐标/评分来自高德地图');
out.push('共 ' + items.length + ' 家店。带【主】的是推荐首选，【备】是同品牌分店或备选。');
out.push('');
for (const cat of catOrder) {
  const g = items.filter((i) => i.cat === cat);
  if (!g.length) continue;
  out.push('【' + cat + '】' + g.length + ' 家');
  g.forEach((i) => {
    const tag = i.tier === 'core' ? '主' : '备';
    const score = i.rating ? i.rating + '分/' + (i.reviews || '?') + '评' : '';
    const price = i.price ? '人均' + String(i.price).replace(/[^0-9]/g, '') : '';
    out.push(`- 【${tag}】${i.name}  ${score}${price ? '  ' + price : ''}`);
    out.push(`    地址：${clean(i.address)}`);
    if (i.signature) out.push(`    招牌：${i.signature.split(',').slice(0, 6).join('、')}`);
    out.push(`    高德导航：${i.amapNav}`);
  });
  out.push('');
}
out.push('提示：点上面的"高德导航"链接会用高德打开并开始导航。地址里若有个别字显示异常，是高德的字体问题，以坐标为准。');
out.push('');
out.push('———— 评论区里的连云港 ————');
out.push('· 凉皮/凉面：连云港的凉皮是酸甜口（糖醋），跟西安、徐州都不是一个味，本地人拿它当早饭。');
out.push('· 豆丹：外地人不敢下筷，本地人拿它招待贵客——灌云的豆丹最有名。');
out.push('· 沙光鱼：老话"十月沙光赛羊汤"，秋天来最肥。');
out.push('· 板浦镇"三样"：滴醋、香肠、大刀面。街上随便找家面馆都能吃到配滴醋的大刀面。');
out.push('· 评论区还有人提到一家已经不在了的小馆子："以前在港务局铁管处门前小巷子里，两间小破房子，号称王子大酒店，顾客满满，不预定还没位置"——现在导航搜不到，当个老连云港的念想。');
out.push('· 下面这几家评论里点名、但高德地图上搜不到对应门店，去之前自己再确认一下：');
out.push('  灌云新村街「小孙凉皮凉面」（凉皮凉面、娃娃鱼、炒面）、「巷中鱼火锅」、灌云烧烤「永进/为人民」、东海「啤酒烧烤局」（临沂炒鸡、牛蛙）。');
out.push('· 东海县还有两样：红焖老公鸡、东海草莓（季节货）。');
fs.writeFileSync('连云港美食-手机速查.txt', out.join('\n'), 'utf8');
console.log('ok', out.join('\n').length);
