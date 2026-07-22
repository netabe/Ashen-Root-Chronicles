(function() {
  var Alchemy = window.Alchemy = {

    Craftables: {},

    Recipes: {
      'qiPill': {
        name: '聚气丹',
        desc: '凝聚天地灵气，加速修炼',
        cost: { wood: 50, fur: 10 },
        effect: 'cultivationBoost',
        duration: 60 * 1000,
        max: 99
      },
      'recoveryPill': {
        name: '回春丹',
        desc: '回复气血，疗伤圣品',
        cost: { wood: 100, meat: 20 },
        effect: 'heal',
        healAmount: 30,
        max: 99
      },
      'strengthPill': {
        name: '大力丸',
        desc: '临时提升攻击力',
        cost: { wood: 150, iron: 20 },
        effect: 'damageBoost',
        duration: 30 * 1000,
        damageBonus: 5,
        max: 50
      },
      'ironSkinPill': {
        name: '铁肤丹',
        desc: '临时提升防御力',
        cost: { wood: 150, iron: 30, coal: 10 },
        effect: 'defenseBoost',
        duration: 30 * 1000,
        hpBonus: 30,
        max: 50
      },
      'spiritPill': {
        name: '蕴神丹',
        desc: '滋养神魂，突破时增加成功率',
        cost: { wood: 300, steel: 20, scales: 5 },
        effect: 'breakthroughBoost',
        duration: 120 * 1000,
        max: 20
      },
      'realmPill': {
        name: '破境丹',
        desc: '蕴含大道碎片，突破时大幅提升成功率',
        cost: { wood: 1000, steel: 100, scales: 30, teeth: 10, 'alien alloy': 3 },
        effect: 'breakthroughBoost',
        duration: 300 * 1000,
        max: 10
      },
      'speedPill': {
        name: '风行丹',
        desc: '身轻如燕，移动消耗减半',
        cost: { wood: 200, fur: 30, scales: 5 },
        effect: 'speedBoost',
        duration: 60 * 1000,
        max: 30
      },
      'fortunePill': {
        name: '运财丹',
        desc: '坊市交易获得更多资源',
        cost: { wood: 200, fur: 50, teeth: 5 },
        effect: 'fortuneBoost',
        duration: 60 * 1000,
        max: 30
      }
    },

    init: function() {
      if (!$SM.get('features.location.alchemy')) {
        return;
      }
      this.tab = Header.addLocation('炼丹', 'alchemy', Alchemy, 'fabricator');
      this.panel = $('<div>').attr('id', 'alchemyPanel')
        .addClass('location')
        .appendTo('div#locationSlider');
      Engine.updateSlider();

      $('<div>').attr('id', 'alchemyContent').appendTo(this.panel);
      $('<div>').attr('id', 'alchemyRecipes').attr('data-legend', '丹方：').appendTo('#alchemyContent');
      $('<div>').attr('id', 'activeEffects').attr('data-legend', '生效丹药：').appendTo('#alchemyContent');

      $.Dispatch('stateUpdate').subscribe(Alchemy.handleStateUpdates);
      Alchemy.updateView();
    },

    canCraft: function(recipeKey) {
      var recipe = Alchemy.Recipes[recipeKey];
      if (!recipe) return false;
      var count = $SM.get('character.alchemy["' + recipeKey + '"]', true) || 0;
      if (count >= recipe.max) return false;
      var cost = recipe.cost;
      for (var resource in cost) {
        if (($SM.get('stores["' + resource + '"]', true) || 0) < cost[resource]) {
          return false;
        }
      }
      return true;
    },

    craft: function(recipeKey) {
      var recipe = Alchemy.Recipes[recipeKey];
      if (!Alchemy.canCraft(recipeKey)) return;

      var cost = recipe.cost;
      for (var resource in cost) {
        $SM.add('stores["' + resource + '"]', -cost[resource]);
      }

      var count = $SM.get('character.alchemy["' + recipeKey + '"]', true) || 0;
      $SM.set('character.alchemy["' + recipeKey + '"]', count + 1);

      if ($SM.hasPerk('mixedRoot4') && recipe.cost['alien alloy']) {
        var refund = Math.max(1, Math.floor(recipe.cost['alien alloy'] * 0.33));
        $SM.add('stores["alien alloy"]', refund);
      }

      Notifications.notify(Alchemy, '炼制 ' + recipe.name + ' 成功！');
      Alchemy.updateView();
    },

    useItem: function(recipeKey) {
      var recipe = Alchemy.Recipes[recipeKey];
      if (!recipe) return;
      var count = $SM.get('character.alchemy["' + recipeKey + '"]', true) || 0;
      if (count <= 0) return;

      $SM.set('character.alchemy["' + recipeKey + '"]', count - 1);

      if (recipe.effect === 'heal') {
        var hp = $SM.get('character.hp', true) || 0;
        var maxHp = World.getMaxHealth ? World.getMaxHealth() : 100;
        $SM.set('character.hp', Math.min(maxHp, hp + (recipe.healAmount || 30)));
        Notifications.notify(Alchemy, '服用 ' + recipe.name + '，恢复 ' + (recipe.healAmount || 30) + ' 生命');
      } else if (recipe.effect === 'cultivationBoost') {
        var progress = $SM.get('character.cultivation.progress', true) || 0;
        $SM.set('character.cultivation.progress', progress + 200);
        Notifications.notify(Alchemy, '服用 ' + recipe.name + '，修炼进度大幅提升');
      } else {
        var activeEffects = $SM.get('character.activeEffects') || {};
        var effectKey = recipe.effect;
        if (effectKey === 'breakthroughBoost') {
          activeEffects[effectKey] = (activeEffects[effectKey] || 0) + 0.05;
        } else if (effectKey === 'damageBoost') {
          activeEffects[effectKey] = (activeEffects[effectKey] || 0) + (recipe.damageBonus || 5);
        } else if (effectKey === 'defenseBoost') {
          activeEffects[effectKey] = (activeEffects[effectKey] || 0) + (recipe.hpBonus || 30);
        } else if (effectKey === 'speedBoost') {
          activeEffects[effectKey] = true;
        } else if (effectKey === 'fortuneBoost') {
          activeEffects[effectKey] = true;
        }
        $SM.set('character.activeEffects', activeEffects);

        var self = this;
        setTimeout(function() {
          var effects = $SM.get('character.activeEffects') || {};
          if (effectKey === 'breakthroughBoost') {
            effects[effectKey] = Math.max(0, (effects[effectKey] || 0.05) - 0.05);
            if (effects[effectKey] <= 0) delete effects[effectKey];
          } else if (effectKey === 'damageBoost') {
            effects[effectKey] = Math.max(0, (effects[effectKey] || 5) - (recipe.damageBonus || 5));
            if (effects[effectKey] <= 0) delete effects[effectKey];
          } else if (effectKey === 'defenseBoost') {
            effects[effectKey] = Math.max(0, (effects[effectKey] || 30) - (recipe.hpBonus || 30));
            if (effects[effectKey] <= 0) delete effects[effectKey];
          } else {
            if (effects[effectKey]) delete effects[effectKey];
          }
          $SM.set('character.activeEffects', effects);
          Alchemy.updateView();
        }, recipe.duration || 60000);

        Notifications.notify(Alchemy, '服用 ' + recipe.name + '，效果持续 ' + ((recipe.duration || 60000) / 1000) + ' 秒');
      }
      Alchemy.updateView();
    },

    updateView: function() {
      var recipeDiv = $('#alchemyRecipes');
      recipeDiv.empty();
      for (var key in Alchemy.Recipes) {
        var recipe = Alchemy.Recipes[key];
        var count = $SM.get('character.alchemy["' + key + '"]', true) || 0;
        var canCraft = Alchemy.canCraft(key);

        var row = $('<div>').addClass('recipeRow');
        var nameDiv = $('<div>').addClass('row_key').text(recipe.name + ' (' + count + ')').appendTo(row);
        var descDiv = $('<div>').addClass('row_val').text(recipe.desc).appendTo(row);

        var costStr = '';
        for (var resource in recipe.cost) {
          var have = $SM.get('stores["' + resource + '"]', true) || 0;
          var need = recipe.cost[resource];
          costStr += resource + ':' + have + '/' + need + ' ';
        }
        $('<div>').addClass('costRow').text(costStr).appendTo(row);

        if (canCraft) {
          $('<div>').addClass('button').text('炼制').click(function(k) {
            return function() { Alchemy.craft(k); };
          }(key)).appendTo(row);
        }
        if (count > 0) {
          $('<div>').addClass('button').text('服用').click(function(k) {
            return function() { Alchemy.useItem(k); };
          }(key)).appendTo(row);
        }
        recipeDiv.append(row);
      }

      var effectsDiv = $('#activeEffects');
      effectsDiv.empty();
      var activeEffects = $SM.get('character.activeEffects') || {};
      if (Object.keys(activeEffects).length === 0) {
        effectsDiv.append('<div class="row_key">当前无生效丹药效果</div>');
      } else {
        for (var effectKey in activeEffects) {
          if (effectKey === 'breakthroughBoost') {
            effectsDiv.append('<div class="row_key">破境加成: +' + Math.round(activeEffects[effectKey] * 100) + '% 突破成功率</div>');
          } else if (effectKey === 'damageBoost') {
            effectsDiv.append('<div class="row_key">攻击加成: +' + activeEffects[effectKey] + ' 伤害</div>');
          } else if (effectKey === 'defenseBoost') {
            effectsDiv.append('<div class="row_key">防御加成: +' + activeEffects[effectKey] + ' HP</div>');
          } else if (effectKey === 'speedBoost') {
            effectsDiv.append('<div class="row_key">风行: 移动消耗减半</div>');
          } else if (effectKey === 'fortuneBoost') {
            effectsDiv.append('<div class="row_key">财运: 交易获得更多</div>');
          }
        }
      }
    },

    handleStateUpdates: function(e) {
      if (e.category === 'alchemy' || e.category === 'stores') {
        Alchemy.updateView();
      }
    },

    onArrival: function() {
      this.updateView();
    }
  };
})();
