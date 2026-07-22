(function() {
  var Abyss = window.Abyss = {

    _TODAY_KEY: 'abyss_today',
    _MAX_ENTRIES: 1,
    _active: false,
    _currentFloor: 0,
    _bestFloor: 0,
    _rewards: {},

    init: function() {
      if (!$SM.get('features.location.abyss')) return;
      this.tab = Header.addLocation('深渊', 'abyss', Abyss, 'outside');
      this.panel = $('<div>').attr('id', 'abyssPanel').addClass('location').appendTo('div#locationSlider');
      Engine.updateSlider();

      var inner = $('<div>').attr('id', 'abyssContent').appendTo(this.panel);

      $('<div>').attr('id', 'abyssInfo').appendTo(inner);
      $('<div>').attr('id', 'abyssProgress').hide().appendTo(inner);
      $('<div>').attr('id', 'abyssHistory').attr('data-legend', '深渊记录：').appendTo(inner);

      this._bestFloor = $SM.get('character.abyss.bestFloor', true) || 0;

      this.updateView();
    },

    _getTodayKey: function() {
      var d = new Date();
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    },

    getEntriesRemaining: function() {
      var today = Abyss._getTodayKey();
      var stored = $SM.get('character.abyss.dayKey', true);
      if (stored !== today) return Abyss._MAX_ENTRIES;
      var used = $SM.get('character.abyss.usedToday', true) || 0;
      return Math.max(0, Abyss._MAX_ENTRIES - used);
    },

    start: function() {
      if (this._active) return Notifications.notify(Abyss, '已在深渊中！');
      if (this.getEntriesRemaining() <= 0) return Notifications.notify(Abyss, '今日深渊次数已用完！');

      this._active = true;
      this._currentFloor = 1;
      this._rewards = {};

      var today = this._getTodayKey();
      $SM.set('character.abyss.dayKey', today);
      $SM.set('character.abyss.usedToday', ($SM.get('character.abyss.usedToday', true) || 0) + 1);

      Notifications.notify(Abyss, '进入万妖窟深渊！');

      this.updateView();
      this._spawnFloor();
    },

    _spawnFloor: function() {
      if (!this._active) return;
      var f = this._currentFloor;

      var hp = 50 + f * 40 + Math.floor(Math.random() * f * 20);
      var atk = 10 + f * 5 + Math.floor(Math.random() * f * 3);
      var evade = Math.min(f * 2, 30);

      var scene = {
        title: '深渊第' + f + '层',
        notification: '第' + f + '层·深渊怪物来袭！',
        combat: true,
        enemy: { name: '深渊异兽(Lv.' + f + ')', hp: hp, attack: atk, evade: evade },
        r: { spiritStone: 10 + f * 5, wood: 1 + f, iron: 1 + Math.floor(f / 2), steel: Math.max(0, Math.floor(f / 5)) },
        onWin: { onLoad: 'Abyss._onFloorWin' },
        onLose: { onLoad: 'Abyss._onFloorLose' }
      };
      Events.startEvent(Abyss, scene);
    },

    _onFloorWin: function() {
      var self = window.Abyss;
      self._currentFloor++;

      var f = self._currentFloor - 1;
      if (Economy && Economy.getSpiritStone) {
        Economy.spendSpiritStone(-(10 + f * 5));
      }
      $SM.add('stores.wood', 1 + f);
      $SM.add('stores.iron', 1 + Math.floor(f / 2));
      if (f >= 5) $SM.add('stores.steel', Math.floor(f / 5));

      if (f >= 5 && Math.random() < 0.1) {
        Pet.addEgg(['fireFoxEgg','frostSpiderEgg','thunderEagleEgg','shadowSerpentEgg','jadeTurtleEgg','stormTigerEgg'][Math.floor(Math.random()*6)]);
      }

      self.updateView();

      setTimeout(function() {
        Engine.leaveRoom();
        setTimeout(function() { self._spawnFloor(); }, 600);
      }, 400);
    },

    _onFloorLose: function() {
      var self = window.Abyss;
      var f = self._currentFloor - 1;
      self._active = false;

      if (f > self._bestFloor) {
        self._bestFloor = f;
        $SM.set('character.abyss.bestFloor', f);
      }

      Notifications.notify(Abyss, '在深渊第' + f + '层倒下！请提升实力后再来挑战。');
      self.updateView();
    },

    escape: function() {
      if (!this._active) return;
      var f = this._currentFloor - 1;
      this._active = false;

      if (f > (this._bestFloor || 0)) {
        this._bestFloor = f;
        $SM.set('character.abyss.bestFloor', f);
      }

      Notifications.notify(Abyss, '使用回城玉符离开深渊。到达第' + f + '层。');
      this.updateView();
    },

    updateView: function() {
      var content = $('#abyssContent');
      if (!content.length) return;

      var info = $('#abyssInfo');
      info.empty();
      $('<div>').addClass('heading').text('万妖窟·无尽深渊').appendTo(info);
      $('<div>').addClass('description').text('逐层深入，无尽挑战。每日限进' + Abyss._MAX_ENTRIES + '次。').appendTo(info);

      if (!Abyss._active) {
        if (Abyss.getEntriesRemaining() > 0) {
          $('<div>').addClass('button buildBtn').css({'padding': '10px 30px', 'fontSize': '1.1em'}).text('进入深渊').click(Abyss.start).appendTo(info);
        } else {
          $('<div>').addClass('row_val').text('今日次数已用完，明天再来！').appendTo(info);
        }
      } else {
        $('<div>').addClass('button buildBtn').css('background', '#e74c3c').text('回城玉符（退出）').click(Abyss.escape).appendTo(info);
      }

      var prog = $('#abyssProgress');
      if (Abyss._active) {
        prog.show().html(
          '<div class="description" style="font-size:1.2em;color:#ff6600">深渊探索中 — 当前层数：' + Abyss._currentFloor + '</div>'
        );
      } else {
        prog.hide();
      }

      var hist = $('#abyssHistory');
      hist.empty();
      $('<div>').text('历史最佳：' + (Abyss._bestFloor || 0) + '层').appendTo(hist);
      var todayUsed = $SM.get('character.abyss.usedToday', true) || 0;
      $('<div>').text('今日已挑战：' + todayUsed + '/' + Abyss._MAX_ENTRIES + '次').appendTo(hist);
    },

    onArrival: function() {
      this.updateView();
    }
  };
})();
