(function() {
  var SecretRealm = window.SecretRealm = {

    LAYER_COUNT: 10,

    LayerEnemies: [
      { id: 'stoneGolem', name: '石傀儡', chara: 'G', hp: 30, damage: 5, hit: 0.7, attackDelay: 3, ranged: false, reward: { wood: 100, iron: 10 } },
      { id: 'ghostSoldier', name: '幽冥鬼卒', chara: 'S', hp: 40, damage: 7, hit: 0.7, attackDelay: 2.5, ranged: false, reward: { wood: 150, fur: 15 } },
      { id: 'frostWolf', name: '冰霜妖狼', chara: 'W', hp: 50, damage: 9, hit: 0.75, attackDelay: 2.5, ranged: false, reward: { wood: 200, meat: 20, fur: 20 } },
      { id: 'flameSerpent', name: '赤炎蛇', chara: 'S', hp: 65, damage: 11, hit: 0.75, attackDelay: 2, ranged: false, specials: [{ delay: 5, action: 'venomous' }], reward: { wood: 300, coal: 20, scales: 5 } },
      { id: 'goldenWarrior', name: '金甲力士', chara: 'W', hp: 80, damage: 13, hit: 0.8, attackDelay: 2, ranged: false, reward: { wood: 400, iron: 30, steel: 5 } },
      { id: 'soulDemon', name: '摄魂妖', chara: 'D', hp: 100, damage: 12, hit: 0.85, attackDelay: 2, ranged: false, specials: [{ delay: 4, action: 'boost' }], reward: { wood: 500, steel: 15, scales: 10 } },
      { id: 'shuraGeneral', name: '修罗战将', chara: 'G', hp: 130, damage: 18, hit: 0.8, attackDelay: 1.5, ranged: false, reward: { wood: 600, steel: 25, teeth: 10 } },
      { id: 'ancientBeast', name: '太古凶兽', chara: 'B', hp: 180, damage: 22, hit: 0.85, attackDelay: 1.5, ranged: false, specials: [{ delay: 6, action: 'enraged' }], reward: { wood: 800, steel: 40, scales: 20, teeth: 15 } },
      { id: 'voidDevourer', name: '虚空吞噬者', chara: 'V', hp: 250, damage: 25, hit: 0.9, attackDelay: 1.5, ranged: false, specials: [{ delay: 7, action: 'shield' }], reward: { wood: 1000, 'alien alloy': 2, scales: 30, teeth: 20 } },
      { id: 'reincarnationLord', name: '轮回之主', chara: '@', hp: 400, damage: 30, hit: 0.9, attackDelay: 1, ranged: false, specials: [{ delay: 5, action: 'shield' }, { delay: 10, action: 'enraged' }], reward: { wood: 2000, 'alien alloy': 5, steel: 100, scales: 50, teeth: 30 } }
    ],

    init: function() {
      if (!$SM.get('features.location.secretRealm')) {
        return;
      }
      this.tab = Header.addLocation('秘境', 'secretRealm', SecretRealm, 'fabricator');
      this.panel = $('<div>').attr('id', 'secretRealmPanel')
        .addClass('location')
        .appendTo('div#locationSlider');
      Engine.updateSlider();

      $('<div>').attr('id', 'secretRealmContent').appendTo(this.panel);
      this.updateView();
    },

    getCurrentLayer: function() {
      return $SM.get('character.secretRealm.layer', true) || 1;
    },

    setCurrentLayer: function(layer) {
      $SM.set('character.secretRealm.layer', Math.min(layer, SecretRealm.LAYER_COUNT));
    },

    enterLayer: function(layer) {
      if (layer < 1 || layer > SecretRealm.LAYER_COUNT) return;

      var enemy = SecretRealm.LayerEnemies[layer - 1];

      var scene = {
        title: '秘境第' + layer + '层',
        scenes: {
          start: {
            text: ['踏入秘境，一股远古气息扑面而来...守关者现出身形。'],
            buttons: {
              '迎战': {
                nextScene: 'combat'
              },
              '撤退': {
                nextScene: 'end'
              }
            }
          },
          combat: {
            combat: true,
            notification: '与 ' + enemy.name + ' 交战！',
            enemy: enemy.name,
            enemyName: enemy.name,
            damage: enemy.damage,
            hit: enemy.hit,
            attackDelay: enemy.attackDelay,
            health: enemy.hp,
            chara: enemy.chara,
            ranged: enemy.ranged || false,
            specials: enemy.specials || [],
            loot: (function(r) {
              var loot = {};
              for (var k in r) {
                loot[k] = { min: Math.max(1, Math.floor(r[k] * 0.5)), max: r[k], chance: 1 };
              }
              return loot;
            })(enemy.reward),
            buttons: {
              '领取奖励': {
                text: '领取奖励',
                nextScene: 'reward'
              }
            }
          },
          reward: {
            text: ['击败守关者！获得了丰厚奖励。'],
            notification: '通关秘境第' + layer + '层',
            onLoad: function() {
              var cur = SecretRealm.getCurrentLayer();
              SecretRealm.setCurrentLayer(cur + 1);
              var prevCleared = $SM.get('character.secretRealm.highestCleared', true) || 0;
              if (layer > prevCleared) {
                $SM.set('character.secretRealm.highestCleared', layer);
              }
              if (layer >= SecretRealm.LAYER_COUNT) {
                $SM.addPerk('realmConqueror');
                Notifications.notify(SecretRealm, '通关所有秘境！获得称号「轮回征服者」');
              }
              SecretRealm.updateView();
            },
            buttons: {
              '返回': {
                text: '返回',
                nextScene: 'end'
              }
            }
          }
        }
      };

      Events.startEvent(scene);
    },

    updateView: function() {
      var content = $('#secretRealmContent');
      if (!content.length) return;
      content.empty();

      var currentLayer = this.getCurrentLayer();

      $('<div>').addClass('heading').text('万古秘境').appendTo(content);
      $('<div>').addClass('description').text('远古修士留下的试炼之地，每层都有强大的守关者').appendTo(content);

      var progress = $('<div>').addClass('secretRealmProgress').appendTo(content);
      $('<div>').text('当前层数: ' + currentLayer + '/' + SecretRealm.LAYER_COUNT).appendTo(progress);

      var bar = $('<div>').addClass('progressBar').appendTo(progress);
      $('<div>').addClass('progressFill').css('width', (currentLayer / SecretRealm.LAYER_COUNT * 100) + '%').appendTo(bar);

      if (currentLayer <= SecretRealm.LAYER_COUNT) {
        var enemy = SecretRealm.LayerEnemies[currentLayer - 1];
        var enemyDiv = $('<div>').addClass('secretRealmEnemy').appendTo(content);
        $('<div>').addClass('heading').text('守关者: ' + enemy.name).appendTo(enemyDiv);
        $('<div>').text('HP: ' + enemy.hp + ' | 攻击: ' + enemy.damage + ' | 命中: ' + Math.round(enemy.hit * 100) + '%').appendTo(enemyDiv);

        $('<div>').addClass('button').text('挑战第' + currentLayer + '层').click(function() {
          SecretRealm.enterLayer(currentLayer);
        }).appendTo(content);
      } else {
        $('<div>').text('秘境已全部通关！获得称号「轮回征服者」').appendTo(content);
      }
    },

    onArrival: function() {
      this.updateView();
    }
  };
})();
