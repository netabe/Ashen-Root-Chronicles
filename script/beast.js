(function() {
  var Beast = window.Beast = {

    TILE: {
      BEAST_LAIR: 'B',
      VOID_RIFT: 'V'
    },

    Beasts: [
      { id: 'windWolf', name: '妖兽·风狼', chara: 'W', hp: 40, damage: 6, hit: 0.75, attackDelay: 2, ranged: false, reward: { wood: 100, meat: 30, fur: 20, teeth: 3 } },
      { id: 'fireSerpent', name: '妖兽·火蟒', chara: 'S', hp: 55, damage: 9, hit: 0.75, attackDelay: 2, ranged: false, specials: [{ delay: 5, action: 'venomous' }], reward: { wood: 150, scales: 10, coal: 15, teeth: 5 } },
      { id: 'stoneTurtle', name: '妖兽·石甲龟', chara: 'T', hp: 100, damage: 7, hit: 0.6, attackDelay: 3, ranged: false, reward: { wood: 200, scales: 20, iron: 25, teeth: 5 } },
      { id: 'thunderEagle', name: '妖兽·雷鹰', chara: 'E', hp: 70, damage: 12, hit: 0.85, attackDelay: 1.5, ranged: true, reward: { wood: 200, fur: 30, teeth: 8, 'alien alloy': 1 } },
      { id: 'iceSerpent', name: '妖兽·玄冰蛟', chara: 'S', hp: 130, damage: 15, hit: 0.8, attackDelay: 2, ranged: false, specials: [{ delay: 6, action: 'boost' }], reward: { wood: 300, scales: 30, steel: 20, teeth: 10 } },
      { id: 'goldenRoc', name: '妖兽·金翅鹏', chara: 'R', hp: 90, damage: 18, hit: 0.9, attackDelay: 1, ranged: true, reward: { wood: 300, fur: 40, teeth: 12, 'alien alloy': 2 } },
      { id: 'nineTail', name: '妖兽·九尾狐', chara: 'F', hp: 100, damage: 14, hit: 0.85, attackDelay: 1.5, ranged: false, specials: [{ delay: 4, action: 'shield' }], reward: { wood: 400, scales: 25, teeth: 12, 'alien alloy': 2 } },
      { id: 'blackDragon', name: '妖兽·墨鳞龙', chara: 'D', hp: 200, damage: 20, hit: 0.85, attackDelay: 1.5, ranged: false, specials: [{ delay: 8, action: 'enraged' }], reward: { wood: 500, scales: 50, teeth: 20, 'alien alloy': 5 } }
    ],

    _currentBeastIndex: -1,

    init: function() {
      if (!$SM.get('features.location.world')) return;
    },

    getVoidRiftLevel: function() {
      return $SM.get('character.voidRift.level', true) || 1;
    },

    getBeastKills: function() {
      return $SM.get('character.beast.kills', true) || 0;
    },

    _addKill: function() {
      var k = this.getBeastKills() + 1;
      $SM.set('character.beast.kills', k);
    },

    setVoidRiftLevel: function(level) {
      $SM.set('character.voidRift.level', level);
    },

    getVoidRiftProgress: function() {
      return $SM.get('character.voidRift.progress', true) || 0;
    },

    addVoidRiftProgress: function(amount) {
      var progress = this.getVoidRiftProgress() + amount;
      var level = this.getVoidRiftLevel();
      var required = 50 + (level * 30);
      if (progress >= required) {
        progress -= required;
        this.setVoidRiftLevel(level + 1);
        Notifications.notify(Beast, '虚空裂隙扩大！当前等级 ' + (level + 1));
        if (level + 1 >= 10) {
          $SM.addPerk('voidWalker');
          Notifications.notify(Beast, '虚空之力觉醒，获得称号「虚空行者」');
        }
      }
      $SM.set('character.voidRift.progress', progress);
    },

    fightBeast: function(beastIndex) {
      var beast = Beast.Beasts[beastIndex];
      if (!beast) return;

      Beast._currentBeastIndex = beastIndex;

      var loot = {};
      for (var k in beast.reward) {
        loot[k] = { min: Math.max(1, Math.floor(beast.reward[k] * 0.5)), max: beast.reward[k], chance: 1 };
      }

      var scene = {
        title: '妖兽巢穴',
        scenes: {
          start: {
            text: ['发现妖兽巢穴！一头 ' + beast.name + ' 守护着财宝。'],
            buttons: {
              '猎杀': {
                nextScene: 'combat'
              },
              '离开': {
                nextScene: 'end'
              }
            }
          },
          combat: {
            combat: true,
            notification: '与 ' + beast.name + ' 战斗！',
            enemy: beast.name,
            enemyName: beast.name,
            damage: beast.damage,
            hit: beast.hit,
            attackDelay: beast.attackDelay,
            health: beast.hp,
            chara: beast.chara,
            ranged: beast.ranged || false,
            specials: beast.specials || [],
            loot: loot,
            buttons: {
              '搜刮战利品': {
                text: '搜刮战利品',
                nextScene: 'victory'
              }
            }
          },
          victory: {
            text: ['击败了 ' + beast.name + '！获得了丰厚的战利品。'],
            notification: '妖兽剿灭',
            onLoad: function() {
              Beast.addVoidRiftProgress(beast.damage);
              Beast._addKill();
              if (Math.random() < 0.15) {
                var eggKeys = ['fireFoxEgg','frostSpiderEgg','thunderEagleEgg','shadowSerpentEgg','jadeTurtleEgg','stormTigerEgg'];
                var rEgg = eggKeys[Math.floor(Math.random() * eggKeys.length)];
                if (typeof Pet !== 'undefined') Pet.addEgg(rEgg);
              }
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

    enterVoidRift: function() {
      var level = this.getVoidRiftLevel();
      var hp = Math.min(level * 10 + 50, 300);
      var dmg = Math.min(level * 3 + 10, 60);
      var hit = Math.min(0.6 + level * 0.03, 0.9);

      var scene = {
        title: '虚空裂隙 Lv.' + level,
        scenes: {
          start: {
            text: ['踏入虚空裂隙，周围的空间扭曲变形...一股强大的虚空之力袭来。'],
            buttons: {
              '迎战': {
                nextScene: 'combat'
              },
              '退出': {
                nextScene: 'end'
              }
            }
          },
          combat: {
            combat: true,
            notification: '虚空生物出现！',
            enemy: '虚空生物',
            enemyName: '虚空生物',
            damage: dmg,
            hit: hit,
            attackDelay: 2,
            health: hp,
            chara: 'V',
            ranged: false,
            specials: [],
            loot: {
              'alien alloy': { min: Math.max(1, Math.floor(level / 2)), max: level, chance: 0.5 },
              'scales': { min: level, max: level * 3, chance: 0.7 }
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
    }
  };
})();
