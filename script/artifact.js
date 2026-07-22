(function() {
  var Artifact = window.Artifact = {

    Rarities: ['凡品', '法器', '灵器', '宝器', '仙器'],

    Blueprints: {
      'spiritSword': { name: '灵剑', desc: '攻击时附加灵力伤害', rarity: 2, cost: { spiritStone: 50, steel: 5, scales: 3 }, affixPool: ['damage%', 'crit%'] },
      'cloudBoots': { name: '踏云靴', desc: '提升闪避几率', rarity: 1, cost: { spiritStone: 30, fur: 10, cloth: 5 }, affixPool: ['dodge%', 'speed'] },
      'soulJade': { name: '魂玉', desc: '修炼时额外获得经验', rarity: 2, cost: { spiritStone: 80, scales: 10, teeth: 5 }, affixPool: ['xpBoost', 'healOnKill'] },
      'dragonScaleArmor': { name: '龙鳞甲', desc: '大幅提升防御', rarity: 3, cost: { spiritStone: 150, scales: 20, steel: 10 }, affixPool: ['armor%', 'reflect%'] },
      'voidRing': { name: '虚空戒', desc: '提升储物空间', rarity: 3, cost: { spiritStone: 100, 'alien alloy': 3, steel: 5 }, affixPool: ['storage', 'hp%'] },
      'phoenixFeatherFan': { name: '凤羽扇', desc: '战斗开始时获得护盾', rarity: 4, cost: { spiritStone: 300, scales: 30, 'alien alloy': 5 }, affixPool: ['shield', 'crit%', 'damage%'] },
      'starCompass': { name: '星辰罗盘', desc: '探索时发现额外资源', rarity: 4, cost: { spiritStone: 250, 'alien alloy': 4, scales: 15 }, affixPool: ['loot%', 'dodge%'] },
      'daoMirror': { name: '道镜', desc: '增加所有加成效果', rarity: 5, cost: { spiritStone: 800, 'alien alloy': 10, scales: 40 }, affixPool: ['damage%', 'crit%', 'dodge%', 'healOnKill'] }
    },

    AffixNames: {
      'damage%': '攻击+{val}%',
      'crit%': '暴击率+{val}%',
      'dodge%': '闪避+{val}%',
      'armor%': '减伤+{val}%',
      'reflect%': '反伤{val}%',
      'storage': '背包+{val}格',
      'hp%': '生命+{val}%',
      'speed': '速度+{val}',
      'xpBoost': '修炼速度+{val}%',
      'healOnKill': '击杀回复{val}HP',
      'shield': '开场护盾{val}点',
      'loot%': '掉落率+{val}%'
    },

    MAX_SLOTS: 4,

    init: function() {
      if (!$SM.get('features.location.artifact')) return;
      this.tab = Header.addLocation('法宝', 'artifact', Artifact, 'outside');
      this.panel = $('<div>').attr('id', 'artifactPanel').addClass('location').appendTo('div#locationSlider');
      Engine.updateSlider();

      var inner = $('<div>').attr('id', 'artifactContent').appendTo(this.panel);
      $('<div>').attr('id', 'artifSlots').attr('data-legend', '装备栏：').appendTo(inner);
      $('<div>').attr('id', 'artifCraft').attr('data-legend', '锻造法宝：').appendTo(inner);

      this.updateView();
    },

    getEquipped: function(slotIdx) {
      return $SM.get('character.artifact.equipped[' + slotIdx + ']', true);
    },

    equip: function(slotIdx, artifact) {
      $SM.set('character.artifact.equipped[' + slotIdx + ']', artifact);
      Artifact.updateView();
      Notifications.notify(Artifact, '装备' + artifact.name + '！');
    },

    unequip: function(slotIdx) {
      var art = Artifact.getEquipped(slotIdx);
      if (!art) return;
      $SM.set('character.artifact.equipped[' + slotIdx + ']', null);
      Artifact.updateView();
      Notifications.notify(Artifact, '卸下' + art.name);
    },

    _rollAffix: function(pool) {
      var affixKey = pool[Math.floor(Math.random() * pool.length)];
      var vals = {
        'damage%': [3, 5, 8, 12, 18, 25],
        'crit%': [2, 4, 6, 9, 13],
        'dodge%': [2, 4, 6, 9, 13],
        'armor%': [3, 5, 8, 12, 18],
        'reflect%': [3, 5, 8, 12],
        'storage': [2, 4, 6, 9],
        'hp%': [3, 5, 8, 12, 18],
        'speed': [1, 2, 3, 5, 7],
        'xpBoost': [3, 5, 8, 12, 18],
        'healOnKill': [2, 4, 6, 9, 13],
        'shield': [10, 20, 35, 55, 80],
        'loot%': [3, 5, 8, 12]
      };
      var poolVals = vals[affixKey] || [3, 5, 8];
      var tier = Math.floor(Math.random() * Math.min(poolVals.length, 4)) + 1;
      var val = poolVals[Math.floor(Math.random() * Math.min(tier + 2, poolVals.length))];
      return { key: affixKey, value: val };
    },

    craft: function(blueprintKey) {
      var bp = Artifact.Blueprints[blueprintKey];
      if (!bp) return;

      for (var r in bp.cost) {
        if (r === 'spiritStone') {
          if (Economy.getSpiritStone() < bp.cost[r]) return Notifications.notify(Artifact, '灵石不足！');
        } else {
          if (($SM.get('stores["' + r + '"]', true) || 0) < bp.cost[r]) return Notifications.notify(Artifact, '材料不足！');
        }
      }

      for (var cr in bp.cost) {
        if (cr === 'spiritStone') { Economy.spendSpiritStone(bp.cost[cr]); }
        else { $SM.add('stores["' + cr + '"]', -bp.cost[cr]); }
      }

      var rarityIdx = bp.rarity + Math.floor(Math.random() * 2);
      rarityIdx = Math.min(rarityIdx, Artifact.Rarities.length - 1);

      var affixCount = bp.rarity >= 5 ? 3 : (bp.rarity >= 3 ? 2 : 1);
      var affixes = [];
      for (var i = 0; i < affixCount; i++) {
        affixes.push(Artifact._rollAffix(bp.affixPool));
      }

      var artifact = {
        id: Date.now(),
        name: Artifact.Rarities[rarityIdx] + '·' + bp.name,
        desc: bp.desc, affixes: affixes,
        rarity: Artifact.Rarities[rarityIdx]
      };

      var bag = $SM.get('character.artifact.bag', true) || [];
      bag.push(artifact);
      $SM.set('character.artifact.bag', bag);
      Notifications.notify(Artifact, '锻造成功！获得' + artifact.name + '！');
      Artifact.updateView();
    },

    getCombatBonus: function() {
      var bonus = { damageMul: 1, critChance: 0, dodgeChance: 0, armorMul: 1,
        reflectChance: 0, hpMul: 1, shield: 0, healOnKill: 0 };

      for (var i = 0; i < Artifact.MAX_SLOTS; i++) {
        var art = Artifact.getEquipped(i);
        if (!art || !art.affixes) continue;
        for (var j = 0; j < art.affixes.length; j++) {
          var a = art.affixes[j];
          switch (a.key) {
            case 'damage%': bonus.damageMul *= 1 + a.value / 100; break;
            case 'crit%': bonus.critChance += a.value; break;
            case 'dodge%': bonus.dodgeChance += a.value; break;
            case 'armor%': bonus.armorMul *= 1 - a.value / 100; break;
            case 'reflect%': bonus.reflectChance += a.value; break;
            case 'hp%': bonus.hpMul *= 1 + a.value / 100; break;
            case 'shield': bonus.shield += a.value; break;
            case 'healOnKill': bonus.healOnKill += a.value; break;
          }
        }
      }
      return bonus;
    },

    updateView: function() {
      var content = $('#artifactContent');
      if (!content.length) return;

      var slots = $('#artifSlots');
      slots.empty();
      for (var i = 0; i < Artifact.MAX_SLOTS; i++) {
        var art = Artifact.getEquipped(i);
        var row = $('<div>').addClass('ecoRow');
        if (art) {
          $('<div>').addClass('row_key').text(art.name).appendTo(row);
          var affixStr = art.affixes.map(function(a) {
            return Artifact.AffixNames[a.key].replace('{val}', a.value);
          }).join(', ');
          $('<div>').addClass('row_val').text(affixStr).appendTo(row);
          $('<div>').addClass('button buildBtn').text('卸下').click(function(idx) {
            return function() { Artifact.unequip(idx); };
          }(i)).appendTo(row);
        } else {
          $('<div>').addClass('row_key').text('空槽位').appendTo(row);
        }
        slots.append(row);
      }

      var bagItems = $SM.get('character.artifact.bag', true) || [];
      if (bagItems.length > 0) {
        slots.append($('<div>').addClass('heading').text('背包法宝：'));
        for (var bi = 0; bi < bagItems.length; bi++) {
          var baitem = bagItems[bi];
          var brow = $('<div>').addClass('ecoRow');
          $('<div>').addClass('row_key').text(baitem.name).appendTo(brow);
          var baffStr = baitem.affixes.map(function(a) {
            var name = Artifact.AffixNames[a.key];
            return name ? name.replace('{val}', a.value) : a.key;
          }).join(', ');
          $('<div>').addClass('row_val').text(baffStr).appendTo(brow);
          $('<div>').addClass('button buildBtn').text('装备').click(function(slotIdx, item) {
            return function() {
              var emptySlot = -1;
              for (var s = 0; s < Artifact.MAX_SLOTS; s++) { if (!Artifact.getEquipped(s)) { emptySlot = s; break; } }
              if (emptySlot === -1) return Notifications.notify(Artifact, '没有空余装备栏！');
              Artifact.equip(emptySlot, item);
              var bag = $SM.get('character.artifact.bag', true) || [];
              var idx = bag.findIndex(function(x) { return x.id === item.id; });
              if (idx >= 0) { bag.splice(idx, 1); $SM.set('character.artifact.bag', bag); }
              Artifact.updateView();
            };
          }(bi, baitem)).appendTo(brow);
          slots.append(brow);
        }
      }

      var craftDiv = $('#artifCraft');
      craftDiv.empty();
      for (var key in Artifact.Blueprints) {
        var bp = Artifact.Blueprints[key];
        var row = $('<div>').addClass('ecoRow');
        $('<div>').addClass('row_key').text(bp.name).appendTo(row);
        var costStr = '花费:';
        for (var r in bp.cost) { costStr += ' ' + r + 'x' + bp.cost[r]; }
        $('<div>').addClass('row_val').text(costStr + ' | ' + Artifact.Rarities[bp.rarity] + '+').appendTo(row);
        $('<div>').addClass('button buildBtn').text('锻造').click(function(k) {
          return function() { Artifact.craft(k); };
        }(key)).appendTo(row);
        craftDiv.append(row);
      }
    },

    onArrival: function() {
      this.updateView();
    }
  };
})();
