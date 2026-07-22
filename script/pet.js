(function() {
  var Pet = window.Pet = {

    Eggs: {
      'fireFoxEgg': { name: '火狐卵', desc: '孵化火灵狐，战斗时可附加火焰伤害', hatchTime: 10, unlock: 'forest' },
      'frostSpiderEgg': { name: '冰蛛卵', desc: '孵化冰玉蛛，战斗时减缓敌人攻击速度', hatchTime: 10, unlock: 'mountain' },
      'thunderEagleEgg': { name: '雷鹰卵', desc: '孵化雷翼鹰，提升玩家命中率', hatchTime: 12, unlock: 'desert' },
      'shadowSerpentEgg': { name: '影蛇卵', desc: '孵化暗影蛇，增加闪避几率', hatchTime: 12, unlock: 'swamp' },
      'jadeTurtleEgg': { name: '玉龟卵', desc: '孵化玄玉龟，战斗时自动回血', hatchTime: 8, unlock: 'river' },
      'stormTigerEgg': { name: '风虎卵', desc: '孵化暴风虎，提升暴击率', hatchTime: 15, unlock: 'grassland' },
      'divinePhoenixEgg': { name: '凤凰卵', desc: '孵化九天玄凤，全属性大幅提升', hatchTime: 25, unlock: 'volcano' },
      'cloudDragonEgg': { name: '云龙卵', desc: '孵化云中龙，战斗时概率额外攻击', hatchTime: 30, unlock: 'sky' }
    },

    MAX_SLOTS: 3,
    MAX_LEVEL: 10,

    init: function() {
      if (!$SM.get('features.location.pet')) return;
      this.tab = Header.addLocation('灵兽', 'pet', Pet, 'outside');
      this.panel = $('<div>').attr('id', 'petPanel').addClass('location').appendTo('div#locationSlider');
      Engine.updateSlider();

      $('<div>').attr('id', 'petContent').appendTo(this.panel);
      $('<div>').attr('id', 'petSlots').attr('data-legend', '灵兽栏：').appendTo('#petContent');
      $('<div>').attr('id', 'petEggs').attr('data-legend', '兽卵：').appendTo('#petContent');

      $.Dispatch('stateUpdate').subscribe(Pet.handleStateUpdates);
      this.updateView();
    },

    getPetSlot: function(index) {
      return $SM.get('character.pet.pets[' + index + ']', true);
    },

    setPetSlot: function(index, data) {
      $SM.set('character.pet.pets[' + index + ']', data);
    },

    addEgg: function(eggKey) {
      var have = $SM.get('character.pet.eggs["' + eggKey + '"]', true) || 0;
      $SM.set('character.pet.eggs["' + eggKey + '"]', have + 1);
    },

    hatchEgg: function(slotIdx, eggKey) {
      var pets = $SM.get('character.pet.pets', true) || {};
      if (pets[slotIdx]) return Notifications.notify(Pet, '该栏位已有灵兽！');
      var eggName = Pet.Eggs[eggKey].name;
      var needs = Pet.Eggs[eggKey].hatchTime;
      var have = $SM.get('character.pet.eggs["' + eggKey + '"]', true) || 0;
      if (have <= 0) return Notifications.notify(Pet, '没有可用的' + eggName + '！');
      var stone = Economy.getSpiritStone ? Economy.getSpiritStone() : 0;
      if (stone < needs) return Notifications.notify(Pet, '需要' + needs + '灵石来孵化！');

      Economy.spendSpiritStone(needs);
      $SM.set('character.pet.eggs["' + eggKey + '"]', have - 1);
      Pet.setPetSlot(slotIdx, {
        id: eggKey, name: eggName.replace('卵', ''), level: 1, exp: 0
      });
      Notifications.notify(Pet, eggName + '孵化成功！获得' + eggName.replace('卵', '') + '！');
      Pet.updateView();
    },

    releasePet: function(slotIdx) {
      var pet = Pet.getPetSlot(slotIdx);
      if (!pet) return;
      if (confirm('确定要放生' + pet.name + '吗？')) {
        Pet.setPetSlot(slotIdx, null);
        Pet.updateView();
        Notifications.notify(Pet, pet.name + '已放生');
      }
    },

    addExp: function(slotIdx, amount) {
      var pet = Pet.getPetSlot(slotIdx);
      if (!pet) return;
      pet.exp = (pet.exp || 0) + amount;
      var nextLevel = pet.level + 1;
      var required = nextLevel * nextLevel * 5;
      if (pet.exp >= required && pet.level < Pet.MAX_LEVEL) {
        pet.level = nextLevel;
        pet.exp -= required;
        Notifications.notify(Pet, pet.name + '升级至Lv.' + pet.level + '！');
      }
      Pet.setPetSlot(slotIdx, pet);
      Pet.updateView();
    },

    getCombatBonus: function() {
      var bonus = { damage: 0, heal: 0, hitChance: 0, dodgeChance: 0, critChance: 0, doubleAtkChance: 0 };
      var pets = $SM.get('character.pet.pets', true) || {};

      for (var i = 0; i < Pet.MAX_SLOTS; i++) {
        var pet = pets[i];
        if (!pet) continue;
        var lv = pet.level;
        var effectMap = {
          'fireFoxEgg': { damage: lv * 3 },
          'frostSpiderEgg': { enemySlow: lv },
          'thunderEagleEgg': { hitChance: lv * 2 },
          'shadowSerpentEgg': { dodgeChance: lv * 2 },
          'jadeTurtleEgg': { heal: lv * 3 },
          'stormTigerEgg': { critChance: lv },
          'divinePhoenixEgg': { damage: lv * 5, heal: lv * 2, critChance: lv },
          'cloudDragonEgg': { damage: lv * 4, doubleAtkChance: lv * 3 }
        };
        var eff = effectMap[pet.id] || {};
        for (var k in eff) { bonus[k] = (bonus[k] || 0) + eff[k]; }
      }
      return bonus;
    },

    updateView: function() {
      var content = $('#petContent');
      if (!content.length) return;

      var pets = $SM.get('character.pet.pets', true) || {};
      var slots = $('#petSlots');
      slots.empty();
      for (var i = 0; i < Pet.MAX_SLOTS; i++) {
        var pet = pets[i];
        var row = $('<div>').addClass('ecoRow');
        if (pet) {
          var required = (pet.level + 1) * (pet.level + 1) * 5;
          var progress = pet.exp / required * 100;
          $('<div>').addClass('row_key').text(pet.name + ' Lv.' + pet.level).appendTo(row);
          $('<div>').addClass('row_val').text('EXP: ' + pet.exp + '/' + required).appendTo(row);
          $('<div>').css({'width': '100px', 'height': '6px', 'background': '#333'}).append(
            $('<div>').css({'width': Math.min(progress, 100) + '%', 'height': '100%', 'background': '#9b59b6'})
          ).appendTo(row);
          $('<div>').addClass('button buildBtn').text('放生').click(function(idx) {
            return function() { Pet.releasePet(idx); };
          }(i)).appendTo(row);
        } else {
          $('<div>').addClass('row_key').text('栏位' + (i + 1) + ': 空').appendTo(row);
        }
        slots.append(row);
      }

      var eggs = $('#petEggs');
      eggs.empty();
      for (var key in Pet.Eggs) {
        var e = Pet.Eggs[key];
        var have = $SM.get('character.pet.eggs["' + key + '"]', true) || 0;
        if (have <= 0) continue;
        var row = $('<div>').addClass('ecoRow');
        $('<div>').addClass('row_key').text(e.name + ' x' + have).appendTo(row);
        $('<div>').addClass('row_val').text(e.desc + '（需' + e.hatchTime + '灵石）').appendTo(row);
        $('<div>').addClass('button buildBtn').text('孵化').click(function(k) {
          return function() {
            var emptySlot = -1;
            var pets2 = $SM.get('character.pet.pets', true) || {};
            for (var j = 0; j < Pet.MAX_SLOTS; j++) { if (!pets2[j]) { emptySlot = j; break; } }
            if (emptySlot === -1) return Notifications.notify(Pet, '没有空余栏位！先放生一只灵兽吧。');
            Pet.hatchEgg(emptySlot, k);
          };
        }(key)).appendTo(row);
        eggs.append(row);
      }
    },

    handleStateUpdates: function(e) {
      if (e.category === 'character' && e.sub === 'pet') Pet.updateView();
    },

    onArrival: function() {
      this.updateView();
    }
  };
})();
