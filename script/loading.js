(function() {
  var Loading = window.Loading = {
    
    _overlay: null,
    _text: '',

    init: function() {},

    show: function(text) {
      if (!this._overlay) {
        this._overlay = document.createElement('div');
        this._overlay.className = 'loading-overlay';
        this._overlay.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">' + text + '</div>';
        document.body.appendChild(this._overlay);
      }
      if (text) {
        this._overlay.querySelector('.loading-text').textContent = text;
      }
    },

    hide: function() {
      if (this._overlay) {
        var overlay = this._overlay;
        this._overlay.classList.add('fade-out');
        setTimeout(function() {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 500);
        this._overlay = null;
      }
    }
  };
})();
