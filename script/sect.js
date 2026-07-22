(function() {
  var Sect = window.Sect = {

    Disciples: {
      'outerDisciple': { name: '外门弟子', cost: { spiritStone: 20, wood: 100 }, income: { spiritStone: 2, wood: 1 }, loyalty: 50, max: 10 },
      'innerDisciple': { name: '内门弟子', cost: { spiritStone: 80, iron: 50, fur: 10 }, income: { spiritStone: 6, iron: 2 }, loyalty: 70, max: 6 },
      'eliteDisciple': { name: '真传弟子', cost: { spiritStone: 200, steel: 20, scales: 5 }, income: { spiritStone: 15, steel: 2, scales: 1 }, loyalty: 85, max: 3 },
      'elder': { name: '长老', cost: { spiritStone: 800, 'alien alloy': 3, scales: 15 }, income: { spiritStone: 50, steel: 5, 'alien alloy': 1 }, loyalty: 95, max: 2 }
    },

    Buildings: {
      'scriptureHall': { name: '藏经阁', desc: '加快功法领悟速度', cost: { spiritStone: 100, wood: 500, fur: 30 }, max: 3, effect: 'techniqueRate', effectVal: 1.2 },
      'pillHall': { name: '丹房', desc: '自动炼丹产出率提升', cost: { spiritStone: 150, wood: 400, coal: 50 }, max: 3, effect: 'autoAlchemyBoost', effectVal: 1 },
      'trainingTower': { name: '试练塔', desc: '自动推进秘境进度', cost: { spiritStone: 300, steel: 50, scales: 10 }, max: 3, effect: 'realmProgress', effectVal: 1 },
      'mainHall': { name: '宗门大殿', desc: '提升宗门弟子上限', cost: { spiritStone: 500, steel: 100, scales: 20 }, max: 3, effect: 'discipleCap', effectVal: 5 },
      'guardianStatue': { name: '护山大阵', desc: '抵御妖兽侵袭', cost: { spiritStone: 800, 'alien alloy': 5, teeth: 30 }, max: 1, effect: 'beastGuard' },
      'trainingGround': { name: '练功场', desc: '提升弟子产出效率', cost: { spiritStone: 400, iron: 200, coal: 40 }, max: 5, effect: 'incomeRate', effectVal: 1.15 }
    },

    _TICK_INTERVAL: 20 * 1000,
    _timer: null,
    _initialized: false,

    init: function() {
      if (!$SM.get('features.location.sect')) return;
      if (this._initialized) return;
      this._initialized = true;

      this.tab = Header.addLocation('宗门', 'sect', Sect, 'outside');
      this.panel = $('<div>').attr('id', 'sectPanel').addClass('location').appendTo('div#locationSlider');
      Engine.updateSlider();

      var inner = $('<div>').attr('id', 'sectContent').appendTo(this.panel);
      $('<div>').attr('id', 'sectDisciple').attr('data-legend', '宗门弟子：').appendTo(inner);
      $('<div>').attr('id', 'sectBuild').attr('data-legend', '宗门建筑：').appendTo(inner);
      $('<div>').attr('id', 'sectIncome').appendTo(inner);

      $.Dispatch('stateUpdate').subscribe(Sect.handleStateUpdates);
      this.startTimer();
      this.updateView();
    },

    startTimer: function() {
      if (this._timer) clearInterval(this._timer);
      this._timer = Engine.setInterval(function() { Sect.tick(); }, this._TICK_INTERVAL);
    },

    getDiscipleCap: function() {
      var cap = 5;
      var mainHallLv = $SM.get('character.sect.mainHall', true) || 0;
      cap += mainHallLv * (Sect.Buildings['mainHall'].effectVal || 5);
      return cap;
    },

    getTotalDisciples: function() {
      var total = 0;
      for (var key in Sect.Disciples) {
        total += $SM.get('character.sect.disciples["' + key + '"]', true) || 0;
      }
      return total;
    },

    getIncomeRate: function() {
      var rate = 1;
      var trainingLv = $SM.get('character.sect.trainingGround', true) || 0;
      var bld = Sect.Buildings['trainingGround'];
      rate *= Math.pow(bld.effectVal || 1.15, trainingLv);
      return rate;
    },

    tick: function() {
      var rate = Sect.getIncomeRate();
      for (var key in Sect.Disciples) {
        var count = $SM.get('character.sect.disciples["' + key + '"]', true) || 0;
        if (count === 0) continue;
        var disc = Sect.Disciples[key];

        var loyaltyDelta = Math.random() > 0.8 ? -2 : 0;
        var newLoy = (disc.loyalty || 50) + loyaltyDelta + count * 0.1;
        $SM.set('character.sect.loyalty["' + key + '"]', Math.max(0, Math.min(100, newLoy)));

        var loyMod = 0.5 + ($SM.get('character.sect.loyalty["' + key + '"]', true) || 50) / 100;
        for (var r in disc.income) {
          var amt = Math.floor(disc.income[r] * count * rate * loyMod);
          if (r === 'spiritStone') {
            Economy.spendSpiritStone(-amt);
          } else {
            $SM.add('stores["' + r + '"]', amt);
          }
        }
      }

      Sect.autoProcess();
      Sect.updateView();
    },

    autoProcess: function() {
      var pillHall = $SM.get('character.sect.pillHall', true) || 0;
      if (pillHall > 0 && Alchemy && Alchemy.add) {
        var pills = ['qiPill', 'recoveryPill', 'spiritPill'];
        var pil = pills[Math.floor(Math.random() * pills.length)];
        var have = $SM.get('character.alchemy["' + pil + '"]', true) || 0;
        if (have < 99) $SM.set('character.alchemy["' + pil + '"]', have + pillHall * 2);
      }

      var tower = $SM.get('character.sect.trainingTower', true) || 0;
      if (tower > 0 && typeof SecretRealm !== 'undefined') {
        var progress = $SM.get('character.secretRealm.progress', true) || 0;
        $SM.set('character.secretRealm.progress', progress + tower * 0.5);
      }
    },

    canRecruit: function(key) {
      var disc = Sect.Disciples[key];
      if (!disc) return false;
      var count = $SM.get('character.sect.disciples["' + key + '"]', true) || 0;
      if (count >= disc.max) return false;
      if (Sect.getTotalDisciples() >= Sect.getDiscipleCap()) return false;
      for (var r in disc.cost) {
        if (r === 'spiritStone') {
          if (Economy.getSpiritStone() < disc.cost[r]) return false;
        } else {
          if (($SM.get('stores["' + r + '"]', true) || 0) < disc.cost[r]) return false;
        }
      }
      return true;
    },

    recruit: function(key) {
      if (!Sect.canRecruit(key)) return;
      var disc = Sect.Disciples[key];
      for (var r in disc.cost) {
        if (r === 'spiritStone') { Economy.spendSpiritStone(disc.cost[r]); }
        else { $SM.add('stores["' + r + '"]', -disc.cost[r]); }
      }
      var count = $SM.get('character.sect.disciples["' + key + '"]', true) || 0;
      $SM.set('character.sect.disciples["' + key + '"]', count + 1);
      $SM.set('character.sect.loyalty["' + key + '"]', disc.loyalty);
      Notifications.notify(Sect, '成功招募' + disc.name + '！');
      Sect.updateView();
    },

    canBuildSect: function(key) {
      var bld = Sect.Buildings[key];
      if (!bld) return false;
      var count = $SM.get('character.sect["' + key + '"]', true) || 0;
      if (count >= bld.max) return false;
      for (var r in bld.cost) {
        if (r === 'spiritStone') {
          if (Economy.getSpiritStone() < bld.cost[r]) return false;
        } else {
          if (($SM.get('stores["' + r + '"]', true) || 0) < bld.cost[r]) return false;
        }
      }
      return true;
    },

    buildSect: function(key) {
      if (!Sect.canBuildSect(key)) return;
      var bld = Sect.Buildings[key];
      for (var r in bld.cost) {
        if (r === 'spiritStone') { Economy.spendSpiritStone(bld.cost[r]); }
        else { $SM.add('stores["' + r + '"]', -bld.cost[r]); }
      }
      var count = $SM.get('character.sect["' + key + '"]', true) || 0;
      $SM.set('character.sect["' + key + '"]', count + 1);
      Notifications.notify(Sect, bld.name + '建造成功！');
      Sect.updateView();
    },

    updateView: function() {
      var content = $('#sectContent');
      if (!content.length) return;

      var discDiv = $('#sectDisciple');
      discDiv.empty();

      for (var key in Sect.Disciples) {
        var disc = Sect.Disciples[key];
        var count = $SM.get('character.sect.disciples["' + key + '"]', true) || 0;
        var loy = $SM.get('character.sect.loyalty["' + key + '"]', true) || disc.loyalty;

        var row = $('<div>').addClass('ecoRow');
        $('<div>').addClass('row_key').text(disc.name + ' x' + count + '/' + disc.max).appendTo(row);

        var incStr = '产出:';
        for (var r in disc.income) { incStr += ' ' + r + '+' + disc.income[r]; }
        $('<div>').addClass('row_val').text(incStr).appendTo(row);

        $('<div>').css({
          'width': '60px', 'height': '4px', 'background': '#333', 'marginLeft': '8px'
        }).append(
          $('<div>').css({'width': loy + '%', 'height': '100%', 'background': loy > 60 ? '#27ae60' : (loy > 30 ? '#f39c12' : '#e74c3c')})
        ).appendTo(row);

        if (Sect.canRecruit(key)) {
          $('<div>').addClass('button buildBtn').text('招募').click(function(k) {
            return function() { Sect.recruit(k); };
          }(key)).appendTo(row);
        } else if (count >= disc.max) {
          $('<div>').addClass('row_val').text('满员').appendTo(row);
        } else if (Sect.getTotalDisciples() >= Sect.getDiscipleCap()) {
          $('<div>').addClass('row_val').text('上限').appendTo(row);
        }
        discDiv.append(row);
      }

      var cap = Sect.getDiscipleCap();
      var total = Sect.getTotalDisciples();
      discDiv.append($('<div>').addClass('row_val').text('总弟子：' + total + '/' + cap));

      var buildDiv = $('#sectBuild');
      buildDiv.empty();
      for (var bk in Sect.Buildings) {
        var bld = Sect.Buildings[bk];
        var bcount = $SM.get('character.sect["' + bk + '"]', true) || 0;

        var brow = $('<div>').addClass('ecoRow');
        $('<div>').addClass('row_key').text(bld.name + ' ' + bcount + '/' + bld.max).appendTo(brow);
        $('<div>').addClass('row_val').text(bld.desc).appendTo(brow);

        if (bcount < bld.max && Sect.canBuildSect(bk)) {
          $('<div>').addClass('button buildBtn').text('建造').click(function(k) {
            return function() { Sect.buildSect(k); };
          }(bk)).appendTo(brow);
        } else if (bcount >= bld.max) {
          $('<div>').addClass('row_val').text('已满级').appendTo(brow);
        }
        buildDiv.append(brow);
      }

      var incDiv = $('#sectIncome');
      incDiv.empty();
      $('<div>').addClass('heading').text('宗门收益（每20秒）。产出倍率:' + Sect.getIncomeRate().toFixed(1) + 'x').appendTo(incDiv);
      for (var ik in Sect.Disciples) {
        var icount = $SM.get('character.sect.disciples["' + ik + '"]', true) || 0;
        if (icount === 0) continue;
        var idisc = Sect.Disciples[ik];
        var istr = idisc.name + 'x' + icount + ': ';
        for (var ir in idisc.income) istr += ir + '+' + (idisc.income[ir] * icount * Sect.getIncomeRate()).toFixed(1) + '/tick ';
        $('<div>').text(istr).appendTo(incDiv);
      }
    },

    handleStateUpdates: function(e) {
      if (e.category === 'stores' || e.category === 'character') Sect.updateView();
    },

    onArrival: function() {
      this.updateView();
    }
  };
})();
