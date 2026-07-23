(function() {
  var Engine = window.Engine = {

    SITE_URL: encodeURIComponent("http://adarkroom.doublespeakgames.com"),
    VERSION: 1.3,
    MAX_STORE: 99999999999999,
    SAVE_DISPLAY: 30 * 1000,
    GAME_OVER: false,
    SAVE_SECRET: 'adr-save-v1-2024',

    //object event types
    topics: {},

    Perks: {
      'boxer': {
        name: _('boxer'),
        desc: _('punches do more damage'),
        /// TRANSLATORS : means with more force.
        notify: _('learned to throw punches with purpose')
      },
      'martial artist': {
        name: _('martial artist'),
        desc: _('punches do even more damage.'),
        notify: _('learned to fight quite effectively without weapons')
      },
      'unarmed master': {
        /// TRANSLATORS : master of unarmed combat
        name: _('unarmed master'),
        desc: _('punch twice as fast, and with even more force'),
        notify: _('learned to strike faster without weapons')
      },
      'barbarian': {
        name: _('barbarian'),
        desc: _('melee weapons deal more damage'),
        notify: _('learned to swing weapons with force')
      },
      'slow metabolism': {
        name: _('slow metabolism'),
        desc: _('go twice as far without eating'),
        notify: _('learned how to ignore the hunger')
      },
      'desert rat': {
        name: _('desert rat'),
        desc: _('go twice as far without drinking'),
        notify: _('learned to love the dry air')
      },
      'evasive': {
        name: _('evasive'),
        desc: _('dodge attacks more effectively'),
        notify: _("learned to be where they're not")
      },
      'precise': {
        name: _('precise'),
        desc: _('land blows more often'),
        notify: _('learned to predict their movement')
      },
      'scout': {
        name: _('scout'),
        desc: _('see farther'),
        notify: _('learned to look ahead')
      },
      'stealthy': {
        name: _('stealthy'),
        desc: _('better avoid conflict in the wild'),
        notify: _('learned how not to be seen')
      },
      'gastronome': {
        name: _('gastronome'),
        desc: _('restore more health when eating'),
        notify: _('learned to make the most of food')
      },
      'mixedRoot1': {
        name: '万法初通',
        desc: '杂灵根隐藏天赋：修炼效率+15%',
        notify: '杂灵根初现！万法皆可通，灵石消耗降低。'
      },
      'mixedRoot2': {
        name: '五行亲和',
        desc: '杂灵根隐藏天赋：坊市交易优惠20%',
        notify: '杂灵根觉醒！五行灵力流转，交易成本降低。'
      },
      'mixedRoot3': {
        name: '灵根觉醒',
        desc: '杂灵根隐藏天赋：战斗伤害+20%',
        notify: '杂灵根爆发！万法皆通，战力大幅提升。'
      },
      'mixedRoot4': {
        name: '万法归一',
        desc: '杂灵根隐藏天赋：灵界之力觉醒',
        notify: '万法归一！灰烬熔炉与杂灵根产生共鸣。'
      },
      'mixedRoot5': {
        name: '混沌道体',
        desc: '杂灵根隐藏天赋：全属性大幅提升',
        notify: '混沌道体！杂灵根终成终极体质。'
      }
    },

    options: {
      state: null,
      debug: false,
      log: false,
      dropbox: false,
      doubleTime: false
    },

    init: function(options) {
      this.options = $.extend(
        this.options,
        options
      );
      this._debug = this.options.debug;
      this._log = this.options.log;

      // Check for HTML5 support
      if(!Engine.browserValid()) {
        window.location = 'browserWarning.html';
      }

      Engine.disableSelection();

      if(this.options.state != null) {
        window.State = this.options.state;
      } else {
        Engine.loadGame();
      }

      // start loading music and events early
      for (var key in AudioLibrary) {
        if (
          key.toString().indexOf('MUSIC_') > -1 ||
          key.toString().indexOf('EVENT_') > -1) {
            AudioEngine.loadAudioFile(AudioLibrary[key]);
          }
      }

      $('<div>').attr('id', 'locationSlider').appendTo('#main');

      var menu = $('<div>')
        .addClass('menu')
        .appendTo('body');

      $('<span>')
        .addClass('volume menuBtn')
        .text(_('sound on.'))
        .click(() => Engine.toggleVolume())
        .appendTo(menu);

      $('<span>')
        .addClass('lightsOff menuBtn')
        .text(_('lights off.'))
        .click(Engine.turnLightsOff)
        .appendTo(menu);

      $('<span>')
        .addClass('hyper menuBtn')
        .text('金手指')
        .click(Engine.showCheats)
        .appendTo(menu);

      $('<span>')
        .addClass('menuBtn')
        .text('进度')
        .click(Engine.showProgress)
        .appendTo(menu);

      $('<span>')
        .addClass('menuBtn')
        .text(_('restart.'))
        .click(Engine.confirmDelete)
        .appendTo(menu);

      $('<span>')
        .addClass('menuBtn')
        .text(_('save.'))
        .click(Engine.exportImport)
        .appendTo(menu);

      if(this.options.dropbox && Engine.Dropbox) {
        this.dropbox = Engine.Dropbox.init();

        $('<span>')
          .addClass('menuBtn')
          .text(_('dropbox.'))
          .click(Engine.Dropbox.startDropbox)
          .appendTo(menu);
      }

      // 移动端通知切换按钮
      $('<div>').attr('id', 'notifToggle').text(_('notifications.')).click(function() {
        $('body').toggleClass('notif-open');
      }).appendTo('body');

      // Register keypress handlers
      $('body').off('keydown').keydown(Engine.keyDown);
      $('body').off('keyup').keyup(Engine.keyUp);

      // Register swipe handlers
      swipeElement = $('#outerSlider');
      swipeElement.on('swipeleft', Engine.swipeLeft);
      swipeElement.on('swiperight', Engine.swipeRight);
      swipeElement.on('swipeup', Engine.swipeUp);
      swipeElement.on('swipedown', Engine.swipeDown);

      // subscribe to stateUpdates
      $.Dispatch('stateUpdate').subscribe(Engine.handleStateUpdates);

      $SM.init();
      AudioEngine.init();
      Notifications.init();
      Events.init();
      Room.init();


      if(typeof $SM.get('stores.wood') != 'undefined') {
        Outside.init();
      }
      if($SM.get('stores.compass', true) > 0) {
        Path.init();
      }
      if ($SM.get('features.location.fabricator')) {
        Fabricator.init();
      }
      if($SM.get('features.location.spaceShip')) {
        Ship.init();
      }
      if ($SM.get('features.location.cultivation')) {
        Cultivation.init();
      }
      if ($SM.get('features.location.economy')) {
        Economy.init();
      }
      if ($SM.get('features.location.pet')) {
        Pet.init();
      }
      if ($SM.get('features.location.alchemy')) {
        Alchemy.init();
        Technique.init();
      }
      if ($SM.get('features.location.companion')) {
        Companion.init();
      }
      if ($SM.get('features.location.tribulation')) {
        Tribulation.init();
      }
      if ($SM.get('features.location.sect')) {
        Sect.init();
      }
      if ($SM.get('features.location.artifact')) {
        Artifact.init();
      }
      if ($SM.get('features.location.secretRealm')) {
        SecretRealm.init();
      }
      if ($SM.get('features.location.abyss')) {
        Abyss.init();
      }
      if ($SM.get('features.location.world')) {
        Beast.init();
        MapSys.init();
      }

      if($SM.get('config.lightsOff', true)){
        Engine.turnLightsOff();
      }

      if($SM.get('config.hyperMode', true)){
        Engine.triggerHyperMode();
      }

      Engine.toggleVolume(Boolean($SM.get('config.soundOn')));
      if(!AudioEngine.isAudioContextRunning()){
        document.addEventListener('click', Engine.resumeAudioContext, true);
      }
      
      Engine.saveLanguage();
      Engine.travelTo(Room);

      setTimeout(notifyAboutSound, 3000);

    },
    resumeAudioContext: function () {
      AudioEngine.tryResumingAudioContext();
      
      // turn on music!
          AudioEngine.setMasterVolume($SM.get('config.soundOn') ? 1.0 : 0.0, 0);

      document.removeEventListener('click', Engine.resumeAudioContext);
    },
    browserValid: function() {
      return ( location.search.indexOf( 'ignorebrowser=true' ) >= 0 || ( typeof Storage != 'undefined' && !oldIE ) );
    },

    isMobile: function() {
      return ( location.search.indexOf( 'ignorebrowser=true' ) < 0 && /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test( navigator.userAgent ) );
    },

    _computeSig: function(data) {
      var s = 0;
      for (var i = 0; i < data.length; i++) {
        s = (s * 31 + data.charCodeAt(i)) & 0x7FFFFFFF;
      }
      return s.toString(16);
    },

    _verifySave: function(data) {
      try {
        var s = JSON.parse(data);
        if (s && typeof s === 'object' && !Array.isArray(s)) return true;
        return false;
      } catch(e) {
        return false;
      }
    },

    saveGame: function() {
      if(typeof Storage != 'undefined' && localStorage) {
        if(Engine._saveTimer != null) {
          clearTimeout(Engine._saveTimer);
        }
        if(typeof Engine._lastNotify == 'undefined' || Date.now() - Engine._lastNotify > Engine.SAVE_DISPLAY){
          $('#saveNotify').css('opacity', 1).animate({opacity: 0}, 1000, 'linear');
          Engine._lastNotify = Date.now();
        }
        var json = JSON.stringify(State);
        var sig = Engine._computeSig(json + Engine.SAVE_SECRET);
        localStorage.gameState = json + '|sig:' + sig;
      }
    },

    loadGame: function() {
      try {
        var raw = localStorage.gameState || '';
        var idx = raw.lastIndexOf('|sig:');
        var json = idx === -1 ? raw : raw.slice(0, idx);
        var sig = idx === -1 ? '' : raw.slice(idx + 5);

        if (sig && Engine._computeSig(json + Engine.SAVE_SECRET) !== sig) {
          Engine.log('Save integrity check failed');
          throw new Error('bad sig');
        }
        if (idx === -1 && json.length > 0) {
          // legacy save without signature, accept but log
          Engine.log('loaded legacy save (no integrity check)');
        }

        var savedState = JSON.parse(json);
        if(savedState) {
          State = savedState;
          $SM.updateOldState();
          Engine.log("loaded save!");
        }
      } catch(e) {
        State = {};
        $SM.set('version', Engine.VERSION);
        Engine.event('progress', 'new game');
      }
    },

    exportImport: function() {
      Events.startEvent({
        title: _('Export / Import'),
        scenes: {
          start: {
            text: [
              _('export or import save data, for backing up'),
              _('or migrating computers')
            ],
            buttons: {
              'export': {
                text: _('export'),
                nextScene: {1: 'inputExport'}
              },
              'import': {
                text: _('import'),
                nextScene: {1: 'confirm'}
              },
              'cancel': {
                text: _('cancel'),
                nextScene: 'end'
              }
            }
          },
          'inputExport': {
            text: [_('save this.')],
            textarea: Engine.export64(),
            onLoad: function() { Engine.event('progress', 'export'); },
            readonly: true,
            buttons: {
              'done': {
                text: _('got it'),
                nextScene: 'end',
                onChoose: Engine.disableSelection
              }
            }
          },
          'confirm': {
            text: [
              _('are you sure?'),
              _('if the code is invalid, all data will be lost.'),
              _('this is irreversible.')
            ],
            buttons: {
              'yes': {
                text: _('yes'),
                nextScene: {1: 'inputImport'},
                onChoose: Engine.enableSelection
              },
              'no': {
                text: _('no'),
                nextScene: {1: 'start'}
              }
            }
          },
          'inputImport': {
            text: [_('put the save code here.')],
            textarea: '',
            buttons: {
              'okay': {
                text: _('import'),
                nextScene: 'end',
                onChoose: Engine.import64
              },
              'cancel': {
                text: _('cancel'),
                nextScene: 'end'
              }
            }
          }
        }
      });
    },

    generateExport64: function(){
      var raw = localStorage.gameState;
      var string64 = Base64.encode(raw);
      string64 = string64.replace(/\s/g, '');
      string64 = string64.replace(/\n/g, '');
      return string64;
    },

    export64: function() {
      Engine.saveGame();
      Engine.enableSelection();
      return Engine.generateExport64();
    },

    import64: function(string64) {
      Engine.event('progress', 'import');
      Engine.disableSelection();
      string64 = string64.replace(/\s/g, '');
      string64 = string64.replace(/\n/g, '');
      var decodedSave = Base64.decode(string64);
      if (!Engine._verifySave(decodedSave)) {
        Engine.log('WARNING: imported data is not valid JSON, rejecting');
        Events.startEvent({
          title: _('Import Error'),
          scenes: {
            start: {
              text: [_('the save data is invalid or corrupted.')],
              buttons: {
                'ok': { text: _('ok'), nextScene: 'end' }
              }
            }
          }
        });
        return;
      }
      localStorage.gameState = decodedSave;
      location.reload();
    },

    event: function(cat, act) {
      if(typeof ga === 'function') {
        ga('send', 'event', cat, act);
      }
      if(cat === 'progress') {
        $SM.set('progress.' + act, true);
      }
    },

    confirmDelete: function() {
      Events.startEvent({
        title: _('Restart?'),
        scenes: {
          start: {
            text: [_('restart the game?')],
            buttons: {
              'yes': {
                text: _('yes'),
                nextScene: 'end',
                onChoose: Engine.deleteSave
              },
              'no': {
                text: _('no'),
                nextScene: 'end'
              }
            }
          }
        }
      });
    },

    deleteSave: function(noReload) {
      if(typeof Storage != 'undefined' && localStorage) {
        var prestige = Prestige.get();
        window.State = {};
        localStorage.clear();
        Prestige.set(prestige);
      }
      if(!noReload) {
        location.reload();
      }
    },

    getApp: function() {
      Events.startEvent({
        title: _('Get the App'),
        scenes: {
          start: {
            text: [_('bring the room with you.')],
            buttons: {
              'ios': {
                text: _('ios'),
                nextScene: 'end',
                onChoose: function () {
                  window.open('https://itunes.apple.com/app/apple-store/id736683061?pt=2073437&ct=adrproper&mt=8');
                }
              },
              'android': {
                text: _('android'),
                nextScene: 'end',
                onChoose: function() {
                  window.open('https://play.google.com/store/apps/details?id=com.yourcompany.adarkroom');
                }
              },
              'close': {
                text: _('close'),
                nextScene: 'end'
              }
            }
          }
        }
      });
    },

    share: function() {
      Events.startEvent({
        title: _('Share'),
        scenes: {
          start: {
            text: [_('bring your friends.')],
            buttons: {
              'facebook': {
                text: _('facebook'),
                nextScene: 'end',
                onChoose: function() {
                  window.open('https://www.facebook.com/sharer/sharer.php?u=' + Engine.SITE_URL, 'sharer', 'width=626,height=436,location=no,menubar=no,resizable=no,scrollbars=no,status=no,toolbar=no');
                }
              },
              'google': {
                text:_('google+'),
                nextScene: 'end',
                onChoose: function() {
                  window.open('https://plus.google.com/share?url=' + Engine.SITE_URL, 'sharer', 'width=480,height=436,location=no,menubar=no,resizable=no,scrollbars=no,status=no,toolbar=no');
                }
              },
              'twitter': {
                text: _('twitter'),
                nextScene: 'end',
                onChoose: function() {
                  window.open('https://twitter.com/intent/tweet?text=A%20Dark%20Room&url=' + Engine.SITE_URL, 'sharer', 'width=660,height=260,location=no,menubar=no,resizable=no,scrollbars=yes,status=no,toolbar=no');
                }
              },
              'reddit': {
                text: _('reddit'),
                nextScene: 'end',
                onChoose: function() {
                  window.open('http://www.reddit.com/submit?url=' + Engine.SITE_URL, 'sharer', 'width=960,height=700,location=no,menubar=no,resizable=no,scrollbars=yes,status=no,toolbar=no');
                }
              },
              'close': {
                text: _('close'),
                nextScene: 'end'
              }
            }
          }
        }
      },
      {
        width: '400px'
      });
    },

    findStylesheet: function(title) {
      for(var i=0; i<document.styleSheets.length; i++) {
        var sheet = document.styleSheets[i];
        if(sheet.title == title) {
          return sheet;
        }
      }
      return null;
    },

    isLightsOff: function() {
      var darkCss = Engine.findStylesheet('darkenLights');
      if ( darkCss != null && !darkCss.disabled ) {
        return true;
      }
      return false;
    },

    turnLightsOff: function() {
      var darkCss = Engine.findStylesheet('darkenLights');
      if (darkCss == null) {
        $('head').append('<link rel="stylesheet" href="css/dark.css" type="text/css" title="darkenLights" />');
        $('.lightsOff').text(_('lights on.'));
        $SM.set('config.lightsOff', true, true);
      } else if (darkCss.disabled) {
        darkCss.disabled = false;
        $('.lightsOff').text(_('lights on.'));
        $SM.set('config.lightsOff', true,true);
      } else {
        $("#darkenLights").attr("disabled", "disabled");
        darkCss.disabled = true;
        $('.lightsOff').text(_('lights off.'));
        $SM.set('config.lightsOff', false, true);
      }
    },

    showCheats: function() {
      Events.startEvent({
        title: '金手指',
        scenes: {
          start: {
            text: [
              '修炼速度：' + (Engine.getSpeed()) + 'x',
              '选择功能：'
            ],
            buttons: {
              'speedToggle': {
                text: Engine.getSpeed() > 1 ? '减速至 1x' : '加速至 2x',
                onChoose: function() {
                  if (Engine.getSpeed() > 1) {
                    Engine.setCheatSpeed(1);
                  } else {
                    Engine.setCheatSpeed(2);
                  }
                }
              },
              'speedMenu': {
                text: '速度设置',
                nextScene: 'speedScene'
              },
              'btnResources': {
                text: '灵石补给 (+5000灵石)',
                onChoose: function() {
                  $SM.add('stores.wood', 5000);
                  Notifications.notify(null, '获得灵石 x5000');
                  Events.endEvent();
                }
              },
              'btnHerbs': {
                text: '灵草补给 (+3000灵草)',
                onChoose: function() {
                  $SM.add('stores.fur', 3000);
                  Notifications.notify(null, '获得灵草 x3000');
                  Events.endEvent();
                }
              },
              'btnAlloy': {
                text: '仙玉降临 (+50仙玉)',
                onChoose: function() {
                  $SM.add('stores["alien alloy"]', 50);
                  Notifications.notify(null, '获得仙玉 x50');
                  Events.endEvent();
                }
              },
              'btnAllRes': {
                text: '万宝归宗 (所有资源+1000)',
                onChoose: function() {
                  var res = ['wood', 'fur', 'meat', 'scales', 'teeth', 'leather', 'cloth',
                    'iron', 'coal', 'sulphur', 'steel', 'cured meat', 'bait', 'torch',
                    'bullets', 'energy cell', 'medicine'];
                  for (var i in res) {
                    $SM.add('stores["' + res[i] + '"]', 1000);
                  }
                  $SM.add('stores["alien alloy"]', 10);
                  Notifications.notify(null, '万宝归宗！所有资源 +1000');
                  Events.endEvent();
                }
              },
              'exitBtn': {
                text: '关闭',
                onChoose: function() {
                  Events.endEvent();
                }
              }
            }
          },
          speedScene: {
            text: [
              '当前速度：' + Engine.getSpeed() + 'x',
              '选择修炼速度：'
            ],
            buttons: {
              'sp1x': {
                text: '1x (正常)',
                onChoose: function() {
                  Engine.setCheatSpeed(1);
                  Events.endEvent();
                }
              },
              'sp2x': {
                text: '2x (双倍)',
                onChoose: function() {
                  Engine.setCheatSpeed(2);
                  Events.endEvent();
                }
              },
              'sp5x': {
                text: '5x (五倍)',
                onChoose: function() {
                  Engine.setCheatSpeed(5);
                  Events.endEvent();
                }
              },
              'sp10x': {
                text: '10x (极速)',
                onChoose: function() {
                  Engine.setCheatSpeed(10);
                  Events.endEvent();
                }
              },
              'backToStart': {
                text: '返回',
                nextScene: 'start'
              }
            }
          }
        }
      });
    },

    CHEAT_SPEED: 1,

    getSpeed: function() {
      return Engine.CHEAT_SPEED || 1;
    },

    setCheatSpeed: function(speed) {
      Engine.CHEAT_SPEED = speed;
      if (speed > 1) {
        $('.hyper').text('金手指 ' + speed + 'x');
      } else {
        $('.hyper').text('金手指');
      }
      Notifications.notify(null, '修炼速度设置为 ' + speed + 'x');
    },

    confirmHyperMode: function(){
      if (!Engine.options.doubleTime) {
        Events.startEvent({
          title: _('Go Hyper?'),
          scenes: {
            start: {
              text: [_('turning hyper mode speeds up the game to x2 speed. do you want to do that?')],
              buttons: {
                'yes': {
                  text: _('yes'),
                  nextScene: 'end',
                  onChoose: Engine.triggerHyperMode
                },
                'no': {
                  text: _('no'),
                  nextScene: 'end'
                }
              }
            }
          }
        });
      } else {
        Engine.triggerHyperMode();
      }
    },

    triggerHyperMode: function() {
      Engine.options.doubleTime = !Engine.options.doubleTime;
      if(Engine.options.doubleTime)
        $('.hyper').text(_('classic.'));
      else
        $('.hyper').text(_('hyper.'));

      $SM.set('config.hyperMode', Engine.options.doubleTime, false);
    },

    showProgress: function() {
      var achievements = [
        { id: 'new game', name: '踏入修仙路', desc: '开始新的修仙之旅' },
        { id: 'outside', name: '初探外界', desc: '离开山洞，探索外界' },
        { id: 'path', name: '踏上征程', desc: '第一次出发探索' },
        { id: 'dungeon cleared', name: '扫平地窟', desc: '清除妖兽巢穴' },
        { id: 'sulphur mine', name: '发现硫磺矿', desc: '发现硫磺矿脉' },
        { id: 'iron mine', name: '发现铁矿', desc: '发现铁矿脉' },
        { id: 'coal mine', name: '发现煤矿', desc: '发现煤矿脉' },
        { id: 'ship', name: '建造飞船', desc: '建造星际飞船' },
        { id: 'fabricator', name: '启动工厂', desc: '启动仙晶工厂' },
        { id: 'crash', name: '坠入异星', desc: '飞船坠毁在陌生星球' },
        { id: 'win', name: '飞升成功', desc: '通关飞升' }
      ];

      var completed = 0;
      var lines = [];
      for (var i = 0; i < achievements.length; i++) {
        var done = $SM.get('progress.' + achievements[i].id);
        if (done) {
          completed++;
          lines.push('  ' + achievements[i].name + ' - ' + achievements[i].desc + ' [已完成]');
        } else {
          lines.push('  ' + achievements[i].name + ' - ' + achievements[i].desc + ' [未完成]');
        }
      }

      var score = Score.calculateScore();
      var totalScore = Score.totalScore();

      lines.push('');
      lines.push('当前分数: ' + score);
      lines.push('总分: ' + totalScore);
      lines.push('');
      lines.push('进度: ' + completed + '/' + achievements.length);

      Events.startEvent({
        title: '修仙进度',
        scenes: {
          start: {
            text: lines,
            buttons: {
              'close': {
                text: '关闭',
                nextScene: 'end'
              }
            }
          }
        }
      });
    },

    // Gets a guid
    getGuid: function() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
      });
    },

    activeModule: null,

    travelTo: function(module) {
      if(Engine.activeModule == module) {
        return;
      }

      var currentIndex = Engine.activeModule ? $('.location').index(Engine.activeModule.panel) : 1;
      $('div.headerButton').removeClass('selected');
      module.tab.addClass('selected');

      var slider = $('#locationSlider');
      var stores = $('#storesContainer');
      var panelIndex = $('.location').index(module.panel);
      var diff = Math.abs(panelIndex - currentIndex);
      slider.animate({left: -(panelIndex * 700) + 'px'}, 300 * diff);

      if($SM.get('stores.wood') !== undefined) {
        // FIXME Why does this work if there's an animation queue...?
        stores.animate({right: -(panelIndex * 700) + 'px'}, 300 * diff);
      }

      if(Engine.activeModule == Room || Engine.activeModule == Path || Engine.activeModule == Fabricator) {
        // Don't fade out the weapons if we're switching to a module
        // where we're going to keep showing them anyway.
        if (module != Room && module != Path && module != Fabricator) {
          $('div#weapons').animate({opacity: 0}, 300);
        }
      }

      if(module == Room || module == Path || module == Fabricator) {
        $('div#weapons').animate({opacity: 1}, 300);
      }

      Engine.activeModule = module;
      module.onArrival(diff);
      Notifications.printQueue(module);
    },

    /* Move the stores panel beneath top_container (or to top: 0px if top_container
     * either hasn't been filled in or is null) using transition_diff to sync with
     * the animation in Engine.travelTo().
     */
    moveStoresView: function(top_container, transition_diff) {
      var stores = $('#storesContainer');

      // If we don't have a storesContainer yet, leave.
      if(typeof(stores) === 'undefined') return;

      if(typeof(transition_diff) === 'undefined') transition_diff = 1;

      if(top_container === null) {
        stores.animate({top: '0px'}, {queue: false, duration: 300 * transition_diff});
      }
      else if(!top_container.length) {
        stores.animate({top: '0px'}, {queue: false, duration: 300 * transition_diff});
      }
      else {
        stores.animate({
          top: top_container.height() + 26 + 'px'
        }, {
          queue: false,
          duration: 300 * transition_diff
        });
      }
    },

    log: function(msg) {
      if(this._log) {
        console.log(msg);
      }
    },

    updateSlider: function() {
      var slider = $('#locationSlider');
      slider.width((slider.children().length * 700) + 'px');
    },

    updateOuterSlider: function() {
      var slider = $('#outerSlider');
      slider.width((slider.children().length * 700) + 'px');
    },

    getIncomeMsg: function(num, delay) {
      return _("{0} per {1}s", (num > 0 ? "+" : "") + num, delay);
      //return (num > 0 ? "+" : "") + num + " per " + delay + "s";
    },

    keyLock: false,
    tabNavigation: true,
    restoreNavigation: false,

    keyDown: function(e) {
      e = e || window.event;
      if(!Engine.keyPressed && !Engine.keyLock) {
        Engine.pressed = true;
        if(Engine.activeModule.keyDown) {
          Engine.activeModule.keyDown(e);
        }
      }
      return jQuery.inArray(e.keycode, [37,38,39,40]) < 0;
    },

    keyUp: function(e) {
      Engine.pressed = false;
      if(Engine.activeModule.keyUp) {
        Engine.activeModule.keyUp(e);
      } else {
        switch(e.which) {
          case 38: // Up
          case 87:
            Engine.log('up');
            break;
          case 40: // Down
          case 83:
            Engine.log('down');
            break;
          case 37: // Left
          case 65:
            if (Engine.tabNavigation) {
              if (Engine.activeModule == Ship && Fabricator.tab) {
                Engine.travelTo(Fabricator);
              }
              else if ((Engine.activeModule == Ship || Engine.activeModule == Fabricator) && Path.tab) {
                Engine.travelTo(Path);
              }
              else if (Engine.activeModule == Path && Outside.tab) {
                Engine.travelTo(Outside);
              } 
              else if (Engine.activeModule == Outside && Room.tab) {
                Engine.travelTo(Room);
              }
            }
            Engine.log('left');
            break;
          case 39: // Right
          case 68:
            if (Engine.tabNavigation){
              if (Engine.activeModule == Room && Outside.tab) {
                Engine.travelTo(Outside);
              }
              else if (Engine.activeModule == Outside && Path.tab){
                Engine.travelTo(Path);
              }
              else if(Engine.activeModule == Path && Fabricator.tab) {
                Engine.travelTo(Fabricator);
              }
              else if ((Engine.activeModule == Path || Engine.activeModule == Fabricator) && Ship.tab){
                Engine.travelTo(Ship);
              }
            }
            Engine.log('right');
            break;
        }
      }
      if(Engine.restoreNavigation){
        Engine.tabNavigation = true;
        Engine.restoreNavigation = false;
      }
      return false;
    },

    swipeLeft: function(e) {
      if(Engine.activeModule.swipeLeft) {
        Engine.activeModule.swipeLeft(e);
      }
    },

    swipeRight: function(e) {
      if(Engine.activeModule.swipeRight) {
        Engine.activeModule.swipeRight(e);
      }
    },

    swipeUp: function(e) {
      if(Engine.activeModule.swipeUp) {
        Engine.activeModule.swipeUp(e);
      }
    },

    swipeDown: function(e) {
      if(Engine.activeModule.swipeDown) {
        Engine.activeModule.swipeDown(e);
      }
    },

    disableSelection: function() {
      document.onselectstart = eventNullifier; // this is for IE
      document.onmousedown = eventNullifier; // this is for the rest
    },

    enableSelection: function() {
      document.onselectstart = eventPassthrough;
      document.onmousedown = eventPassthrough;
    },

    autoSelect: function(selector) {
      $(selector).focus().select();
    },

    handleStateUpdates: function(e){

    },

    switchLanguage: function(dom){
      var lang = $(dom).data("language");
      if(document.location.href.search(/[\?\&]lang=[a-z_]+/) != -1){
        document.location.href = document.location.href.replace( /([\?\&]lang=)([a-z_]+)/gi , "$1"+lang );
      }else{
        document.location.href = document.location.href + ( (document.location.href.search(/\?/) != -1 )?"&":"?") + "lang="+lang;
      }
    },

    saveLanguage: function(){
      var lang = decodeURIComponent((new RegExp('[?|&]lang=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
      if(lang && typeof Storage != 'undefined' && localStorage) {
        localStorage.lang = lang;
      }
    },

    toggleVolume: function(enabled /* optional */) {
      if (enabled == null) {
        enabled = !$SM.get('config.soundOn');
      }
      if (!enabled) {
        $('.volume').text(_('sound on.'));
        $SM.set('config.soundOn', false);
        AudioEngine.setMasterVolume(0.0);
      } else {
        $('.volume').text(_('sound off.'));
        $SM.set('config.soundOn', true);
        AudioEngine.setMasterVolume(1.0);
      }
    },

    setInterval: function(callback, interval, skipDouble){
      var speed = Engine.CHEAT_SPEED || (Engine.options.doubleTime ? 2 : 1);
      if( speed > 1 && !skipDouble ){
        interval /= speed;
      }

      return setInterval(callback, interval);

    },

    setTimeout: function(callback, timeout, skipDouble){

      var speed = Engine.CHEAT_SPEED || (Engine.options.doubleTime ? 2 : 1);
      if( speed > 1 && !skipDouble ){
        timeout /= speed;
      }

      return setTimeout(callback, timeout);

    }
  };

  function eventNullifier(e) {
    return $(e.target).hasClass('menuBtn');
  }

  function eventPassthrough(e) {
    return true;
  }

  function notifyAboutSound() {
    if ($SM.get('playStats.audioAlertShown')) {
      return;
    }

    // Tell new users that there's sound now!
    $SM.set('playStats.audioAlertShown', true);
    Events.startEvent({
      title: _('Sound Available!'),
      scenes: {
        start: {
          text: [
            _('ears flooded with new sensations.'),
            _('perhaps silence is safer?')
          ],
          buttons: {
            'yes': {
              text: _('enable audio'),
              nextScene: 'end',
              onChoose: () => Engine.toggleVolume(true)
            },
            'no': {
              text: _('disable audio'),
              nextScene: 'end',
              onChoose: () => Engine.toggleVolume(false)
            }
          }
        }
      }
    });
  }

})();

function inView(dir, elem){

  var scTop = $('#main').offset().top;
  var scBot = scTop + $('#main').height();

  var elTop = elem.offset().top;
  var elBot = elTop + elem.height();

  if( dir == 'up' ){
    // STOP MOVING IF BOTTOM OF ELEMENT IS VISIBLE IN SCREEN
    return ( elBot < scBot );
  } else if( dir == 'down' ){
    return ( elTop > scTop );
  } else {
    return ( ( elBot <= scBot ) && ( elTop >= scTop ) );
  }

}

function setYPosition(elem, y) {
  var elTop = parseInt( elem.css('top'), 10 );
  elem.css('top', `${y}px`);
}


//create jQuery Callbacks() to handle object events
$.Dispatch = function( id ) {
  var callbacks, topic = id && Engine.topics[ id ];
  if ( !topic ) {
    callbacks = jQuery.Callbacks();
    topic = {
      publish: callbacks.fire,
      subscribe: callbacks.add,
      unsubscribe: callbacks.remove
    };
    if ( id ) {
      Engine.topics[ id ] = topic;
    }
  }
  return topic;
};

$(function() {
  Engine.init();
});
