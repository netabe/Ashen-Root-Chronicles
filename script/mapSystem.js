(function() {
  var MapSys = window.MapSys = {

    TELEPORT_COST: 30,
    _WEATHER_INTERVAL: 120 * 1000,
    _timer: null,
    _caveTimer: null,
    _hotspots: {},

    Weathers: [
      { id: 'clear', name: '晴空', desc: '风和日丽', icon: '&#9728;', effect: null, prob: 0.5 },
      { id: 'spiritFog', name: '灵雾', desc: '修炼速度+50%', icon: '&#9925;', effect: { cultivationRate: 1.5, stoneGen: 2 }, prob: 0.15 },
      { id: 'beastTide', name: '妖兽潮', desc: '遭遇概率翻倍，掉落x2', icon: '&#128058;', effect: { fightChance: 2, lootMul: 2 }, prob: 0.15 },
      { id: 'bloodMoon', name: '血月', desc: '敌人HP+30%，掉落x2', icon: '&#127769;', effect: { enemyHpMul: 1.3, lootMul: 2 }, prob: 0.1 },
      { id: 'goldenDawn', name: '金晨', desc: '灵石掉落x3', icon: '&#127748;', effect: { stoneLoot: 3 }, prob: 0.1 }
    ],

    _currentWeather: null,

    init: function() {
      if (!$SM.get('features.location.world')) return;

      // 资源热点（首次生成地图时创建）
      var hotspots = $SM.get('game.world.hotspots');
      if (!hotspots) {
        hotspots = MapSys._genHotspots();
        $SM.set('game.world.hotspots', hotspots);
      }
      MapSys._hotspots = hotspots || {};
    },

    _genHotspots: function() {
      var h = {};
      var resources = ['wood', 'meat', 'fur', 'coal', 'iron'];
      var icons = ['树', '肉', '皮', '煤', '铁'];
      for (var ri = 0; ri < 8; ri++) {
        var rk = resources[ri % resources.length];
        if (!h[rk]) h[rk] = [];
        var x, y;
        do {
          x = Math.floor(Math.random() * (World.RADIUS * 2 + 1));
          y = Math.floor(Math.random() * (World.RADIUS * 2 + 1));
        } while (Math.abs(x - 30) + Math.abs(y - 30) < 5);
        h[rk].push([x, y, icons[ri % icons.length]]);
      }
      return h;
    },

    getHotspotBonus: function(x, y, resourceType) {
      var h = $SM.get('game.world.hotspots', true) || MapSys._hotspots;
      if (!h[resourceType]) return 1;
      for (var i = 0; i < h[resourceType].length; i++) {
        if (h[resourceType][i][0] === x && h[resourceType][i][1] === y) return 3;
      }
      return 1;
    },

    startWeather: function() {
      MapSys._rollWeather();
      MapSys._timer = Engine.setInterval(function() { MapSys._rollWeather(); }, MapSys._WEATHER_INTERVAL);
    },

    _rollWeather: function() {
      var r = Math.random();
      var cum = 0;
      var chosen = MapSys.Weathers[0];
      for (var i = 0; i < MapSys.Weathers.length; i++) {
        cum += MapSys.Weathers[i].prob;
        if (r <= cum) { chosen = MapSys.Weathers[i]; break; }
      }
      MapSys._currentWeather = chosen;
      MapSys._updateWeatherUI();
      return chosen;
    },

    getWeather: function() {
      return MapSys._currentWeather || MapSys.Weathers[0];
    },

    getWeatherEffect: function(effectKey) {
      var w = MapSys.getWeather();
      if (!w.effect) return 1;
      return w.effect[effectKey] || 1;
    },

    _updateWeatherUI: function() {
      var w = MapSys.getWeather();
      var el = $('#weatherDisplay');
      if (el.length) {
        el.html(w.icon + ' ' + w.name + ' - ' + w.desc);
      }
      // 灵兽蛋在灵雾/血月时刷新概率提升
    },

    createMinimap: function() {
      var mini = $('#miniMap');
      if (mini.length === 0) {
        mini = $('<div>').attr('id', 'miniMap').appendTo('#worldOuter');
        var title = $('<div>').attr('id', 'miniMapTitle').text('小地图').appendTo(mini);
        var body = $('<div>').attr('id', 'miniMapBody').appendTo(mini);
        var info = $('<div>').attr('id', 'miniMapInfo').appendTo(mini);
        // 传送按钮
        $('<div>').attr('id', 'teleportBtn').addClass('button').text('传送').click(MapSys.showTeleport).appendTo('#worldOuter');
      }
    },

    updateMinimap: function() {
      var mini = $('#miniMapBody');
      if (!mini.length) return;
      var str = '';
      var cx = World.curPos[0], cy = World.curPos[1];
      var r = 4;
      var hotspots = $SM.get('game.world.hotspots', true) || MapSys._hotspots;

      for (var j = cy - r; j <= cy + r; j++) {
        for (var i = cx - r; i <= cx + r; i++) {
          if (i < 0 || i > World.RADIUS * 2 || j < 0 || j > World.RADIUS * 2) {
            str += ' ';
          } else if (i === cx && j === cy) {
            str += '<span class="mini-player">@</span>';
          } else if (World.state.mask[i][j]) {
            var tile = World.state.map[i][j];
            if (tile.length > 1) tile = tile[0];
            // Check hotspot
            var isHot = false;
            for (var rk in hotspots) {
              for (var hi = 0; hi < hotspots[rk].length; hi++) {
                if (hotspots[rk][hi][0] === i && hotspots[rk][hi][1] === j) { isHot = true; break; }
              }
            }
            if (isHot) str += '<span class="mini-hotspot">' + tile + '</span>';
            else if (World.LANDMARKS[tile]) str += '<span class="mini-lm">' + tile + '</span>';
            else if (tile === World.TILE.ROAD) str += '#';
            else str += tile;
          } else {
            str += '<span class="mini-fog">.</span>';
          }
        }
        str += '<br>';
      }
      mini.html(str);

      // Legend info
      var expl = $SM.get('character.mapSys.explored', true) || 0;
      $('#miniMapInfo').html(
        '天气: ' + MapSys.getWeather().name + '<br>' +
        '已探索: ' + expl + ' 块'
      );
    },

    drawMapEnhanced: function() {
      World.drawMap();
      MapSys.updateMinimap();

      var h = $SM.get('game.world.hotspots', true) || MapSys._hotspots;
      var mapEl = $('#map');
      if (!mapEl.length || !h) return;

      var html = mapEl.html();
      for (var rk in h) {
        for (var hi = 0; hi < h[rk].length; hi++) {
          var hp = h[rk][hi];
          var cx = World.curPos[0], cy = World.curPos[1];
          // Only show icon on big map if recently explored or nearby
          if (Math.abs(hp[0] - cx) <= World.LIGHT_RADIUS + 2 && Math.abs(hp[1] - cy) <= World.LIGHT_RADIUS + 2) {
            if (World.state.mask[hp[0]][hp[1]]) {
              var mark = hp[2];
              // Replace tile character with icon via CSS overlay
              mapEl.find('.landmark').each(function() {
                if ($(this).text().indexOf(hp[2]) === -1) {
                }
              });
            }
          }
        }
      }
    },

    // 传送
    showTeleport: function() {
      if (typeof Economy === 'undefined' || !Economy.getSpiritStone) {
        Notifications.notify(MapSys, '尚未开启灵石系统，无法传送！');
        return;
      }
      var cost = MapSys.TELEPORT_COST;
      if (Economy.getSpiritStone() < cost) {
        Notifications.notify(MapSys, '灵石不足，传送需要' + cost + '灵石');
        return;
      }

      var targets = [];
      for (var tk in World.LANDMARKS) {
        var lm = World.LANDMARKS[tk];
        if (tk === World.TILE.VILLAGE) {
          targets.push({ tile: World.TILE.VILLAGE, label: '宗门(村庄)', pos: World.VILLAGE_POS });
          continue;
        }
        if (tk === World.TILE.EXECUTIONER || tk === World.TILE.SHIP) continue;
        var pos = MapSys._findLandmarkPos(tk);
        if (pos && World.state.mask[pos[0]][pos[1]]) {
          targets.push({ tile: tk, label: (lm.label || ''), pos: pos });
        }
      }

      var desc = $('#description');
      desc.empty();
      $('<div>').text('选择传送目的地（消耗' + cost + '灵石）：').appendTo(desc);

      var btns = $('#buttons');
      btns.empty();
      for (var ti = 0; ti < targets.length; ti++) {
        var t = targets[ti];
        (function(t) {
          new Button.Button({
            id: 'tp_' + t.tile,
            text: t.label + ' [' + t.pos[0] + ',' + t.pos[1] + ']',
            cooldown: 0,
            click: function() { MapSys.doTeleport(t.pos, t.tile); }
          }).appendTo(btns);
        })(t);
      }
      var leaveBtn = new Button.Button({
        id: 'tp_cancel',
        text: '取消',
        cooldown: 0,
        click: function() { Engine.leaveRoom(); }
      }).appendTo(btns);
    },

    _findLandmarkPos: function(tile) {
      var map = World.state.map;
      for (var i = 0; i <= World.RADIUS * 2; i++) {
        for (var j = 0; j <= World.RADIUS * 2; j++) {
          if (map[i][j] === tile) return [i, j];
        }
      }
      return null;
    },

    doTeleport: function(pos, tile) {
      if (Economy.getSpiritStone() < MapSys.TELEPORT_COST) return;
      Economy.spendSpiritStone(MapSys.TELEPORT_COST);
      World.curPos = pos;
      World.drawMap();
      MapSys.updateMinimap();
      Notifications.notify(MapSys, '传送至[' + pos[0] + ',' + pos[1] + ']！消耗' + MapSys.TELEPORT_COST + '灵石');
      Engine.leaveRoom();
    },

    // 探索图鉴
    recordExplore: function(x, y) {
      var expl = ($SM.get('character.mapSys.explored', true) || 0) + 1;
      $SM.set('character.mapSys.explored', expl);

      var tile = World.state.map[x][y];
      if (World.LANDMARKS[tile] && tile !== World.TILE.VILLAGE) {
        var found = $SM.get('character.mapSys.found', true) || {};
        if (!found[tile]) {
          found[tile] = true;
          $SM.set('character.mapSys.found', found);
          Notifications.notify(MapSys, '发现新地点：' + World.LANDMARKS[tile].label + '！');
        }
      }
      MapSys.updateMinimap();
    },

    getExplorationProgress: function() {
      var expl = $SM.get('character.mapSys.explored', true) || 0;
      var total = (World.RADIUS * 2 + 1) * (World.RADIUS * 2 + 1) - 1;
      var found = $SM.get('character.mapSys.found', true) || {};
      return { explored: expl, total: total, pct: Math.floor(expl / total * 100), found: Object.keys(found).length };
    },

    // 随机洞穴
    startCaveTimer: function() {
      MapSys._doSpawnCave();
      MapSys._caveTimer = Engine.setInterval(function() {
        MapSys._doSpawnCave();
        MapSys._despawnCave();
      }, 180 * 1000);
    },

    _doSpawnCave: function() {
      if (Math.random() > 0.5) return;
      if ($SM.get('character.mapSys.caveActive')) return;

      var x, y;
      var map = World.state.map;
      var attempts = 0;
      do {
        x = 5 + Math.floor(Math.random() * (World.RADIUS * 2 - 9));
        y = 5 + Math.floor(Math.random() * (World.RADIUS * 2 - 9));
        attempts++;
      } while (attempts < 20 && (map[x][y] !== World.TILE.FOREST && map[x][y] !== World.TILE.FIELD && map[x][y] !== World.TILE.BARRENS));

      if (map[x][y] !== World.TILE.FOREST && map[x][y] !== World.TILE.FIELD && map[x][y] !== World.TILE.BARRENS) return;

      $SM.set('character.mapSys.caveActive', true);
      $SM.set('character.mapSys.cavePos', [x, y]);
      Notifications.notify(MapSys, '地面震动！附近出现了一个神秘洞穴入口。');
      MapSys.updateMinimap();
    },

    _despawnCave: function() {
      if (!$SM.get('character.mapSys.caveActive')) return;
      $SM.set('character.mapSys.caveActive', false);
      $SM.set('character.mapSys.cavePos', null);
    },

    hasActiveCave: function() {
      return !!$SM.get('character.mapSys.caveActive');
    },

    enterCave: function() {
      if (!MapSys.hasActiveCave()) return;
      if (!$SM.get('features.location.caveDungeon')) $SM.set('features.location.caveDungeon', true);

      var floors = 3 + Math.floor(Math.random() * 3);
      var scene = {
        title: '神秘洞穴',
        scenes: {
          start: {
            text: ['一个散发着微光的洞穴入口出现在眼前。洞穴共有' + floors + '层。'],
            buttons: {
              '进入': { text: '进入洞穴', nextScene: 'entering' },
              '离开': { text: '离开', nextScene: 'end' }
            }
          },
          entering: { text: [], notification: '进入洞穴第1层...', onLoad: function() { MapSys._startCaveDive(floors); }, buttons: {} }
        }
      };
      Events.startEvent(MapSys, scene);
    },

    _startCaveDive: function(totalFloors) {
      MapSys._caveFloor = 1;
      MapSys._caveTotal = totalFloors;
      MapSys._spawnCaveFloor();
    },

    _spawnCaveFloor: function() {
      var f = MapSys._caveFloor;
      var hp = 30 + f * 25 + Math.floor(Math.random() * 20);
      var atk = 5 + f * 3 + Math.floor(Math.random() * 5);

      var loot = {};
      if (Math.random() < 0.5) loot['wood'] = { min: 10 + f * 5, max: 20 + f * 10, chance: 1 };
      if (Math.random() < 0.4) loot['iron'] = { min: 2 + f, max: 5 + f * 2, chance: 1 };
      if (f >= 2 && Math.random() < 0.3) loot['steel'] = { min: 1, max: f, chance: 1 };
      if (f >= 3 && Math.random() < 0.3) loot['scales'] = { min: 1, max: f, chance: 1 };
      if (Economy && Economy.getSpiritStone) loot['spiritStone'] = { min: 5 + f * 3, max: 10 + f * 5, chance: 1 };

      var scene = {
        title: '洞穴第' + f + '/' + totalFloors + '层',
        scenes: {
          start: {
            text: ['洞穴第' + f + '层，暗影中潜伏着洞穴妖兽...'],
            buttons: { '战斗': { nextScene: 'combat' }, '离开': { text: '退出洞穴', nextScene: 'end' } }
          },
          combat: {
            combat: true,
            notification: '洞穴妖兽袭来！',
            enemy: '洞穴妖兽(Lv.' + f + ')',
            enemyName: '洞穴妖兽',
            damage: atk, hit: 0.65 + f * 0.02,
            attackDelay: 2, health: hp, chara: 'c',
            ranged: false, loot: loot,
            buttons: { '继续': { text: '继续深入', nextScene: 'victory' } }
          },
          victory: {
            text: ['击败第' + f + '层守护妖兽！'],
            notification: '洞穴第' + f + '层 通过',
            onLoad: function() {
              MapSys._caveFloor++;
              if (MapSys._caveFloor > MapSys._caveTotal) {
                MapSys._caveClear();
              }
            },
            buttons: {
              '下一层': function() {
                if (MapSys._caveFloor <= MapSys._caveTotal) {
                  Events.switchEvent(MapSys._buildCaveBattle());
                } else {
                  MapSys._caveClear();
                }
              }
            }
          }
        }
      };
      Events.startEvent(MapSys, scene);
    },

    _buildCaveBattle: function() {
      var f = MapSys._caveFloor, total = MapSys._caveTotal;
      var hp = 30 + f * 25 + Math.floor(Math.random() * 20);
      var atk = 5 + f * 3 + Math.floor(Math.random() * 5);
      var loot = {};
      if (Math.random() < 0.5) loot['wood'] = { min: 10 + f * 5, max: 20 + f * 10, chance: 1 };
      if (Math.random() < 0.4) loot['iron'] = { min: 2 + f, max: 5 + f * 2, chance: 1 };
      if (f >= 2 && Math.random() < 0.3) loot['steel'] = { min: 1, max: f, chance: 1 };
      if (Economy && Economy.getSpiritStone) loot['spiritStone'] = { min: 5 + f * 3, max: 10 + f * 5, chance: 1 };
      if (MapSys._caveFloor === total) loot['spiritStone'] = { min: 20 + f * 10, max: 50 + f * 20, chance: 1 };

      return {
        title: '洞穴第' + f + '/' + total + '层',
        scenes: {
          start: {
            text: ['洞穴第' + f + '层...'],
            buttons: { '战斗': { nextScene: 'combat' }, '退出': { text: '退出洞穴', nextScene: 'end' } }
          },
          combat: {
            combat: true, notification: '洞穴妖兽袭来！',
            enemy: '洞穴妖兽(Lv.' + f + ')', enemyName: '洞穴妖兽',
            damage: atk, hit: 0.65 + f * 0.02,
            attackDelay: 2, health: hp, chara: 'c',
            ranged: false, loot: loot,
            buttons: { '继续': { text: '继续深入', nextScene: 'victory' } }
          },
          victory: {
            text: ['击败第' + f + '层守护妖兽！'],
            notification: '洞穴第' + f + '层 通过',
            onLoad: function() {
              MapSys._caveFloor++;
              if (MapSys._caveFloor > MapSys._caveTotal) MapSys._caveClear();
            },
            buttons: {
              '下一层': function() {
                if (MapSys._caveFloor <= MapSys._caveTotal) {
                  Events.switchEvent(MapSys._buildCaveBattle());
                } else {
                  MapSys._caveClear();
                }
              }
            }
          }
        }
      };
    },

    _caveClear: function() {
      MapSys._despawnCave();
      Notifications.notify(MapSys, '洞穴探险完成！');
      Engine.leaveRoom();
    }
  };
})();
