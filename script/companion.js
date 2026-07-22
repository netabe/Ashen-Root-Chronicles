(function() {
  var Companion = window.Companion = {

    NPCs: {
      'iceFairy': { name: '冰灵仙子', title: '散修', encounterArea: 'mountain', giftLikes: ['snowFlower', 'iceCrystal'], bondBonus: { damageMul: 1.1 }, realmReq: null },
      'flameLord': { name: '炎阳真君', title: '火系散修', encounterArea: 'volcano', giftLikes: ['fireEssence', 'steel'], bondBonus: { damageMul: 1.1, critBonus: 5 }, realmReq: '金丹' },
      'windSage': { name: '清风散人', title: '闲云野鹤', encounterArea: 'grassland', giftLikes: ['jadePendant', 'wood'], bondBonus: { speedBonus: 1 }, realmReq: null },
      'darkFlower': { name: '墨花仙子', title: '毒道高手', encounterArea: 'swamp', giftLikes: ['poisonSack', 'snakeVenom'], bondBonus: { enemyPoison: 5 }, realmReq: null },
      'goldenMonk': { name: '金禅大师', title: '佛门高僧', encounterArea: 'desert', giftLikes: ['sutra', 'fur'], bondBonus: { healBonus: 10 }, realmReq: null },
      'starScholar': { name: '星河道人', title: '星象学者', encounterArea: 'sky', giftLikes: ['starFragment', 'scales'], bondBonus: { expBonus: 1.15 }, realmReq: '元婴' },
      'jadePrincess': { name: '玉清公主', title: '剑修天才', encounterArea: 'river', giftLikes: ['jade', 'steel'], bondBonus: { damageMul: 1.15, dodgeBonus: 3 }, realmReq: '金丹' },
      'divineAlchemist': { name: '丹霞尊者', title: '炼丹宗师', encounterArea: 'forest', giftLikes: ['herbBundle', 'coal'], bondBonus: { alchemyBonus: 1.2 }, realmReq: null }
    },

    _MAX_BOND: 200,
    _BOND_THRESHOLD: 100,

    init: function() {
      if (!$SM.get('features.location.companion')) return;
      this.tab = Header.addLocation('道侣', 'companion', Companion, 'outside');
      this.panel = $('<div>').attr('id', 'companionPanel').addClass('location').appendTo('div#locationSlider');
      Engine.updateSlider();

      var inner = $('<div>').attr('id', 'companionContent').appendTo(this.panel);
      $('<div>').attr('id', 'compNPClist').attr('data-legend', '已知修士：').appendTo(inner);
      $('<div>').attr('id', 'compBonds').attr('data-legend', '道侣羁绊：').appendTo(inner);

      this.updateView();
    },

    getBond: function(npcKey) {
      return $SM.get('character.companion.bonds["' + npcKey + '"]', true) || 0;
    },

    setBond: function(npcKey, val) {
      $SM.set('character.companion.bonds["' + npcKey + '"]', Math.max(0, Math.min(val, Companion._MAX_BOND)));
    },

    isCompanion: function(npcKey) {
      return Companion.getBond(npcKey) >= Companion._BOND_THRESHOLD;
    },

    getMet: function(npcKey) {
      return Companion.getBond(npcKey) > 0;
    },

    meet: function(npcKey) {
      var npc = Companion.NPCs[npcKey];
      if (!npc) return;
      if (Companion.getMet(npcKey)) return;

      if (npc.realmReq && Cultivation && Cultivation.getRealmIndex) {
        var realmIdx = Cultivation.Realms.findIndex(function(r) { return r.name === npc.realmReq; });
        if (Cultivation.getRealmIndex() < realmIdx) return;
      }

      Companion.setBond(npcKey, 5);
      Notifications.notify(Companion, '结识' + npc.title + npc.name + '！');
      Companion.updateView();
    },

    gift: function(npcKey) {
      var npc = Companion.NPCs[npcKey];
      if (!npc) return;
      if (!Companion.getMet(npcKey)) return Notifications.notify(Companion, '尚未结识此人！');

      var giftItem = npc.giftLikes[0];
      var count = $SM.get('stores["' + giftItem + '"]', true) || 0;
      if (count <= 0) return Notifications.notify(Companion, '没有' + giftItem + '可以赠送！');
      $SM.add('stores["' + giftItem + '"]', -1);

      var gain = 10 + Math.floor(Math.random() * 5);
      Companion.setBond(npcKey, Companion.getBond(npcKey) + gain);
      Notifications.notify(Companion, '向' + npc.name + '赠送' + giftItem + '，好感度+' + gain);
      Companion.updateView();
    },

    invite: function(npcKey) {
      if (!Companion.isCompanion(npcKey)) return Notifications.notify(Companion, '好感度不足，结为道侣需要' + Companion._BOND_THRESHOLD + '好感度！');
      if ($SM.get('character.companion.partner["' + npcKey + '"]', true)) return Notifications.notify(Companion, '已是道侣！');
      $SM.set('character.companion.partner["' + npcKey + '"]', true);
      Notifications.notify(Companion, Companion.NPCs[npcKey].name + '答应了你的求道！');
      Companion._checkJealousy(npcKey);
      Companion.updateView();
    },

    _checkJealousy: function(excludeKey) {
      var partners = $SM.get('character.companion.partner', true) || {};
      var partnerKeys = Object.keys(partners).filter(function(k) { return k !== excludeKey && partners[k]; });
      if (partnerKeys.length >= 2) {
        var target = partnerKeys[Math.floor(Math.random() * partnerKeys.length)];
        var penalty = 10 + Math.floor(Math.random() * 20);
        Companion.setBond(target, Companion.getBond(target) - penalty);
        Notifications.notify(Companion, '修罗场！' + Companion.NPCs[target].name + '发现你有其他道侣，好感度-' + penalty + '！');
      }
    },

    getCombatBonus: function() {
      var bonus = { damageMul: 1, critBonus: 0, speedBonus: 0, enemyPoison: 0, healBonus: 0, expBonus: 1, dodgeBonus: 0, alchemyBonus: 1 };
      var partners = $SM.get('character.companion.partner', true) || {};
      for (var key in partners) {
        if (!partners[key]) continue;
        var npc = Companion.NPCs[key];
        if (!npc) continue;
        var bondRatio = Companion.getBond(key) / Companion._MAX_BOND;
        for (var bk in npc.bondBonus) {
          var val = npc.bondBonus[bk];
          if (bonus[bk] !== undefined) {
            if (typeof val === 'number' && val > 1) {
              bonus[bk] = (bonus[bk] || 1) * (1 + (val - 1) * bondRatio);
            } else {
              bonus[bk] = (bonus[bk] || 0) + val * bondRatio;
            }
          }
        }
      }
      return bonus;
    },

    rollEncounter: function(area) {
      var candidates = [];
      for (var key in Companion.NPCs) {
        var npc = Companion.NPCs[key];
        if (npc.encounterArea === area && !Companion.getMet(key)) {
          if (npc.realmReq) {
            if (!Cultivation || !Cultivation.getRealmIndex) continue;
            var idx = Cultivation.Realms.findIndex(function(r) { return r.name === npc.realmReq; });
            if (Cultivation.getRealmIndex() < idx) continue;
          }
          candidates.push(key);
        }
      }
      if (candidates.length === 0) return;

      var chosen = candidates[Math.floor(Math.random() * candidates.length)];
      var npc = Companion.NPCs[chosen];

      var scene = {
        title: '偶遇',
        notification: '你遇到了' + npc.title + npc.name + '！',
        combat: false,
        enemy: null,
        buttons: {
          '结识': function() { Companion.meet(chosen); Engine.leaveRoom(); },
          '无视': function() { Engine.leaveRoom(); }
        }
      };
      Events.startEvent(Companion, scene);
    },

    updateView: function() {
      var content = $('#companionContent');
      if (!content.length) return;

      var npcList = $('#compNPClist');
      npcList.empty();
      for (var key in Companion.NPCs) {
        var npc = Companion.NPCs[key];
        if (!Companion.getMet(key)) continue;
        var bond = Companion.getBond(key);
        var isPartner = !!$SM.get('character.companion.partner["' + key + '"]', true);

        var row = $('<div>').addClass('ecoRow');
        $('<div>').addClass('row_key').text(npc.name).appendTo(row);
        $('<div>').addClass('row_val').text('好感度:' + bond + '/' + Companion._MAX_BOND).appendTo(row);

        $('<div>').css({'width':'80px','height':'4px','background':'#333','marginLeft':'8px'}).append(
          $('<div>').css({'width':(bond/Companion._MAX_BOND*100)+'%','height':'100%','background':bond>=Companion._BOND_THRESHOLD ? '#e91e63' : '#9b59b6'})
        ).appendTo(row);

        if (bond < Companion._BOND_THRESHOLD) {
          $('<div>').addClass('button buildBtn').text('赠礼').click(function(k) { return function(){Companion.gift(k);}; }(key)).appendTo(row);
        } else if (!isPartner) {
          $('<div>').addClass('button buildBtn').css('background','#e91e63').text('求道').click(function(k) { return function(){Companion.invite(k);}; }(key)).appendTo(row);
        }
        npcList.append(row);
      }

      var bonds = $('#compBonds');
      bonds.empty();
      var hasPartner = false;
      for (var pk in Companion.NPCs) {
        if ($SM.get('character.companion.partner["' + pk + '"]', true)) {
          var pnpc = Companion.NPCs[pk];
          var pbond = Companion.getBond(pk);
          var bonusStr = '';
          for (var bk in pnpc.bondBonus) bonusStr += bk + ':' + pnpc.bondBonus[bk] + ' ';
          $('<div>').text(pnpc.name + ' | 羁绊: ' + bonusStr + ' | 好感:' + pbond).appendTo(bonds);
          hasPartner = true;
        }
      }
      if (!hasPartner) $('<div>').text('暂无道侣').appendTo(bonds);
    },

    onArrival: function() {
      this.updateView();
    }
  };
})();
