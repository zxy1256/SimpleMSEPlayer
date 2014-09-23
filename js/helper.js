/**
 * @fileoverview Some utils for debugging on TVs
 */

'use strict';
var TVDebugUtil = (function() {
  // ==========================
  // Logging
  // ==========================
  var beginTime = Date.now();

  function LOG(msg) {
    var text = '[' + (Date.now() - beginTime) + ' ms] ' + msg;
    window.console.log(text);
    return text;
  }

  function logToRemote_(msg) {
    var xhr = new XMLHttpRequest();
    var url = '/log?msg=' + encodeURIComponent(msg);
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send();
  };


  function abductLogger() {
    var logToConsole = window.console.log.bind(window.console);
    var logger = function() {
      var argv = Array.prototype.slice.call(arguments).sort();
      var msg = argv.join(' ');
      logToRemote_(msg);
      logToConsole(msg);
    };
    var methods = ['debug', 'error', 'info', 'log', 'warn'];
    for (var i = methods.length - 1; i >= 0; i--) {
      window.console[methods[i]] = logger;
    }
    window.console.log(
        '=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=');
  }

  // ==========================
  // Navigation 
  // ==========================
  function redirect(url) {
    LOG('|==Redirect==> ' + url);
    setTimeout(function() {
      window.location.href = url;
    }, 100);
  }

  function tvPlay(id) {
    redirect('https://www.youtube.com/tv#/watch?v=' + id +
        '&autoplay=1' +
        '&env_isVideoInfoVisible=1' +
        '&forced_experiments=tv_dash_live_player');
  }

  function embedPlay(id) {
    redirect('http://www.youtube.com/embed/' + id + '?autoplay=1' +
        '&forced_experiments=html5_dash_live_player,no_ads&Debug=true');
  }

  // ==========================
  // TV Remote key binding 
  // ==========================

  function remoteControlKeyBinder() {
    document.addEventListener('keydown', function(e) {
      LOG('Key pressed: ' + e.keyCode);
      // Key code:
      // left: 37
      // right: 39
      // up: 38
      // down: 40
      // OK: 13
      // Backward: 177
      // Forward: 176
      // Play: 250
      // Stop: 178
      // Pause: 19
      switch (e.keyCode) {
        case 13: location.reload(); break; // ENTER to reload
        case 37: history.go(-1); break; // LEFT-ARROW to go back
        case 39: history.go(1); break; // RIGHT-ARROW to go forward
        //case 48: redirect('http://wenyu.sbo.corp.google.com:8887'); break;
        //case 49: embedPlay('oj_su-7IBlU'); break;
        //case 50: embedPlay('wZHwpyXFB88'); break;
        //case 51: embedPlay('VgRc2BpoTGA'); break;
      }
    });
  }

  abductLogger();
  remoteControlKeyBinder();
})();
