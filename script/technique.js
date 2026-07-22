(function() {
  var Technique = window.Technique = {

    Techniques: {
      'qiGathering': {
        name: '引气诀',
        desc: '基础功法，提升修炼效率',
        realmRequired: 'qiRefining',
        levelRequired: 1,
        cost: { wood: 100 },
        effect: 'cultivationRate',
        effectValue: 1.2,
        maxLevel: 5
      },
      'ironBodyArt': {
        name: '铁骨功',
        desc: '淬炼筋骨，提升生命上限',
        realmRequired: 'qiRefining',
        levelRequired: 3,
        cost: { wood: 200, iron: 20 },
        effect: 'hpBonus',
        effectValue: 10,
        maxLevel: 5
      },
      'swiftStep': {
        name: '疾风步',
        desc: '提升闪避能力',
        realmRequired: 'foundation',
        levelRequired: 1,
        cost: { wood: 300, fur: 30 },
        effect: 'dodgeBonus',
        effectValue: 0.03,
        maxLevel: 5
      },
      'spiritEye': {
        name: '灵目术',
        desc: '提升命中率',
        realmRequired: 'foundation',
        levelRequired: 3,
        cost: { wood: 400, scales: 5 },
        effect: 'hitBonus',
        effectValue: 0.03,
        maxLevel: 5
      },
      'flameBlade': {
        name: '烈焰斩',
        desc: '火焰之力附着兵器，增加攻击伤害',
        realmRequired: 'goldenCore',
        levelRequired: 1,
        cost: { wood: 500, coal: 50, steel: 10 },
        effect: 'damageBonus',
        effectValue: 5,
        maxLevel: 5
      },
      'turtleShell': {
        name: '玄龟甲',
        desc: '真气护体，减少受到的伤害',
        realmRequired: 'goldenCore',
        levelRequired: 3,
        cost: { wood: 600, scales: 15, steel: 20 },
        effect: 'damageReduction',
        effectValue: 2,
        maxLevel: 5
      },
      'thunderStrike': {
        name: '雷霆一击',
        desc: '蓄力一击，暴击时造成额外伤害',
        realmRequired: 'nascentSoul',
        levelRequired: 1,
        cost: { wood: 800, sulphur: 30, steel: 30 },
        effect: 'critChance',
        effectValue: 0.1,
        maxLevel: 5
      },
      'voidStep': {
        name: '虚空步',
        desc: '身融虚空，移动不再消耗资源',
        realmRequired: 'spiritTransfo',
        levelRequired: 1,
        cost: { wood: 1500, 'alien alloy': 2, scales: 20 },
        effect: 'noMoveCost',
        effectValue: 1,
        maxLevel: 1
      },
      'heavenlyShield': {
        name: '天罡护体',
        desc: '凝聚天地灵气形成护盾',
        realmRequired: 'bodyIntegration',
        levelRequired: 1,
        cost: { wood: 3000, steel: 100, scales: 50, 'alien alloy': 5 },
        effect: 'shield',
        effectValue: 30,
        maxLevel: 3
      },
      'daoEnlightenment': {
        name: '道法自然',
        desc: '悟道之境，大幅提升修炼速度',
        realmRequired: 'greatVehicle',
        levelRequired: 1,
        cost: { wood: 5000, steel: 200, teeth: 50, 'alien alloy': 10 },
        effect: 'cultivationRate',
        effectValue: 2.0,
        maxLevel: 3
      }
    },

    init: function() {
      if (!this.isUnlocked()) return;
      this.tab = Header.addLocation('功法', 'technique', Technique, 'ship');
      this.panel = $('<div>').attr('id', 'techniquePanel')
        .addClass('location')
        .appendTo('div#locationSlider');
      Engine.updateSlider();

      $('<div>').attr('id', 'techniqueContent').appendTo(this.panel);
      $.Dispatch('stateUpdate').subscribe(Technique.handleStateUpdates);
      this.updateView();
    },

    isUnlocked: function() {
      return $SM.get('features.location.cultivation') &&
             $SM.get('character.cultivation.realm');
    },

    getTechniqueLevel: function(techId) {
      return $SM.get('character.techniques["' + techId + '"]', true) || 0;
    },

    canLearn: function(techId) {
      var tech = Technique.Techniques[techId];
      if (!tech) return false;

      var currentLevel = this.getTechniqueLevel(techId);
      if (currentLevel >= tech.maxLevel) return false;

      var currentRealm = $SM.get('character.cultivation.realm');
      var realmIndex = -1;
      var techRealmIndex = -1;
      for (var i = 0; i < Cultivation.Realms.length; i++) {
        if (Cultivation.Realms[i].id === currentRealm) realmIndex = i;
        if (Cultivation.Realms[i].id === tech.realmRequired) techRealmIndex = i;
      }
      if (realmIndex < techRealmIndex) return false;

      var currentLevelInRealm = $SM.get('character.cultivation.level', true) || 1;
      if (realmIndex === techRealmIndex && currentLevelInRealm < tech.levelRequired) return false;

      var cost = {};
      var costMult = 1 + currentLevel;
      for (var resource in tech.cost) {
        cost[resource] = Math.floor(tech.cost[resource] * costMult);
      }
      for (resource in cost) {
        if (($SM.get('stores["' + resource + '"]', true) || 0) < cost[resource]) {
          return false;
        }
      }
      return true;
    },

    learn: function(techId) {
      if (!this.canLearn(techId)) return;

      var tech = Technique.Techniques[techId];
      var currentLevel = this.getTechniqueLevel(techId);
      var cost = {};
      var costMult = 1 + currentLevel;
      for (var resource in tech.cost) {
        cost[resource] = Math.floor(tech.cost[resource] * costMult);
        $SM.add('stores["' + resource + '"]', -cost[resource]);
      }

      $SM.set('character.techniques["' + techId + '"]', currentLevel + 1);

      Notifications.notify(Technique, '领悟 ' + tech.name + ' Lv.' + (currentLevel + 1) + '/' + tech.maxLevel);
      this.updateView();
    },

    getEffectSum: function(effectType) {
      var sum = 0;
      for (var techId in Technique.Techniques) {
        var tech = Technique.Techniques[techId];
        if (tech.effect === effectType) {
          var level = this.getTechniqueLevel(techId);
          sum += tech.effectValue * level;
        }
      }
      return sum;
    },

    getDamageBonus: function() {
      return this.getEffectSum('damageBonus');
    },

    getHpBonus: function() {
      return this.getEffectSum('hpBonus');
    },

    getHitBonus: function() {
      return this.getEffectSum('hitBonus');
    },

    getDodgeBonus: function() {
      return this.getEffectSum('dodgeBonus');
    },

    getDamageReduction: function() {
      return this.getEffectSum('damageReduction');
    },

    getCritChance: function() {
      return this.getEffectSum('critChance');
    },

    hasNoMoveCost: function() {
      return this.getEffectSum('noMoveCost') > 0;
    },

    getCultivationRateBonus: function() {
      var rate = 1;
      for (var techId in Technique.Techniques) {
        var tech = Technique.Techniques[techId];
        if (tech.effect === 'cultivationRate') {
          var level = this.getTechniqueLevel(techId);
          rate *= (tech.effectValue * level);
        }
      }
      return rate;
    },

    getShieldHP: function() {
      return this.getEffectSum('shield');
    },

    updateView: function() {
      if (!$('#techniquePanel').length) return;
      var content = $('#techniqueContent');
      content.empty();

      $('<div>').addClass('heading').text('功法').appendTo(content);
      $('<div>').addClass('description').text('修炼功法可提升战斗力和修炼效率').appendTo(content);

      for (var techId in Technique.Techniques) {
        var tech = Technique.Techniques[techId];
        var level = this.getTechniqueLevel(techId);

        var row = $('<div>').addClass('techniqueRow').appendTo(content);
        $('<div>').addClass('row_key').text(tech.name + ' Lv.' + level + '/' + tech.maxLevel).appendTo(row);
        $('<div>').addClass('row_val').text(tech.desc).appendTo(row);

        if (level < tech.maxLevel && this.canLearn(techId)) {
          var costStr = '';
          var costMult = 1 + level;
          for (var resource in tech.cost) {
            costStr += resource + ':' + Math.floor(tech.cost[resource] * costMult) + ' ';
          }
          $('<div>').addClass('costRow').text('消耗: ' + costStr).appendTo(row);
          $('<div>').addClass('button').text('领悟').click(function(id) {
            return function() { Technique.learn(id); };
          }(techId)).appendTo(row);
        } else if (level >= tech.maxLevel) {
          $('<div>').addClass('costRow').text('已满级').appendTo(row);
        } else {
          $('<div>').addClass('costRow').text('条件不足').appendTo(row);
        }
      }
    },

    handleStateUpdates: function(e) {
      Technique.updateView();
    }
  };
})();
