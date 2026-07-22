(function() {
  var Cultivation = window.Cultivation = {

    _UPDATE_INTERVAL: 5 * 1000,

    Realms: [
      { id: 'qiRefining', name: '练气', desc: '引气入体，淬炼凡躯', maxLevel: 9,
        breakthroughChance: 0.9, cost: { wood: 200 },
        bonus: { damage: 1, hp: 5, hit: 0, dodge: 0 } },
      { id: 'foundation', name: '筑基', desc: '筑就道基，超凡脱俗', maxLevel: 9,
        breakthroughChance: 0.75, cost: { wood: 500, iron: 100 },
        bonus: { damage: 2, hp: 10, hit: 0.02, dodge: 0.02 } },
      { id: 'goldenCore', name: '金丹', desc: '凝聚金丹，寿元大增', maxLevel: 9,
        breakthroughChance: 0.6, cost: { wood: 1000, iron: 300, coal: 100 },
        bonus: { damage: 3, hp: 20, hit: 0.05, dodge: 0.05 } },
      { id: 'nascentSoul', name: '元婴', desc: '元婴初成，神识外放', maxLevel: 9,
        breakthroughChance: 0.45, cost: { wood: 2000, steel: 100, sulphur: 50 },
        bonus: { damage: 5, hp: 30, hit: 0.08, dodge: 0.08 } },
      { id: 'spiritTransfo', name: '化神', desc: '化神合道，天地共鸣', maxLevel: 9,
        breakthroughChance: 0.3, cost: { wood: 5000, steel: 300, scales: 50 },
        bonus: { damage: 8, hp: 50, hit: 0.1, dodge: 0.1 } },
      { id: 'bodyIntegration', name: '合体', desc: '身与道合，法力无边', maxLevel: 9,
        breakthroughChance: 0.2, cost: { wood: 10000, steel: 500, scales: 100, teeth: 50 },
        bonus: { damage: 12, hp: 75, hit: 0.12, dodge: 0.12 } },
      { id: 'greatVehicle', name: '大乘', desc: '大乘圆满，半步飞升', maxLevel: 9,
        breakthroughChance: 0.1, cost: { wood: 20000, steel: 1000, scales: 200, teeth: 100, 'alien alloy': 10 },
        bonus: { damage: 18, hp: 100, hit: 0.15, dodge: 0.15 } },
      { id: 'tribulation', name: '渡劫', desc: '天劫降临，飞升在即', maxLevel: 1,
        breakthroughChance: 0.05, cost: { wood: 50000, steel: 2000, scales: 500, teeth: 200, 'alien alloy': 50 },
        bonus: { damage: 30, hp: 200, hit: 0.2, dodge: 0.2 } }
    ],

    _cultivationTimer: null,

    init: function() {
      if (!$SM.get('features.location.cultivation')) {
        return;
      }
      this.tab = Header.addLocation('修炼', 'cultivation', Cultivation, 'outside');
      this.panel = $('<div>').attr('id', 'cultivationPanel')
        .addClass('location')
        .appendTo('div#locationSlider');
      Engine.updateSlider();

      var content = $('<div>').attr('id', 'cultivationContent').appendTo(this.panel);

      $('<div>').attr('id', 'realmDisplay').appendTo(content);
      $('<div>').attr('id', 'cultivationProgress').appendTo(content);

      var btnRow = $('<div>').addClass('buttonRow').appendTo(content);
      $('<div>').addClass('button').attr('id', 'cultivateBtn')
        .text('修炼').click(Cultivation.cultivate).appendTo(btnRow);
      $('<div>').addClass('button').attr('id', 'breakthroughBtn')
        .text('突破').click(Cultivation.attemptBreakthrough).appendTo(btnRow);

      $('<div>').attr('id', 'realmBonuses').appendTo(content);

      $.Dispatch('stateUpdate').subscribe(Cultivation.handleStateUpdates);

      this.startTimer();
      this.updateView();
    },

    startTimer: function() {
      if (this._cultivationTimer) {
        clearInterval(this._cultivationTimer);
      }
      this._cultivationTimer = Engine.setInterval(function() {
        Cultivation.tick();
      }, this._UPDATE_INTERVAL);
    },

    stopTimer: function() {
      if (this._cultivationTimer) {
        clearInterval(this._cultivationTimer);
        this._cultivationTimer = null;
      }
    },

    tick: function() {
      var currentRealm = this.getCurrentRealm();
      if (!currentRealm) return;

      var progress = $SM.get('character.cultivation.progress', true) || 0;
      var realmIndex = this.getRealmIndex();
      var rate = 1 + (realmIndex * 0.5);

      if ($SM.hasPerk('mixedRoot1')) {
        rate *= 1.15;
      }

      if ($SM.get('game.buildings["trading post"]', true) > 0) {
        rate *= 1.2;
      }

      if (typeof Economy !== 'undefined') {
        rate *= Economy.getCultivationRate();
      }

      if (typeof Companion !== 'undefined') {
        rate *= Companion.getCombatBonus().expBonus;
      }

      progress += rate;
      $SM.set('character.cultivation.progress', progress);
      this.updateView();
    },

    getCurrentRealm: function() {
      var realmId = $SM.get('character.cultivation.realm') || 'qiRefining';
      for (var i = 0; i < this.Realms.length; i++) {
        if (this.Realms[i].id === realmId) {
          return this.Realms[i];
        }
      }
      return this.Realms[0];
    },

    getRealmIndex: function() {
      var realmId = $SM.get('character.cultivation.realm') || 'qiRefining';
      for (var i = 0; i < this.Realms.length; i++) {
        if (this.Realms[i].id === realmId) {
          return i;
        }
      }
      return 0;
    },

    getRealmLevel: function() {
      return $SM.get('character.cultivation.level', true) || 1;
    },

    getProgressRequired: function() {
      var realmIndex = this.getRealmIndex();
      return 100 + (realmIndex * 50) + (this.getRealmLevel() * 20);
    },

    cultivate: function() {
      var progress = $SM.get('character.cultivation.progress', true) || 0;
      var required = this.getProgressRequired();
      if (progress >= required) {
        var level = this.getRealmLevel();
        var realm = this.getCurrentRealm();
        if (level < realm.maxLevel) {
          $SM.set('character.cultivation.level', level + 1);
          $SM.set('character.cultivation.progress', 0);
          Notifications.notify(Cultivation, '修炼突破！当前境界 ' + realm.name + ' 第' + (level + 1) + '层');
          this.applyBonuses();
          this.updateView();
        } else {
          Notifications.notify(Cultivation, '已达 ' + realm.name + ' 圆满，准备突破至下一境界！');
        }
      } else {
        Notifications.notify(Cultivation, '修炼不足，还需继续努力（' + Math.floor(progress) + '/' + required + '）');
      }
    },

    canBreakthrough: function() {
      var realm = this.getCurrentRealm();
      var level = this.getRealmLevel();
      var realmIndex = this.getRealmIndex();
      if (level < realm.maxLevel) return false;
      if (realmIndex >= this.Realms.length - 1) return false;
      var nextRealm = this.Realms[realmIndex + 1];
      var cost = nextRealm.cost;
      for (var resource in cost) {
        if (($SM.get('stores["' + resource + '"]', true) || 0) < cost[resource]) {
          return false;
        }
      }
      return true;
    },

    attemptBreakthrough: function() {
      if (!this.canBreakthrough()) {
        Notifications.notify(Cultivation, '条件不足，无法突破');
        return;
      }

      var realm = this.getCurrentRealm();
      var realmIndex = this.getRealmIndex();
      var nextRealm = this.Realms[realmIndex + 1];

      var cost = nextRealm.cost;
      for (var resource in cost) {
        $SM.add('stores["' + resource + '"]', -cost[resource]);
      }

      var chance = nextRealm.breakthroughChance;
      if ($SM.hasPerk('mixedRoot1')) chance += 0.05;

      if (Math.random() <= chance) {
        $SM.set('character.cultivation.realm', nextRealm.id);
        $SM.set('character.cultivation.level', 1);
        $SM.set('character.cultivation.progress', 0);

        if (nextRealm.id === 'foundation') {
          $SM.addPerk('foundationEstablished');
        } else if (nextRealm.id === 'goldenCore') {
          $SM.addPerk('goldenCoreFormed');
        } else if (nextRealm.id === 'tribulation') {
          $SM.addPerk('ascensionReady');
        }

        // 解锁天劫模块
        if (realmIndex + 1 >= 2 && !$SM.get('features.location.tribulation')) {
          $SM.set('features.location.tribulation', true);
          Tribulation.init();
        }
        // 解锁宗门模块
        if (realmIndex + 1 >= 2 && !$SM.get('features.location.sect') && $SM.get('game.buildings["trading post"]', true) > 0) {
          $SM.set('features.location.sect', true);
          Sect.init();
        }
        if (Engine.activeModule !== Room) Engine.updateSlider();

        this.applyBonuses();
        this.updateView();

        $('div#cultivationPanel').addClass('cultivation-breakthrough');
        setTimeout(function() {
          $('div#cultivationPanel').removeClass('cultivation-breakthrough');
        }, 1500);

        Notifications.notify(Cultivation, '突破成功！踏入 ' + nextRealm.name + ' 境界！');
      } else {
        // 护法殿减半惩罚
        var penalty = 1;
        if (typeof Tribulation !== 'undefined') penalty = Tribulation.getBreakthroughPenalty();
        $SM.set('character.cultivation.progress', Math.floor(($SM.get('character.cultivation.progress', true) || 0) * (1 - penalty * 0.5)));
        Notifications.notify(Cultivation, '突破失败！灵力涣散' + (penalty < 1 ? '（护法殿减免50%损失）' : '') + '。');
        this.updateView();
      }
    },

    applyBonuses: function() {
      var totalDamage = 0, totalHp = 0, totalHit = 0, totalDodge = 0;
      for (var i = 0; i <= this.getRealmIndex(); i++) {
        var realm = this.Realms[i];
        var level = (i === this.getRealmIndex()) ? this.getRealmLevel() : realm.maxLevel;
        totalDamage += realm.bonus.damage * level;
        totalHp += realm.bonus.hp * level;
        totalHit += realm.bonus.hit * level;
        totalDodge += realm.bonus.dodge * level;
      }
      $SM.set('character.cultivation.totalDamage', totalDamage);
      $SM.set('character.cultivation.totalHp', totalHp);
      $SM.set('character.cultivation.totalHit', totalHit);
      $SM.set('character.cultivation.totalDodge', totalDodge);
    },

    getBonusDamage: function() {
      return $SM.get('character.cultivation.totalDamage', true) || 0;
    },

    getBonusHp: function() {
      return $SM.get('character.cultivation.totalHp', true) || 0;
    },

    getBonusHit: function() {
      return $SM.get('character.cultivation.totalHit', true) || 0;
    },

    getBonusDodge: function() {
      return $SM.get('character.cultivation.totalDodge', true) || 0;
    },

    updateView: function() {
      var realm = this.getCurrentRealm();
      var level = this.getRealmLevel();
      var progress = $SM.get('character.cultivation.progress', true) || 0;
      var required = this.getProgressRequired();

      var display = realm.name + ' ' + this.getRealmLevel() + '/' + realm.maxLevel;
      var desc = realm.desc;
      var progressPct = Math.min(100, Math.floor((progress / required) * 100));

      $('#realmDisplay').html(
        '<div class="heading">' + display + '</div>' +
        '<div class="description">' + desc + '</div>'
      );

      if (level < realm.maxLevel) {
        $('#cultivationProgress').html(
          '<div class="progressBar"><div class="progressFill" style="width:' + progressPct + '%"></div></div>' +
          '<div class="progressText">修炼进度: ' + progressPct + '% (' + Math.floor(progress) + '/' + required + ')</div>'
        );
      } else {
        var canBreak = this.canBreakthrough();
        $('#cultivationProgress').html(
          '<div class="progressText">已达圆满' + (canBreak ? ' — 准备突破！' : ' — 资源不足') + '</div>'
        );
      }

      if (canBreakthrough()) {
        $('#breakthroughBtn').css('opacity', 1);
      } else {
        $('#breakthroughBtn').css('opacity', 0.5);
      }

      var bonuses = '';
      for (var i = 0; i <= this.getRealmIndex(); i++) {
        var r = this.Realms[i];
        var lvl = (i === this.getRealmIndex()) ? level : r.maxLevel;
        if (lvl > 0) {
          bonuses += '<div class="realmBonusRow">' + r.name + ' Lv.' + lvl +
            ' 攻击+' + (r.bonus.damage * lvl) +
            ' HP+' + (r.bonus.hp * lvl) +
            (r.bonus.hit > 0 ? ' 命中+' + (r.bonus.hit * lvl) : '') +
            (r.bonus.dodge > 0 ? ' 闪避+' + (r.bonus.dodge * lvl) : '') +
            '</div>';
        }
      }
      $('#realmBonuses').html('<div class="heading" style="margin-top:10px">境界加成</div>' + bonuses);
    },

    handleStateUpdates: function(e) {
      if (e.category === 'cultivation') {
        Cultivation.updateView();
      }
    },

    onArrival: function() {
      this.updateView();
    }
  };
})();
