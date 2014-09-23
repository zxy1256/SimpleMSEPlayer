// ========================================
// AJAX
// ========================================
var ajax = function(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function(e) {
    callback.apply(this, [e.target.response]);
  };
  xhr.send();
  return xhr;
};

var get = function(url) {
  // Return a new promise.
  var deferred = Q.defer()
  // Do the usual XHR stuff
  var req = new XMLHttpRequest();
  req.open('GET', url);
  req.responseType = "arraybuffer";


  req.onload = function() {
    // This is called even on 404 etc
    // so check the status
    if (req.status == 200) {
      // Resolve the promise with the response text
      deferred.resolve(req.response);
    }
    else {
      // Otherwise reject with the status text
      // which will hopefully be a meaningful error
      deferred.reject(Error(req.statusText));
    }
  };

  // Handle network errors
  req.onerror = function() {
    deferred.reject(Error("Network Error"));
  };

  // Make the request
  req.send();

  return deferred.promise;
};


// ========================================
// Logging
// ========================================

var beginTime = Date.now();

var log = function(msg) {
  var text ='[' + (Date.now() - beginTime) + ' ms] ' + msg;
  console.log(text);
//  logToDocument(text);
  //logToRemote(text);
};

var logToDocument = function(msg) {
  var node = document.createElement("LI");
  var text = document.createTextNode(msg);
  node.appendChild(text);
  var logConsoleNode = document.getElementById("eventLog");
  logConsoleNode.insertBefore(node, logConsoleNode.firstChild);
};

var logToRemote = function(msg) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/log', true);
  xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  xhr.send('msg=' + encodeURIComponent(msg));
};

// ========================================
// Misc
// ========================================
var _ = {
  bind: function(func, obj) {
    return func.bind(obj);
  }
};

// ========================================
// Events/Pubsub
// ========================================
var amplify = {
  events_: {},

  fetch_: function(evt) {
    if (evt in this.events_) {
      return this.events_[evt];
    }
    return this.events_[evt] = [];
  },

  subscribe: function(evt, func) {
    this.fetch_(evt).push(func);
  },

  publish: function(evt) {
    this.fetch_(evt).forEach(function(func) {
      func();
    });
  }
};


function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}
