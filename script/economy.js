(function() {
  var Economy = window.Economy = {

    _TICK_INTERVAL: 10 * 1000,

    CaveBuildings: {
      'spiritVein': {
        name: '灵脉', desc: '打通地底灵脉，每小时产出灵石',
        cost: { wood: 500, iron: 100 }, max: 5,
        income: 1
      },
      'meditationChamber': {
        name: '静修室', desc: '加速修炼进度积累',
        cost: { wood: 300, fur: 50 }, max: 3,
        effect: 'cultivationRate', effectVal: 1.15
      },
      'pillFurnace': {
        name: '丹炉', desc: '自动炼制丹药（每2分钟随机产出丹药）',
        cost: { wood: 800, iron: 150, coal: 50 }, max: 2,
        effect: 'autoAlchemy'
      },
      'treasureVault': {
        name: '藏宝阁', desc: '提升灵石存储上限',
        cost: { wood: 1000, steel: 50, scales: 10 }, max: 3,
        effect: 'stoneCap', effectVal: 50
      },
      'spiritArray': {
        name: '聚灵阵', desc: '大幅提升灵石产出',
        cost: { wood: 2000, steel: 100, scales: 20, 'alien alloy': 3 }, max: 2,
        income: 5
      },
      'guardianShrine': {
        name: '护法殿', desc: '突破失败时损失减半',
        cost: { wood: 1500, steel: 80, teeth: 20 }, max: 1,
        effect: 'breakthroughProtect'
      }
    },

    CaveUpgrades: [
      { name: '石室', icon: '屋', cost: { wood: 200, iron: 30 }, bonus: 'stoneGen+1' },
      { name: '灵府', icon: '府', cost: { wood: 800, steel: 30, scales: 5 }, bonus: 'stoneGen+3' },
      { name: '洞天', icon: '天', cost: { wood: 3000, steel: 100, scales: 30, 'alien alloy': 5 }, bonus: 'stoneGen+10' }
    ],

    _timer: null,

    init: function() {
      if (!$SM.get('features.location.economy')) return;
      this.tab = Header.addLocation('洞府', 'economy', Economy, 'outside');
      this.panel = $('<div>').attr('id', 'economyPanel').addClass('location').appendTo('div#locationSlider');
      Engine.updateSlider();

      $('<div>').attr('id', 'economyContent').appendTo(this.panel);
      $('<div>').attr('id', 'caveBuilds').attr('data-legend', '洞府建筑：').appendTo('#economyContent');
      $('<div>').attr('id', 'caveUpgrade').attr('data-legend', '洞府升级：').appendTo('#economyContent');
      $('<div>').attr('id', 'stoneDisplay').appendTo('#economyContent');

      $.Dispatch('stateUpdate').subscribe(Economy.handleStateUpdates);
      this.startTimer();
      this.updateView();
    },

    startTimer: function() {
      if (this._timer) clearInterval(this._timer);
      this._timer = Engine.setInterval(function() { Economy.tick(); }, this._TICK_INTERVAL);
    },

    tick: function() {
      var income = 0;
      for (var key in Economy.CaveBuildings) {
        var count = $SM.get('character.economy["' + key + '"]', true) || 0;
        var bld = Economy.CaveBuildings[key];
        if (bld.income) income += bld.income * count;
      }
      var upgradeLevel = $SM.get('character.economy.upgradeLevel', true) || 0;
      income += (upgradeLevel === 0 ? 0 : (upgradeLevel === 1 ? 3 : 10));
      income += upgradeLevel + 1;

      $SM.add('stores.spiritStone', income);
      Economy.updateView();
    },

    getSpiritStone: function() {
      return $SM.get('stores.spiritStone', true) || 0;
    },

    spendSpiritStone: function(amount) {
      var current = Economy.getSpiritStone();
      if (current < amount) return false;
      $SM.set('stores.spiritStone', current - amount);
      return true;
    },

    getStoneCap: function() {
      var cap = 100;
      for (var key in Economy.CaveBuildings) {
        var count = $SM.get('character.economy["' + key + '"]', true) || 0;
        var bld = Economy.CaveBuildings[key];
        if (bld.effect === 'stoneCap') cap += bld.effectVal * count;
      }
      return cap;
    },

    getCultivationRate: function() {
      var rate = 1;
      var count = $SM.get('character.economy.meditationChamber', true) || 0;
      var bld = Economy.CaveBuildings['meditationChamber'];
      rate *= Math.pow(bld.effectVal, count);
      return rate;
    },

    canBuild: function(key) {
      var bld = Economy.CaveBuildings[key];
      if (!bld) return false;
      var count = $SM.get('character.economy["' + key + '"]', true) || 0;
      if (count >= bld.max) return false;
      for (var r in bld.cost) {
        if (($SM.get('stores["' + r + '"]', true) || 0) < bld.cost[r]) return false;
      }
      return true;
    },

    build: function(key) {
      if (!Economy.canBuild(key)) return;
      var bld = Economy.CaveBuildings[key];
      for (var r in bld.cost) {
        $SM.add('stores["' + r + '"]', -bld.cost[r]);
      }
      var count = $SM.get('character.economy["' + key + '"]', true) || 0;
      $SM.set('character.economy["' + key + '"]', count + 1);
      Notifications.notify(Economy, '建造 ' + bld.name + ' 成功！');
      Economy.updateView();
    },

    canUpgrade: function() {
      var level = $SM.get('character.economy.upgradeLevel', true) || 0;
      if (level >= Economy.CaveUpgrades.length) return false;
      var cost = Economy.CaveUpgrades[level].cost;
      for (var r in cost) {
        if (($SM.get('stores["' + r + '"]', true) || 0) < cost[r]) return false;
      }
      return true;
    },

    upgradeCave: function() {
      if (!Economy.canUpgrade()) return;
      var level = $SM.get('character.economy.upgradeLevel', true) || 0;
      var cost = Economy.CaveUpgrades[level].cost;
      for (var r in cost) { $SM.add('stores["' + r + '"]', -cost[r]); }
      $SM.set('character.economy.upgradeLevel', level + 1);
      Notifications.notify(Economy, '洞府升级：' + Economy.CaveUpgrades[level].name + '！');
      Economy.updateView();
    },

    autoAlchemy: function() {
      var count = $SM.get('character.economy.pillFurnace', true) || 0;
      if (count === 0) return;
      var pills = ['qiPill', 'recoveryPill', 'spiritPill', 'speedPill'];
      var pill = pills[Math.floor(Math.random() * pills.length)];
      var have = $SM.get('character.alchemy["' + pill + '"]', true) || 0;
      if (have < 99) {
        $SM.set('character.alchemy["' + pill + '"]', have + count);
      }
    },

    updateView: function() {
      var content = $('#economyContent');
      if (!content.length) return;

      var stone = Economy.getSpiritStone();
      var cap = Economy.getStoneCap();
      $('#stoneDisplay').html(
        '<div class="heading">灵石</div>' +
        '<div class="description">' + stone + ' / ' + cap + '</div>'
      );

      var builds = $('#caveBuilds');
      builds.empty();
      for (var key in Economy.CaveBuildings) {
        var bld = Economy.CaveBuildings[key];
        var count = $SM.get('character.economy["' + key + '"]', true) || 0;

        var row = $('<div>').addClass('ecoRow');
        $('<div>').addClass('row_key').text(bld.name + ' ' + count + '/' + bld.max).appendTo(row);
        $('<div>').addClass('row_val').text(bld.desc).appendTo(row);

        if (count < bld.max && Economy.canBuild(key)) {
          $('<div>').addClass('button buildBtn').text('建造').click(function(k) {
            return function() { Economy.build(k); };
          }(key)).appendTo(row);
        } else if (count >= bld.max) {
          $('<div>').addClass('row_val').text('已满级').appendTo(row);
        }
        builds.append(row);
      }

      var upgrade = $('#caveUpgrade');
      upgrade.empty();
      var level = $SM.get('character.economy.upgradeLevel', true) || 0;
      if (level < Economy.CaveUpgrades.length) {
        var next = Economy.CaveUpgrades[level];
        $('<div>').text('当前：' + (level > 0 ? Economy.CaveUpgrades[level - 1].name : '简陋洞穴')).appendTo(upgrade);
        $('<div>').text('下一级：' + next.name + '（' + next.bonus + '）').appendTo(upgrade);
        if (Economy.canUpgrade()) {
          $('<div>').addClass('button buildBtn').text('升级').click(Economy.upgradeCave).appendTo(upgrade);
        }
      } else {
        $('<div>').text('洞府已达最高等级：' + Economy.CaveUpgrades[level - 1].name).appendTo(upgrade);
      }
    },

    handleStateUpdates: function(e) {
      if (e.category === 'stores') Economy.updateView();
    },

    onArrival: function() {
      this.updateView();
    }
  };
})();
