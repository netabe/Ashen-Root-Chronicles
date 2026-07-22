(function() {
  var Tribulation = window.Tribulation = {

    Tribulations: [
      { realm: '金丹', name: '三九天劫', waves: 3, baseHP: 80, baseDmg: 10, rewards: { spiritStone: 50, exp: 30 } },
      { realm: '元婴', name: '六九天劫', waves: 6, baseHP: 150, baseDmg: 20, rewards: { spiritStone: 120, exp: 60 } },
      { realm: '化神', name: '九天神雷', waves: 9, baseHP: 280, baseDmg: 35, rewards: { spiritStone: 250, exp: 100 } },
      { realm: '合体', name: '混沌天火', waves: 12, baseHP: 500, baseDmg: 55, rewards: { spiritStone: 500, exp: 180 } },
      { realm: '大乘', name: '心魔劫', waves: 15, baseHP: 900, baseDmg: 80, rewards: { spiritStone: 1000, exp: 300 } },
      { realm: '渡劫', name: '飞升大劫', waves: 20, baseHP: 1500, baseDmg: 120, rewards: { spiritStone: 3000, exp: 500 } }
    ],

    _active: false,
    _currentWave: 0,
    _totalWaves: 0,
    _targetRealm: null,

    init: function() {
      if (!$SM.get('features.location.tribulation')) return;
      this.tab = Header.addLocation('天劫', 'tribulation', Tribulation, 'outside');
      this.panel = $('<div>').attr('id', 'tribulationPanel').addClass('location').appendTo('div#locationSlider');
      Engine.updateSlider();

      var inner = $('<div>').attr('id', 'tribulationContent').appendTo(this.panel);

      $('<div>').attr('id', 'tribPending').appendTo(inner);
      $('<div>').attr('id', 'tribActive').hide().appendTo(inner);
      $('<div>').attr('id', 'tribHistory').attr('data-legend', '渡劫记录：').appendTo(inner);

      this.updateView();
    },

    getTribData: function(realmName) {
      for (var i = 0; i < Tribulation.Tribulations.length; i++) {
        if (Tribulation.Tribulations[i].realm === realmName) return Tribulation.Tribulations[i];
      }
      return null;
    },

    hasReachedRealm: function(realmName) {
      if (!window.Cultivation) return false;
      var idx = Cultivation.Realms.findIndex(function(r) { return r.name === realmName; });
      var current = (Cultivation.currentIdx || Cultivation.getRealmIndex) ? (Cultivation.currentIdx !== undefined ? Cultivation.currentIdx : Cultivation.getRealmIndex()) : 0;
      return current >= idx;
    },

    isCompleted: function(realmName) {
      return !!$SM.get('character.tribulation.completed["' + realmName + '"]', true);
    },

    needTribulation: function(realmName) {
      return Tribulation.hasReachedRealm(realmName) && !Tribulation.isCompleted(realmName);
    },

    start: function(realmName) {
      var data = Tribulation.getTribData(realmName);
      if (!data) return;
      if (this._active) return Notifications.notify(Tribulation, '天劫已经开始！');

      this._active = true;
      this._currentWave = 1;
      this._totalWaves = data.waves;
      this._targetRealm = realmName;

      Notifications.notify(Tribulation, data.name + '降临！准备渡劫！');
      this._spawnWave(data);
      this.updateView();
    },

    _spawnWave: function(data) {
      var w = this._currentWave;
      var hp = data.baseHP + w * 30 + Math.floor(Math.random() * 20);
      var dmg = data.baseDmg + w * 5 + Math.floor(Math.random() * 10);
      var levelMulti = (1 + w * 0.15);

      var enemyData = {
        name: data.name + ' 第' + w + '波',
        hp: Math.floor(hp * levelMulti),
        attack: Math.floor(dmg * levelMulti),
        isTribulation: true
      };
      this._currentEnemy = enemyData;

      var scene = {
        title: '天劫降临',
        notification: '第' + w + '/' + data.totalWaves + '波天劫来袭！',
        combat: true,
        enemy: enemyData,
        onWin: { notification: '抵挡了第' + w + '波天劫！', onLoad: 'Tribulation._onWaveWin' },
        onLose: { notification: '天劫之力过于强大！' }
      };
      Events.startEvent(Tribulation, scene);
    },

    _onWaveWin: function() {
      var self = window.Tribulation;
      var w = self._currentWave;
      if (w >= self._totalWaves) {
        var data = self.getTribData(self._targetRealm);
        if (data) {
          if (Economy && Economy.getSpiritStone) {
            $SM.add('stores.spiritStone', data.rewards.spiritStone);
          }
          if (Alchemy && Alchemy._addExp) {
          }
          $SM.set('character.tribulation.completed["' + self._targetRealm + '"]', true);
          Notifications.notify(Tribulation, '渡劫成功！获得灵石x' + data.rewards.spiritStone + '！');
          self._active = false;
          self._targetRealm = null;
          self.updateView();
          Engine.leaveRoom();
        }
      } else {
        self._currentWave++;
        self.updateView();
        setTimeout(function() {
          Engine.leaveRoom();
          setTimeout(function() {
            var d = self.getTribData(self._targetRealm);
            if (d) self._spawnWave(d);
          }, 800);
        }, 600);
      }
    },

    onEnemyDeath: function() {
      if (!this._active) return;
    },

    onPlayerDeath: function() {
      if (this._active) {
        this._active = false;
        this._targetRealm = null;
        Notifications.notify(Tribulation, '渡劫失败！请提升实力后再尝试。');
        this.updateView();
      }
    },

    getBreakthroughPenalty: function() {
      var count = Economy && Economy.getSpiritStone ?
        ($SM.get('character.economy.guardianShrine', true) || 0) : 0;
      return count > 0 ? 0.5 : 1;
    },

    updateView: function() {
      var content = $('#tribulationContent');
      if (!content.length) return;

      var pending = $('#tribPending');
      pending.empty();
      $('<div>').addClass('heading').text('可渡劫').appendTo(pending);

      for (var i = 0; i < Tribulation.Tribulations.length; i++) {
        var t = Tribulation.Tribulations[i];
        var row = $('<div>').addClass('ecoRow');
        var realm = $('<div>').addClass('row_key').text(t.name).appendTo(row);
        $('<div>').addClass('row_val').text(t.realm + '期触发 | ' + t.waves + '波').appendTo(row);

        if (Tribulation.isCompleted(t.realm)) {
          $('<div>').addClass('row_val').css('color', '#27ae60').text('已渡劫').appendTo(row);
        } else if (Tribulation.needTribulation(t.realm) && !this._active) {
          $('<div>').addClass('button buildBtn').text('渡劫').click(function(r) {
            return function() { Tribulation.start(r); };
          }(t.realm)).appendTo(row);
        } else if (!Tribulation.hasReachedRealm(t.realm)) {
          $('<div>').addClass('row_val').text('境界不足').appendTo(row);
        }
        pending.append(row);
      }

      if (this._active) {
        $('#tribActive').show().html(
          '<div class="heading">天劫进行中</div>' +
          '<div class="description">' + this._targetRealm + '期天劫：第' + this._currentWave + '/' + this._totalWaves + '波</div>'
        );
      } else {
        $('#tribActive').hide();
      }

      var history = $('#tribHistory');
      history.empty();
      var completed = false;
      for (var j = 0; j < Tribulation.Tribulations.length; j++) {
        if (Tribulation.isCompleted(Tribulation.Tribulations[j].realm)) {
          completed = true;
          $('<div>').text(Tribulation.Tribulations[j].name + ' - 已完成').appendTo(history);
        }
      }
      if (!completed) $('<div>').text('暂无渡劫记录').appendTo(history);
    },

    onArrival: function() {
      this.updateView();
    }
  };
})();
