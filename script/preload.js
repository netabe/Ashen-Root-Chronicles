(function() {
  var Preload = window.Preload = {
    
    images: [],
    audio: [],
    scripts: [],

    addImage: function(src, priority) {
      this.images.push({src: src, priority: priority || 0});
    },

    addAudio: function(src, name) {
      this.audio.push({src: src, name: name});
    },

    preloadAll: function(onComplete) {
      var totalImages = this.images.length;
      var loadedImages = 0;
      
      for (var i = 0; i < this.images.length; i++) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
          loadedImages++;
          if (loadedImages === totalImages && onComplete) {
            onComplete();
          }
        };
        img.onerror = function() {
          loadedImages++;
          if (loadedImages === totalImages && onComplete) {
            onComplete();
          }
        };
        img.src = this.images[i].src;
      }
      
      for (var j = 0; j < this.audio.length; j++) {
        var audio = new Audio(this.audio[j].src);
        audio.load();
      }
    },

    clear: function() {
      this.images = [];
      this.audio = [];
      this.scripts = [];
    }
  };
})();
