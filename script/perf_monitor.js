(function() {
  var PerfMonitor = window.PerfMonitor = {
    
    _markers: [],
    _interval: null,
    _samples: [],

    start: function(name) {
      var start = performance.now();
      this._markers.push({name: name, start: start});
    },

    end: function(name) {
      var marker = this._markers.filter(function(m) {
        return m.name === name && !m.end;
      });
      if (marker.length) {
        var end = performance.now();
        marker[0].end = end;
        marker[0].duration = end - marker[0].start;
        
        // 记录超过 100ms 的操作
        if (marker[0].duration > 100) {
          console.log('[Perf]', name, marker[0].duration.toFixed(2), 'ms');
          
          var last = JSON.parse(localStorage.getItem('perf_samples') || '[]');
          last.push({name: name, duration: marker[0].duration});
          if (last.length > 100) last.shift();
          localStorage.setItem('perf_samples', JSON.stringify(last));
        }
      }
    },

    getTotalTime: function() {
      var total = 0;
      for (var i = 0; i < this._markers.length; i++) {
        var m = this._markers[i];
        if (m.end) {
          total += m.duration;
        }
      }
      return total;
    },

    clear: function() {
      this._markers = [];
      this._samples = [];
    },

    init: function() {
      if (this._interval) clearInterval(this._interval);
      
      var self = this;
      this._interval = setInterval(function() {
        var total = self.getTotalTime();
        try {
          var samples = JSON.parse(localStorage.getItem('perf_total_time') || '[]');
          samples.push({value: total, time: Date.now()});
          if (samples.length > 100) samples.shift();
          localStorage.setItem('perf_total_time', JSON.stringify(samples));
        } catch(e) {}
      }, 5000);
    }
  };
})();
