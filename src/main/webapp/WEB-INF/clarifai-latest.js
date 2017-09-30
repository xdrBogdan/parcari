/**
 * Clarifai JavaScript SDK v2.4.0
 *
 * Last updated: Tue Sep 12 2017 15:06:21 GMT+0000 (UTC)
 *
 * Visit https://developer.clarifai.com
 *
 * Copyright (c) 2016-present, Clarifai, Inc.
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 *
 * The source tree of this library can be found at
 *   https://github.com/Clarifai/clarifai-javascript
 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

// rawAsap provides everything we need except exception management.
var rawAsap = require("./raw");
// RawTasks are recycled to reduce GC churn.
var freeTasks = [];
// We queue errors to ensure they are thrown in right order (FIFO).
// Array-as-queue is good enough here, since we are just dealing with exceptions.
var pendingErrors = [];
var requestErrorThrow = rawAsap.makeRequestCallFromTimer(throwFirstError);

function throwFirstError() {
    if (pendingErrors.length) {
        throw pendingErrors.shift();
    }
}

/**
 * Calls a task as soon as possible after returning, in its own event, with priority
 * over other events like animation, reflow, and repaint. An error thrown from an
 * event will not interrupt, nor even substantially slow down the processing of
 * other events, but will be rather postponed to a lower priority event.
 * @param {{call}} task A callable object, typically a function that takes no
 * arguments.
 */
module.exports = asap;
function asap(task) {
    var rawTask;
    if (freeTasks.length) {
        rawTask = freeTasks.pop();
    } else {
        rawTask = new RawTask();
    }
    rawTask.task = task;
    rawAsap(rawTask);
}

// We wrap tasks with recyclable task objects.  A task object implements
// `call`, just like a function.
function RawTask() {
    this.task = null;
}

// The sole purpose of wrapping the task is to catch the exception and recycle
// the task object after its single use.
RawTask.prototype.call = function () {
    try {
        this.task.call();
    } catch (error) {
        if (asap.onerror) {
            // This hook exists purely for testing purposes.
            // Its name will be periodically randomized to break any code that
            // depends on its existence.
            asap.onerror(error);
        } else {
            // In a web browser, exceptions are not fatal. However, to avoid
            // slowing down the queue of pending tasks, we rethrow the error in a
            // lower priority turn.
            pendingErrors.push(error);
            requestErrorThrow();
        }
    } finally {
        this.task = null;
        freeTasks[freeTasks.length] = this;
    }
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/asap/browser-asap.js","/../node_modules/asap")
},{"./raw":2,"buffer":23,"pBGvAp":27}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

// Use the fastest means possible to execute a task in its own turn, with
// priority over other events including IO, animation, reflow, and redraw
// events in browsers.
//
// An exception thrown by a task will permanently interrupt the processing of
// subsequent tasks. The higher level `asap` function ensures that if an
// exception is thrown by a task, that the task queue will continue flushing as
// soon as possible, but if you use `rawAsap` directly, you are responsible to
// either ensure that no exceptions are thrown from your task, or to manually
// call `rawAsap.requestFlush` if an exception is thrown.
module.exports = rawAsap;
function rawAsap(task) {
    if (!queue.length) {
        requestFlush();
        flushing = true;
    }
    // Equivalent to push, but avoids a function call.
    queue[queue.length] = task;
}

var queue = [];
// Once a flush has been requested, no further calls to `requestFlush` are
// necessary until the next `flush` completes.
var flushing = false;
// `requestFlush` is an implementation-specific method that attempts to kick
// off a `flush` event as quickly as possible. `flush` will attempt to exhaust
// the event queue before yielding to the browser's own event loop.
var requestFlush;
// The position of the next task to execute in the task queue. This is
// preserved between calls to `flush` so that it can be resumed if
// a task throws an exception.
var index = 0;
// If a task schedules additional tasks recursively, the task queue can grow
// unbounded. To prevent memory exhaustion, the task queue will periodically
// truncate already-completed tasks.
var capacity = 1024;

// The flush function processes all tasks that have been scheduled with
// `rawAsap` unless and until one of those tasks throws an exception.
// If a task throws an exception, `flush` ensures that its state will remain
// consistent and will resume where it left off when called again.
// However, `flush` does not make any arrangements to be called again if an
// exception is thrown.
function flush() {
    while (index < queue.length) {
        var currentIndex = index;
        // Advance the index before calling the task. This ensures that we will
        // begin flushing on the next task the task throws an error.
        index = index + 1;
        queue[currentIndex].call();
        // Prevent leaking memory for long chains of recursive calls to `asap`.
        // If we call `asap` within tasks scheduled by `asap`, the queue will
        // grow, but to avoid an O(n) walk for every task we execute, we don't
        // shift tasks off the queue after they have been executed.
        // Instead, we periodically shift 1024 tasks off the queue.
        if (index > capacity) {
            // Manually shift all values starting at the index back to the
            // beginning of the queue.
            for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
                queue[scan] = queue[scan + index];
            }
            queue.length -= index;
            index = 0;
        }
    }
    queue.length = 0;
    index = 0;
    flushing = false;
}

// `requestFlush` is implemented using a strategy based on data collected from
// every available SauceLabs Selenium web driver worker at time of writing.
// https://docs.google.com/spreadsheets/d/1mG-5UYGup5qxGdEMWkhP6BWCz053NUb2E1QoUTU16uA/edit#gid=783724593

// Safari 6 and 6.1 for desktop, iPad, and iPhone are the only browsers that
// have WebKitMutationObserver but not un-prefixed MutationObserver.
// Must use `global` or `self` instead of `window` to work in both frames and web
// workers. `global` is a provision of Browserify, Mr, Mrs, or Mop.

/* globals self */
var scope = typeof global !== "undefined" ? global : self;
var BrowserMutationObserver = scope.MutationObserver || scope.WebKitMutationObserver;

// MutationObservers are desirable because they have high priority and work
// reliably everywhere they are implemented.
// They are implemented in all modern browsers.
//
// - Android 4-4.3
// - Chrome 26-34
// - Firefox 14-29
// - Internet Explorer 11
// - iPad Safari 6-7.1
// - iPhone Safari 7-7.1
// - Safari 6-7
if (typeof BrowserMutationObserver === "function") {
    requestFlush = makeRequestCallFromMutationObserver(flush);

// MessageChannels are desirable because they give direct access to the HTML
// task queue, are implemented in Internet Explorer 10, Safari 5.0-1, and Opera
// 11-12, and in web workers in many engines.
// Although message channels yield to any queued rendering and IO tasks, they
// would be better than imposing the 4ms delay of timers.
// However, they do not work reliably in Internet Explorer or Safari.

// Internet Explorer 10 is the only browser that has setImmediate but does
// not have MutationObservers.
// Although setImmediate yields to the browser's renderer, it would be
// preferrable to falling back to setTimeout since it does not have
// the minimum 4ms penalty.
// Unfortunately there appears to be a bug in Internet Explorer 10 Mobile (and
// Desktop to a lesser extent) that renders both setImmediate and
// MessageChannel useless for the purposes of ASAP.
// https://github.com/kriskowal/q/issues/396

// Timers are implemented universally.
// We fall back to timers in workers in most engines, and in foreground
// contexts in the following browsers.
// However, note that even this simple case requires nuances to operate in a
// broad spectrum of browsers.
//
// - Firefox 3-13
// - Internet Explorer 6-9
// - iPad Safari 4.3
// - Lynx 2.8.7
} else {
    requestFlush = makeRequestCallFromTimer(flush);
}

// `requestFlush` requests that the high priority event queue be flushed as
// soon as possible.
// This is useful to prevent an error thrown in a task from stalling the event
// queue if the exception handled by Node.js’s
// `process.on("uncaughtException")` or by a domain.
rawAsap.requestFlush = requestFlush;

// To request a high priority event, we induce a mutation observer by toggling
// the text of a text node between "1" and "-1".
function makeRequestCallFromMutationObserver(callback) {
    var toggle = 1;
    var observer = new BrowserMutationObserver(callback);
    var node = document.createTextNode("");
    observer.observe(node, {characterData: true});
    return function requestCall() {
        toggle = -toggle;
        node.data = toggle;
    };
}

// The message channel technique was discovered by Malte Ubl and was the
// original foundation for this library.
// http://www.nonblocking.io/2011/06/windownexttick.html

// Safari 6.0.5 (at least) intermittently fails to create message ports on a
// page's first load. Thankfully, this version of Safari supports
// MutationObservers, so we don't need to fall back in that case.

// function makeRequestCallFromMessageChannel(callback) {
//     var channel = new MessageChannel();
//     channel.port1.onmessage = callback;
//     return function requestCall() {
//         channel.port2.postMessage(0);
//     };
// }

// For reasons explained above, we are also unable to use `setImmediate`
// under any circumstances.
// Even if we were, there is another bug in Internet Explorer 10.
// It is not sufficient to assign `setImmediate` to `requestFlush` because
// `setImmediate` must be called *by name* and therefore must be wrapped in a
// closure.
// Never forget.

// function makeRequestCallFromSetImmediate(callback) {
//     return function requestCall() {
//         setImmediate(callback);
//     };
// }

// Safari 6.0 has a problem where timers will get lost while the user is
// scrolling. This problem does not impact ASAP because Safari 6.0 supports
// mutation observers, so that implementation is used instead.
// However, if we ever elect to use timers in Safari, the prevalent work-around
// is to add a scroll event listener that calls for a flush.

// `setTimeout` does not call the passed callback if the delay is less than
// approximately 7 in web workers in Firefox 8 through 18, and sometimes not
// even then.

function makeRequestCallFromTimer(callback) {
    return function requestCall() {
        // We dispatch a timeout with a specified delay of 0 for engines that
        // can reliably accommodate that request. This will usually be snapped
        // to a 4 milisecond delay, but once we're flushing, there's no delay
        // between events.
        var timeoutHandle = setTimeout(handleTimer, 0);
        // However, since this timer gets frequently dropped in Firefox
        // workers, we enlist an interval handle that will try to fire
        // an event 20 times per second until it succeeds.
        var intervalHandle = setInterval(handleTimer, 50);

        function handleTimer() {
            // Whichever timer succeeds will cancel both timers and
            // execute the callback.
            clearTimeout(timeoutHandle);
            clearInterval(intervalHandle);
            callback();
        }
    };
}

// This is for `asap.js` only.
// Its name will be periodically randomized to break any code that depends on
// its existence.
rawAsap.makeRequestCallFromTimer = makeRequestCallFromTimer;

// ASAP was originally a nextTick shim included in Q. This was factored out
// into this ASAP package. It was later adapted to RSVP which made further
// amendments. These decisions, particularly to marginalize MessageChannel and
// to capture the MutationObserver implementation in a closure, were integrated
// back into ASAP proper.
// https://github.com/tildeio/rsvp.js/blob/cddf7232546a9cf858524b75cde6f9edf72620a7/lib/rsvp/asap.js

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/asap/browser-raw.js","/../node_modules/asap")
},{"buffer":23,"pBGvAp":27}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

var domain; // The domain module is executed on demand
var hasSetImmediate = typeof setImmediate === "function";

// Use the fastest means possible to execute a task in its own turn, with
// priority over other events including network IO events in Node.js.
//
// An exception thrown by a task will permanently interrupt the processing of
// subsequent tasks. The higher level `asap` function ensures that if an
// exception is thrown by a task, that the task queue will continue flushing as
// soon as possible, but if you use `rawAsap` directly, you are responsible to
// either ensure that no exceptions are thrown from your task, or to manually
// call `rawAsap.requestFlush` if an exception is thrown.
module.exports = rawAsap;
function rawAsap(task) {
    if (!queue.length) {
        requestFlush();
        flushing = true;
    }
    // Avoids a function call
    queue[queue.length] = task;
}

var queue = [];
// Once a flush has been requested, no further calls to `requestFlush` are
// necessary until the next `flush` completes.
var flushing = false;
// The position of the next task to execute in the task queue. This is
// preserved between calls to `flush` so that it can be resumed if
// a task throws an exception.
var index = 0;
// If a task schedules additional tasks recursively, the task queue can grow
// unbounded. To prevent memory excaustion, the task queue will periodically
// truncate already-completed tasks.
var capacity = 1024;

// The flush function processes all tasks that have been scheduled with
// `rawAsap` unless and until one of those tasks throws an exception.
// If a task throws an exception, `flush` ensures that its state will remain
// consistent and will resume where it left off when called again.
// However, `flush` does not make any arrangements to be called again if an
// exception is thrown.
function flush() {
    while (index < queue.length) {
        var currentIndex = index;
        // Advance the index before calling the task. This ensures that we will
        // begin flushing on the next task the task throws an error.
        index = index + 1;
        queue[currentIndex].call();
        // Prevent leaking memory for long chains of recursive calls to `asap`.
        // If we call `asap` within tasks scheduled by `asap`, the queue will
        // grow, but to avoid an O(n) walk for every task we execute, we don't
        // shift tasks off the queue after they have been executed.
        // Instead, we periodically shift 1024 tasks off the queue.
        if (index > capacity) {
            // Manually shift all values starting at the index back to the
            // beginning of the queue.
            for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
                queue[scan] = queue[scan + index];
            }
            queue.length -= index;
            index = 0;
        }
    }
    queue.length = 0;
    index = 0;
    flushing = false;
}

rawAsap.requestFlush = requestFlush;
function requestFlush() {
    // Ensure flushing is not bound to any domain.
    // It is not sufficient to exit the domain, because domains exist on a stack.
    // To execute code outside of any domain, the following dance is necessary.
    var parentDomain = process.domain;
    if (parentDomain) {
        if (!domain) {
            // Lazy execute the domain module.
            // Only employed if the user elects to use domains.
            domain = require("domain");
        }
        domain.active = process.domain = null;
    }

    // `setImmediate` is slower that `process.nextTick`, but `process.nextTick`
    // cannot handle recursion.
    // `requestFlush` will only be called recursively from `asap.js`, to resume
    // flushing after an error is thrown into a domain.
    // Conveniently, `setImmediate` was introduced in the same version
    // `process.nextTick` started throwing recursion errors.
    if (flushing && hasSetImmediate) {
        setImmediate(flush);
    } else {
        process.nextTick(flush);
    }

    if (parentDomain) {
        domain.active = process.domain = parentDomain;
    }
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/asap/raw.js","/../node_modules/asap")
},{"buffer":23,"domain":25,"pBGvAp":27}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = require('./lib/axios');
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/index.js","/../node_modules/axios")
},{"./lib/axios":6,"buffer":23,"pBGvAp":27}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var utils = require('./../utils');
var buildURL = require('./../helpers/buildURL');
var parseHeaders = require('./../helpers/parseHeaders');
var transformData = require('./../helpers/transformData');
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
var btoa = (typeof window !== 'undefined' && window.btoa) || require('./../helpers/btoa');
var settle = require('../helpers/settle');

module.exports = function xhrAdapter(resolve, reject, config) {
  var requestData = config.data;
  var requestHeaders = config.headers;

  if (utils.isFormData(requestData)) {
    delete requestHeaders['Content-Type']; // Let the browser set it
  }

  var request = new XMLHttpRequest();
  var loadEvent = 'onreadystatechange';
  var xDomain = false;

  // For IE 8/9 CORS support
  // Only supports POST and GET calls and doesn't returns the response headers.
  // DON'T do this for testing b/c XMLHttpRequest is mocked, not XDomainRequest.
  if (process.env.NODE_ENV !== 'test' && typeof window !== 'undefined' && window.XDomainRequest && !('withCredentials' in request) && !isURLSameOrigin(config.url)) {
    request = new window.XDomainRequest();
    loadEvent = 'onload';
    xDomain = true;
    request.onprogress = function handleProgress() {};
    request.ontimeout = function handleTimeout() {};
  }

  // HTTP basic authentication
  if (config.auth) {
    var username = config.auth.username || '';
    var password = config.auth.password || '';
    requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
  }

  request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

  // Set the request timeout in MS
  request.timeout = config.timeout;

  // Listen for ready state
  request[loadEvent] = function handleLoad() {
    if (!request || (request.readyState !== 4 && !xDomain)) {
      return;
    }

    // The request errored out and we didn't get a response, this will be
    // handled by onerror instead
    if (request.status === 0) {
      return;
    }

    // Prepare the response
    var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
    var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
    var response = {
      data: transformData(
        responseData,
        responseHeaders,
        config.transformResponse
      ),
      // IE sends 1223 instead of 204 (https://github.com/mzabriskie/axios/issues/201)
      status: request.status === 1223 ? 204 : request.status,
      statusText: request.status === 1223 ? 'No Content' : request.statusText,
      headers: responseHeaders,
      config: config,
      request: request
    };

    settle(resolve, reject, response);

    // Clean up request
    request = null;
  };

  // Handle low level network errors
  request.onerror = function handleError() {
    // Real errors are hidden from us by the browser
    // onerror should only fire if it's a network error
    reject(new Error('Network Error'));

    // Clean up request
    request = null;
  };

  // Handle timeout
  request.ontimeout = function handleTimeout() {
    var err = new Error('timeout of ' + config.timeout + 'ms exceeded');
    err.timeout = config.timeout;
    err.code = 'ECONNABORTED';
    reject(err);

    // Clean up request
    request = null;
  };

  // Add xsrf header
  // This is only done if running in a standard browser environment.
  // Specifically not if we're in a web worker, or react-native.
  if (utils.isStandardBrowserEnv()) {
    var cookies = require('./../helpers/cookies');

    // Add xsrf header
    var xsrfValue = config.withCredentials || isURLSameOrigin(config.url) ?
        cookies.read(config.xsrfCookieName) :
        undefined;

    if (xsrfValue) {
      requestHeaders[config.xsrfHeaderName] = xsrfValue;
    }
  }

  // Add headers to the request
  if ('setRequestHeader' in request) {
    utils.forEach(requestHeaders, function setRequestHeader(val, key) {
      if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
        // Remove Content-Type if data is undefined
        delete requestHeaders[key];
      } else {
        // Otherwise add header to the request
        request.setRequestHeader(key, val);
      }
    });
  }

  // Add withCredentials to request if needed
  if (config.withCredentials) {
    request.withCredentials = true;
  }

  // Add responseType to request if needed
  if (config.responseType) {
    try {
      request.responseType = config.responseType;
    } catch (e) {
      if (request.responseType !== 'json') {
        throw e;
      }
    }
  }

  // Handle progress if needed
  if (config.progress) {
    if (config.method === 'post' || config.method === 'put') {
      request.upload.addEventListener('progress', config.progress);
    } else if (config.method === 'get') {
      request.addEventListener('progress', config.progress);
    }
  }

  if (requestData === undefined) {
    requestData = null;
  }

  // Send the request
  request.send(requestData);
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/adapters/xhr.js","/../node_modules/axios/lib/adapters")
},{"../helpers/settle":18,"./../helpers/btoa":11,"./../helpers/buildURL":12,"./../helpers/cookies":14,"./../helpers/isURLSameOrigin":16,"./../helpers/parseHeaders":17,"./../helpers/transformData":20,"./../utils":21,"buffer":23,"pBGvAp":27}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var defaults = require('./defaults');
var utils = require('./utils');
var dispatchRequest = require('./core/dispatchRequest');
var InterceptorManager = require('./core/InterceptorManager');
var isAbsoluteURL = require('./helpers/isAbsoluteURL');
var combineURLs = require('./helpers/combineURLs');
var bind = require('./helpers/bind');
var transformData = require('./helpers/transformData');

function Axios(defaultConfig) {
  this.defaults = utils.merge({}, defaultConfig);
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = utils.merge({
      url: arguments[0]
    }, arguments[1]);
  }

  config = utils.merge(defaults, this.defaults, { method: 'get' }, config);

  // Support baseURL config
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // Don't allow overriding defaults.withCredentials
  config.withCredentials = config.withCredentials || this.defaults.withCredentials;

  // Transform request data
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers || {}
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  // Hook up interceptors middleware
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};

var defaultInstance = new Axios(defaults);
var axios = module.exports = bind(Axios.prototype.request, defaultInstance);
module.exports.Axios = Axios;

// Expose properties from defaultInstance
axios.defaults = defaultInstance.defaults;
axios.interceptors = defaultInstance.interceptors;

// Factory for creating new instances
axios.create = function create(defaultConfig) {
  return new Axios(defaultConfig);
};

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
  axios[method] = bind(Axios.prototype[method], defaultInstance);
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
  axios[method] = bind(Axios.prototype[method], defaultInstance);
});

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/axios.js","/../node_modules/axios/lib")
},{"./core/InterceptorManager":7,"./core/dispatchRequest":8,"./defaults":9,"./helpers/bind":10,"./helpers/combineURLs":13,"./helpers/isAbsoluteURL":15,"./helpers/spread":19,"./helpers/transformData":20,"./utils":21,"buffer":23,"pBGvAp":27}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/core/InterceptorManager.js","/../node_modules/axios/lib/core")
},{"./../utils":21,"buffer":23,"pBGvAp":27}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

/**
 * Dispatch a request to the server using whichever adapter
 * is supported by the current environment.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  return new Promise(function executor(resolve, reject) {
    try {
      var adapter;

      if (typeof config.adapter === 'function') {
        // For custom adapter support
        adapter = config.adapter;
      } else if (typeof XMLHttpRequest !== 'undefined') {
        // For browsers use XHR adapter
        adapter = require('../adapters/xhr');
      } else if (typeof process !== 'undefined') {
        // For node use HTTP adapter
        adapter = require('../adapters/http');
      }

      if (typeof adapter === 'function') {
        adapter(resolve, reject, config);
      }
    } catch (e) {
      reject(e);
    }
  });
};


}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/core/dispatchRequest.js","/../node_modules/axios/lib/core")
},{"../adapters/http":5,"../adapters/xhr":5,"buffer":23,"pBGvAp":27}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var utils = require('./utils');

var PROTECTION_PREFIX = /^\)\]\}',?\n/;
var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

module.exports = {
  transformRequest: [function transformRequest(data, headers) {
    if (utils.isFormData(data) || utils.isArrayBuffer(data) || utils.isStream(data)) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isObject(data) && !utils.isFile(data) && !utils.isBlob(data)) {
      // Set application/json if no Content-Type has been specified
      if (!utils.isUndefined(headers)) {
        utils.forEach(headers, function processContentTypeHeader(val, key) {
          if (key.toLowerCase() === 'content-type') {
            headers['Content-Type'] = val;
          }
        });

        if (utils.isUndefined(headers['Content-Type'])) {
          headers['Content-Type'] = 'application/json;charset=utf-8';
        }
      }
      return JSON.stringify(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    /*eslint no-param-reassign:0*/
    if (typeof data === 'string') {
      data = data.replace(PROTECTION_PREFIX, '');
      try {
        data = JSON.parse(data);
      } catch (e) { /* Ignore */ }
    }
    return data;
  }],

  headers: {
    common: {
      'Accept': 'application/json, text/plain, */*'
    },
    patch: utils.merge(DEFAULT_CONTENT_TYPE),
    post: utils.merge(DEFAULT_CONTENT_TYPE),
    put: utils.merge(DEFAULT_CONTENT_TYPE)
  },

  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/defaults.js","/../node_modules/axios/lib")
},{"./utils":21,"buffer":23,"pBGvAp":27}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/helpers/bind.js","/../node_modules/axios/lib/helpers")
},{"buffer":23,"pBGvAp":27}],11:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

// btoa polyfill for IE<10 courtesy https://github.com/davidchambers/Base64.js

var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function E() {
  this.message = 'String contains an invalid character';
}
E.prototype = new Error;
E.prototype.code = 5;
E.prototype.name = 'InvalidCharacterError';

function btoa(input) {
  var str = String(input);
  var output = '';
  for (
    // initialize result and counter
    var block, charCode, idx = 0, map = chars;
    // if the next str index does not exist:
    //   change the mapping table to "="
    //   check if d has no fractional digits
    str.charAt(idx | 0) || (map = '=', idx % 1);
    // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
    output += map.charAt(63 & block >> 8 - idx % 1 * 8)
  ) {
    charCode = str.charCodeAt(idx += 3 / 4);
    if (charCode > 0xFF) {
      throw new E();
    }
    block = block << 8 | charCode;
  }
  return output;
}

module.exports = btoa;

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/helpers/btoa.js","/../node_modules/axios/lib/helpers")
},{"buffer":23,"pBGvAp":27}],12:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var utils = require('./../utils');

function encode(val) {
  return encodeURIComponent(val).
    replace(/%40/gi, '@').
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      }

      if (!utils.isArray(val)) {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};


}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/helpers/buildURL.js","/../node_modules/axios/lib/helpers")
},{"./../utils":21,"buffer":23,"pBGvAp":27}],13:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '');
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/helpers/combineURLs.js","/../node_modules/axios/lib/helpers")
},{"buffer":23,"pBGvAp":27}],14:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
  (function standardBrowserEnv() {
    return {
      write: function write(name, value, expires, path, domain, secure) {
        var cookie = [];
        cookie.push(name + '=' + encodeURIComponent(value));

        if (utils.isNumber(expires)) {
          cookie.push('expires=' + new Date(expires).toGMTString());
        }

        if (utils.isString(path)) {
          cookie.push('path=' + path);
        }

        if (utils.isString(domain)) {
          cookie.push('domain=' + domain);
        }

        if (secure === true) {
          cookie.push('secure');
        }

        document.cookie = cookie.join('; ');
      },

      read: function read(name) {
        var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        return (match ? decodeURIComponent(match[3]) : null);
      },

      remove: function remove(name) {
        this.write(name, '', Date.now() - 86400000);
      }
    };
  })() :

  // Non standard browser env (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return {
      write: function write() {},
      read: function read() { return null; },
      remove: function remove() {}
    };
  })()
);

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/helpers/cookies.js","/../node_modules/axios/lib/helpers")
},{"./../utils":21,"buffer":23,"pBGvAp":27}],15:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/helpers/isAbsoluteURL.js","/../node_modules/axios/lib/helpers")
},{"buffer":23,"pBGvAp":27}],16:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
  (function standardBrowserEnv() {
    var msie = /(msie|trident)/i.test(navigator.userAgent);
    var urlParsingNode = document.createElement('a');
    var originURL;

    /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
    function resolveURL(url) {
      var href = url;

      if (msie) {
        // IE needs attribute set twice to normalize properties
        urlParsingNode.setAttribute('href', href);
        href = urlParsingNode.href;
      }

      urlParsingNode.setAttribute('href', href);

      // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
      return {
        href: urlParsingNode.href,
        protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
        host: urlParsingNode.host,
        search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
        hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
        hostname: urlParsingNode.hostname,
        port: urlParsingNode.port,
        pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                  urlParsingNode.pathname :
                  '/' + urlParsingNode.pathname
      };
    }

    originURL = resolveURL(window.location.href);

    /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
    return function isURLSameOrigin(requestURL) {
      var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
      return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
    };
  })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return function isURLSameOrigin() {
      return true;
    };
  })()
);

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/helpers/isURLSameOrigin.js","/../node_modules/axios/lib/helpers")
},{"./../utils":21,"buffer":23,"pBGvAp":27}],17:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var utils = require('./../utils');

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
    }
  });

  return parsed;
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/helpers/parseHeaders.js","/../node_modules/axios/lib/helpers")
},{"./../utils":21,"buffer":23,"pBGvAp":27}],18:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  // Note: status is not exposed by XDomainRequest
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(response);
  }
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/helpers/settle.js","/../node_modules/axios/lib/helpers")
},{"buffer":23,"pBGvAp":27}],19:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/helpers/spread.js","/../node_modules/axios/lib/helpers")
},{"buffer":23,"pBGvAp":27}],20:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var utils = require('./../utils');

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn(data, headers);
  });

  return data;
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/helpers/transformData.js","/../node_modules/axios/lib/helpers")
},{"./../utils":21,"buffer":23,"pBGvAp":27}],21:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

/*global toString:true*/

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.replace(/^\s*/, '').replace(/\s*$/, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  typeof document.createElement -> undefined
 */
function isStandardBrowserEnv() {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof document.createElement === 'function'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object' && !isArray(obj)) {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      result[key] = merge(result[key], val);
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  trim: trim
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/axios/lib/utils.js","/../node_modules/axios/lib")
},{"buffer":23,"pBGvAp":27}],22:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/browserify/node_modules/base64-js/lib/b64.js","/../node_modules/browserify/node_modules/base64-js/lib")
},{"buffer":23,"pBGvAp":27}],23:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/browserify/node_modules/buffer/index.js","/../node_modules/browserify/node_modules/buffer")
},{"base64-js":22,"buffer":23,"ieee754":26,"pBGvAp":27}],24:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/browserify/node_modules/events/events.js","/../node_modules/browserify/node_modules/events")
},{"buffer":23,"pBGvAp":27}],25:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// This file should be ES5 compatible
/* eslint prefer-spread:0, no-var:0, prefer-reflect:0, no-magic-numbers:0 */
'use strict'
module.exports = (function () {
	// Import Events
	var events = require('events')

	// Export Domain
	var domain = {}
	domain.createDomain = domain.create = function () {
		var d = new events.EventEmitter()

		function emitError (e) {
			d.emit('error', e)
		}

		d.add = function (emitter) {
			emitter.on('error', emitError)
		}
		d.remove = function (emitter) {
			emitter.removeListener('error', emitError)
		}
		d.bind = function (fn) {
			return function () {
				var args = Array.prototype.slice.call(arguments)
				try {
					fn.apply(null, args)
				}
				catch (err) {
					emitError(err)
				}
			}
		}
		d.intercept = function (fn) {
			return function (err) {
				if ( err ) {
					emitError(err)
				}
				else {
					var args = Array.prototype.slice.call(arguments, 1)
					try {
						fn.apply(null, args)
					}
					catch (err) {
						emitError(err)
					}
				}
			}
		}
		d.run = function (fn) {
			try {
				fn()
			}
			catch (err) {
				emitError(err)
			}
			return this
		}
		d.dispose = function () {
			this.removeAllListeners()
			return this
		}
		d.enter = d.exit = function () {
			return this
		}
		return d
	}
	return domain
}).call(this)

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/domain-browser/index.js","/../node_modules/domain-browser")
},{"buffer":23,"events":24,"pBGvAp":27}],26:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ieee754/index.js","/../node_modules/ieee754")
},{"buffer":23,"pBGvAp":27}],27:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/process/browser.js","/../node_modules/process")
},{"buffer":23,"pBGvAp":27}],28:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

module.exports = require('./lib')

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/promise/index.js","/../node_modules/promise")
},{"./lib":33,"buffer":23,"pBGvAp":27}],29:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var asap = require('asap/raw');

function noop() {}

// States:
//
// 0 - pending
// 1 - fulfilled with _value
// 2 - rejected with _value
// 3 - adopted the state of another promise, _value
//
// once the state is no longer pending (0) it is immutable

// All `_` prefixed properties will be reduced to `_{random number}`
// at build time to obfuscate them and discourage their use.
// We don't use symbols or Object.defineProperty to fully hide them
// because the performance isn't good enough.


// to avoid using try/catch inside critical functions, we
// extract them to here.
var LAST_ERROR = null;
var IS_ERROR = {};
function getThen(obj) {
  try {
    return obj.then;
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

function tryCallOne(fn, a) {
  try {
    return fn(a);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}
function tryCallTwo(fn, a, b) {
  try {
    fn(a, b);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

module.exports = Promise;

function Promise(fn) {
  if (typeof this !== 'object') {
    throw new TypeError('Promises must be constructed via new');
  }
  if (typeof fn !== 'function') {
    throw new TypeError('not a function');
  }
  this._45 = 0;
  this._81 = 0;
  this._65 = null;
  this._54 = null;
  if (fn === noop) return;
  doResolve(fn, this);
}
Promise._10 = null;
Promise._97 = null;
Promise._61 = noop;

Promise.prototype.then = function(onFulfilled, onRejected) {
  if (this.constructor !== Promise) {
    return safeThen(this, onFulfilled, onRejected);
  }
  var res = new Promise(noop);
  handle(this, new Handler(onFulfilled, onRejected, res));
  return res;
};

function safeThen(self, onFulfilled, onRejected) {
  return new self.constructor(function (resolve, reject) {
    var res = new Promise(noop);
    res.then(resolve, reject);
    handle(self, new Handler(onFulfilled, onRejected, res));
  });
};
function handle(self, deferred) {
  while (self._81 === 3) {
    self = self._65;
  }
  if (Promise._10) {
    Promise._10(self);
  }
  if (self._81 === 0) {
    if (self._45 === 0) {
      self._45 = 1;
      self._54 = deferred;
      return;
    }
    if (self._45 === 1) {
      self._45 = 2;
      self._54 = [self._54, deferred];
      return;
    }
    self._54.push(deferred);
    return;
  }
  handleResolved(self, deferred);
}

function handleResolved(self, deferred) {
  asap(function() {
    var cb = self._81 === 1 ? deferred.onFulfilled : deferred.onRejected;
    if (cb === null) {
      if (self._81 === 1) {
        resolve(deferred.promise, self._65);
      } else {
        reject(deferred.promise, self._65);
      }
      return;
    }
    var ret = tryCallOne(cb, self._65);
    if (ret === IS_ERROR) {
      reject(deferred.promise, LAST_ERROR);
    } else {
      resolve(deferred.promise, ret);
    }
  });
}
function resolve(self, newValue) {
  // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
  if (newValue === self) {
    return reject(
      self,
      new TypeError('A promise cannot be resolved with itself.')
    );
  }
  if (
    newValue &&
    (typeof newValue === 'object' || typeof newValue === 'function')
  ) {
    var then = getThen(newValue);
    if (then === IS_ERROR) {
      return reject(self, LAST_ERROR);
    }
    if (
      then === self.then &&
      newValue instanceof Promise
    ) {
      self._81 = 3;
      self._65 = newValue;
      finale(self);
      return;
    } else if (typeof then === 'function') {
      doResolve(then.bind(newValue), self);
      return;
    }
  }
  self._81 = 1;
  self._65 = newValue;
  finale(self);
}

function reject(self, newValue) {
  self._81 = 2;
  self._65 = newValue;
  if (Promise._97) {
    Promise._97(self, newValue);
  }
  finale(self);
}
function finale(self) {
  if (self._45 === 1) {
    handle(self, self._54);
    self._54 = null;
  }
  if (self._45 === 2) {
    for (var i = 0; i < self._54.length; i++) {
      handle(self, self._54[i]);
    }
    self._54 = null;
  }
}

function Handler(onFulfilled, onRejected, promise){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
  this.promise = promise;
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, promise) {
  var done = false;
  var res = tryCallTwo(fn, function (value) {
    if (done) return;
    done = true;
    resolve(promise, value);
  }, function (reason) {
    if (done) return;
    done = true;
    reject(promise, reason);
  })
  if (!done && res === IS_ERROR) {
    done = true;
    reject(promise, LAST_ERROR);
  }
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/promise/lib/core.js","/../node_modules/promise/lib")
},{"asap/raw":3,"buffer":23,"pBGvAp":27}],30:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var Promise = require('./core.js');

module.exports = Promise;
Promise.prototype.done = function (onFulfilled, onRejected) {
  var self = arguments.length ? this.then.apply(this, arguments) : this;
  self.then(null, function (err) {
    setTimeout(function () {
      throw err;
    }, 0);
  });
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/promise/lib/done.js","/../node_modules/promise/lib")
},{"./core.js":29,"buffer":23,"pBGvAp":27}],31:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

//This file contains the ES6 extensions to the core Promises/A+ API

var Promise = require('./core.js');

module.exports = Promise;

/* Static Functions */

var TRUE = valuePromise(true);
var FALSE = valuePromise(false);
var NULL = valuePromise(null);
var UNDEFINED = valuePromise(undefined);
var ZERO = valuePromise(0);
var EMPTYSTRING = valuePromise('');

function valuePromise(value) {
  var p = new Promise(Promise._61);
  p._81 = 1;
  p._65 = value;
  return p;
}
Promise.resolve = function (value) {
  if (value instanceof Promise) return value;

  if (value === null) return NULL;
  if (value === undefined) return UNDEFINED;
  if (value === true) return TRUE;
  if (value === false) return FALSE;
  if (value === 0) return ZERO;
  if (value === '') return EMPTYSTRING;

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then;
      if (typeof then === 'function') {
        return new Promise(then.bind(value));
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex);
      });
    }
  }
  return valuePromise(value);
};

Promise.all = function (arr) {
  var args = Array.prototype.slice.call(arr);

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([]);
    var remaining = args.length;
    function res(i, val) {
      if (val && (typeof val === 'object' || typeof val === 'function')) {
        if (val instanceof Promise && val.then === Promise.prototype.then) {
          while (val._81 === 3) {
            val = val._65;
          }
          if (val._81 === 1) return res(i, val._65);
          if (val._81 === 2) reject(val._65);
          val.then(function (val) {
            res(i, val);
          }, reject);
          return;
        } else {
          var then = val.then;
          if (typeof then === 'function') {
            var p = new Promise(then.bind(val));
            p.then(function (val) {
              res(i, val);
            }, reject);
            return;
          }
        }
      }
      args[i] = val;
      if (--remaining === 0) {
        resolve(args);
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i]);
    }
  });
};

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) {
    reject(value);
  });
};

Promise.race = function (values) {
  return new Promise(function (resolve, reject) {
    values.forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    });
  });
};

/* Prototype Methods */

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/promise/lib/es6-extensions.js","/../node_modules/promise/lib")
},{"./core.js":29,"buffer":23,"pBGvAp":27}],32:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var Promise = require('./core.js');

module.exports = Promise;
Promise.prototype['finally'] = function (f) {
  return this.then(function (value) {
    return Promise.resolve(f()).then(function () {
      return value;
    });
  }, function (err) {
    return Promise.resolve(f()).then(function () {
      throw err;
    });
  });
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/promise/lib/finally.js","/../node_modules/promise/lib")
},{"./core.js":29,"buffer":23,"pBGvAp":27}],33:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

module.exports = require('./core.js');
require('./done.js');
require('./finally.js');
require('./es6-extensions.js');
require('./node-extensions.js');
require('./synchronous.js');

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/promise/lib/index.js","/../node_modules/promise/lib")
},{"./core.js":29,"./done.js":30,"./es6-extensions.js":31,"./finally.js":32,"./node-extensions.js":34,"./synchronous.js":35,"buffer":23,"pBGvAp":27}],34:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

// This file contains then/promise specific extensions that are only useful
// for node.js interop

var Promise = require('./core.js');
var asap = require('asap');

module.exports = Promise;

/* Static Functions */

Promise.denodeify = function (fn, argumentCount) {
  if (
    typeof argumentCount === 'number' && argumentCount !== Infinity
  ) {
    return denodeifyWithCount(fn, argumentCount);
  } else {
    return denodeifyWithoutCount(fn);
  }
}

var callbackFn = (
  'function (err, res) {' +
  'if (err) { rj(err); } else { rs(res); }' +
  '}'
);
function denodeifyWithCount(fn, argumentCount) {
  var args = [];
  for (var i = 0; i < argumentCount; i++) {
    args.push('a' + i);
  }
  var body = [
    'return function (' + args.join(',') + ') {',
    'var self = this;',
    'return new Promise(function (rs, rj) {',
    'var res = fn.call(',
    ['self'].concat(args).concat([callbackFn]).join(','),
    ');',
    'if (res &&',
    '(typeof res === "object" || typeof res === "function") &&',
    'typeof res.then === "function"',
    ') {rs(res);}',
    '});',
    '};'
  ].join('');
  return Function(['Promise', 'fn'], body)(Promise, fn);
}
function denodeifyWithoutCount(fn) {
  var fnLength = Math.max(fn.length - 1, 3);
  var args = [];
  for (var i = 0; i < fnLength; i++) {
    args.push('a' + i);
  }
  var body = [
    'return function (' + args.join(',') + ') {',
    'var self = this;',
    'var args;',
    'var argLength = arguments.length;',
    'if (arguments.length > ' + fnLength + ') {',
    'args = new Array(arguments.length + 1);',
    'for (var i = 0; i < arguments.length; i++) {',
    'args[i] = arguments[i];',
    '}',
    '}',
    'return new Promise(function (rs, rj) {',
    'var cb = ' + callbackFn + ';',
    'var res;',
    'switch (argLength) {',
    args.concat(['extra']).map(function (_, index) {
      return (
        'case ' + (index) + ':' +
        'res = fn.call(' + ['self'].concat(args.slice(0, index)).concat('cb').join(',') + ');' +
        'break;'
      );
    }).join(''),
    'default:',
    'args[argLength] = cb;',
    'res = fn.apply(self, args);',
    '}',
    
    'if (res &&',
    '(typeof res === "object" || typeof res === "function") &&',
    'typeof res.then === "function"',
    ') {rs(res);}',
    '});',
    '};'
  ].join('');

  return Function(
    ['Promise', 'fn'],
    body
  )(Promise, fn);
}

Promise.nodeify = function (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    var callback =
      typeof args[args.length - 1] === 'function' ? args.pop() : null;
    var ctx = this;
    try {
      return fn.apply(this, arguments).nodeify(callback, ctx);
    } catch (ex) {
      if (callback === null || typeof callback == 'undefined') {
        return new Promise(function (resolve, reject) {
          reject(ex);
        });
      } else {
        asap(function () {
          callback.call(ctx, ex);
        })
      }
    }
  }
}

Promise.prototype.nodeify = function (callback, ctx) {
  if (typeof callback != 'function') return this;

  this.then(function (value) {
    asap(function () {
      callback.call(ctx, null, value);
    });
  }, function (err) {
    asap(function () {
      callback.call(ctx, err);
    });
  });
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/promise/lib/node-extensions.js","/../node_modules/promise/lib")
},{"./core.js":29,"asap":1,"buffer":23,"pBGvAp":27}],35:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var Promise = require('./core.js');

module.exports = Promise;
Promise.enableSynchronous = function () {
  Promise.prototype.isPending = function() {
    return this.getState() == 0;
  };

  Promise.prototype.isFulfilled = function() {
    return this.getState() == 1;
  };

  Promise.prototype.isRejected = function() {
    return this.getState() == 2;
  };

  Promise.prototype.getValue = function () {
    if (this._81 === 3) {
      return this._65.getValue();
    }

    if (!this.isFulfilled()) {
      throw new Error('Cannot get a value of an unfulfilled promise.');
    }

    return this._65;
  };

  Promise.prototype.getReason = function () {
    if (this._81 === 3) {
      return this._65.getReason();
    }

    if (!this.isRejected()) {
      throw new Error('Cannot get a rejection reason of a non-rejected promise.');
    }

    return this._65;
  };

  Promise.prototype.getState = function () {
    if (this._81 === 3) {
      return this._65.getState();
    }
    if (this._81 === -1 || this._81 === -2) {
      return 0;
    }

    return this._81;
  };
};

Promise.disableSynchronous = function() {
  Promise.prototype.isPending = undefined;
  Promise.prototype.isFulfilled = undefined;
  Promise.prototype.isRejected = undefined;
  Promise.prototype.getValue = undefined;
  Promise.prototype.getReason = undefined;
  Promise.prototype.getState = undefined;
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/promise/lib/synchronous.js","/../node_modules/promise/lib")
},{"./core.js":29,"buffer":23,"pBGvAp":27}],36:[function(require,module,exports){
module.exports={
  "name": "clarifai",
  "version": "2.4.0",
  "description": "Official Clarifai Javascript SDK",
  "main": "dist/index.js",
  "repository": "https://github.com/Clarifai/clarifai-javascript",
  "author": "Clarifai Inc.",
  "license": "Apache-2.0",
  "scripts": {
    "jsdoc": "jsdoc src/* -t node_modules/minami -d docs/$npm_package_version && jsdoc src/* -t node_modules/minami -d docs/latest",
    "test": "gulp test",
    "watch": "gulp watch",
    "build": "npm run clean && gulp build && npm run jsdoc",
    "release": "release-it",
    "clean": "gulp cleanbuild"
  },
  "dependencies": {
    "axios": "0.11.1",
    "form-data": "0.2.0",
    "promise": "7.1.1"
  },
  "devDependencies": {
    "babel-eslint": "^6.1.2",
    "babel-preset-es2015": "^6.14.0",
    "babel-register": "^6.14.0",
    "babelify": "^7.3.0",
    "del": "2.0.2",
    "envify": "3.4.0",
    "git-branch": "0.3.0",
    "gulp": "3.9.0",
    "gulp-awspublish": "3.0.1",
    "gulp-babel": "^6.1.2",
    "gulp-browserify": "0.5.1",
    "gulp-concat": "2.6.0",
    "gulp-eslint": "2.0.0",
    "gulp-if": "2.0.0",
    "gulp-insert": "0.5.0",
    "gulp-jasmine": "^2.2.1",
    "gulp-notify": "2.2.0",
    "gulp-rename": "1.2.2",
    "gulp-replace-task": "0.11.0",
    "gulp-uglify": "1.4.1",
    "gulp-util": "3.0.6",
    "jsdoc": "^3.4.1",
    "minami": "^1.1.1",
    "release-it": "^2.7.3",
    "require-dir": "0.3.0",
    "serve-static": "1.10.0"
  }
}

},{}],37:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var axios = require('axios');

var _require = require('./helpers'),
    checkType = _require.checkType;

var Models = require('./Models');
var Inputs = require('./Inputs');
var Concepts = require('./Concepts');
var Workflow = require('./Workflow');

var _require2 = require('./constants'),
    API = _require2.API,
    ERRORS = _require2.ERRORS,
    getBasePath = _require2.getBasePath;

var TOKEN_PATH = API.TOKEN_PATH;


if (typeof window !== 'undefined' && !('Promise' in window)) {
  window.Promise = require('promise');
}

if (typeof global !== 'undefined' && !('Promise' in global)) {
  global.Promise = require('promise');
}

/**
 * top-level class that allows access to models, inputs and concepts
 * @class
 */

var App = function () {
  function App(arg1, arg2, arg3) {
    _classCallCheck(this, App);

    var optionsObj = arg1;
    if ((typeof arg1 === 'undefined' ? 'undefined' : _typeof(arg1)) !== 'object' || arg1 === null) {
      optionsObj = arg3 || {};
      optionsObj.clientId = arg1;
      optionsObj.clientSecret = arg2;
    }
    this._validate(optionsObj);
    this._init(optionsObj);
  }

  /**
   * Gets a token from the API using client credentials
   * @return {Promise(token, error)} A Promise that is fulfilled with the token string or rejected with an error
   */


  _createClass(App, [{
    key: 'getToken',
    value: function getToken() {
      return this._config.token();
    }

    /**
     * Sets the token to use for the API
     * @param {String}         _token    The token you are setting
     * @return {Boolean}                 true if token has valid fields, false if not
     */

  }, {
    key: 'setToken',
    value: function setToken(_token) {
      var token = _token;
      var now = new Date().getTime();
      if (typeof _token === 'string') {
        token = {
          accessToken: _token,
          expiresIn: 176400
        };
      } else {
        token = {
          accessToken: _token.access_token || _token.accessToken,
          expiresIn: _token.expires_in || _token.expiresIn
        };
      }
      if (token.accessToken && token.expiresIn || token.access_token && token.expires_in) {
        if (!token.expireTime) {
          token.expireTime = now + token.expiresIn * 1000;
        }
        this._config._token = token;
        return true;
      }
      return false;
    }
  }, {
    key: '_validate',
    value: function _validate(_ref) {
      var clientId = _ref.clientId,
          clientSecret = _ref.clientSecret,
          token = _ref.token,
          apiKey = _ref.apiKey,
          sessionToken = _ref.sessionToken;

      if ((!clientId || !clientSecret) && !token && !apiKey && !sessionToken) {
        throw ERRORS.paramsRequired(['Client ID', 'Client Secret']);
      }
    }
  }, {
    key: '_init',
    value: function _init(options) {
      var _this = this;

      var apiEndpoint = options.apiEndpoint || process && process.env && process.env.API_ENDPOINT || 'https://api.clarifai.com';
      this._config = {
        apiEndpoint: apiEndpoint,
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        apiKey: options.apiKey,
        sessionToken: options.sessionToken,
        basePath: getBasePath(apiEndpoint, options.userId, options.appId),
        token: function token() {
          return new Promise(function (resolve, reject) {
            var now = new Date().getTime();
            if (checkType(/Object/, _this._config._token) && _this._config._token.expireTime > now) {
              resolve(_this._config._token);
            } else {
              _this._getToken(resolve, reject);
            }
          });
        }
      };
      if (options.token) {
        this.setToken(options.token);
      }
      this.models = new Models(this._config);
      this.inputs = new Inputs(this._config);
      this.concepts = new Concepts(this._config);
      this.workflow = new Workflow(this._config);
    }
  }, {
    key: '_getToken',
    value: function _getToken(resolve, reject) {
      var _this2 = this;

      this._requestToken().then(function (response) {
        if (response.status === 200) {
          _this2.setToken(response.data);
          resolve(_this2._config._token);
        } else {
          reject(response);
        }
      }, reject);
    }
  }, {
    key: '_requestToken',
    value: function _requestToken() {
      var url = '' + this._config.basePath + TOKEN_PATH;
      var clientId = this._config.clientId;
      var clientSecret = this._config.clientSecret;
      return axios({
        'url': url,
        'method': 'POST',
        'auth': {
          'username': clientId,
          'password': clientSecret
        }
      });
    }
  }]);

  return App;
}();

;

module.exports = App;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkFwcC5qcyJdLCJuYW1lcyI6WyJheGlvcyIsInJlcXVpcmUiLCJjaGVja1R5cGUiLCJNb2RlbHMiLCJJbnB1dHMiLCJDb25jZXB0cyIsIldvcmtmbG93IiwiQVBJIiwiRVJST1JTIiwiZ2V0QmFzZVBhdGgiLCJUT0tFTl9QQVRIIiwid2luZG93IiwiUHJvbWlzZSIsImdsb2JhbCIsIkFwcCIsImFyZzEiLCJhcmcyIiwiYXJnMyIsIm9wdGlvbnNPYmoiLCJjbGllbnRJZCIsImNsaWVudFNlY3JldCIsIl92YWxpZGF0ZSIsIl9pbml0IiwiX2NvbmZpZyIsInRva2VuIiwiX3Rva2VuIiwibm93IiwiRGF0ZSIsImdldFRpbWUiLCJhY2Nlc3NUb2tlbiIsImV4cGlyZXNJbiIsImFjY2Vzc190b2tlbiIsImV4cGlyZXNfaW4iLCJleHBpcmVUaW1lIiwiYXBpS2V5Iiwic2Vzc2lvblRva2VuIiwicGFyYW1zUmVxdWlyZWQiLCJvcHRpb25zIiwiYXBpRW5kcG9pbnQiLCJwcm9jZXNzIiwiZW52IiwiQVBJX0VORFBPSU5UIiwiYmFzZVBhdGgiLCJ1c2VySWQiLCJhcHBJZCIsInJlc29sdmUiLCJyZWplY3QiLCJfZ2V0VG9rZW4iLCJzZXRUb2tlbiIsIm1vZGVscyIsImlucHV0cyIsImNvbmNlcHRzIiwid29ya2Zsb3ciLCJfcmVxdWVzdFRva2VuIiwidGhlbiIsInJlc3BvbnNlIiwic3RhdHVzIiwiZGF0YSIsInVybCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUEsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7O2VBQ2tCQSxRQUFRLFdBQVIsQztJQUFiQyxTLFlBQUFBLFM7O0FBQ0wsSUFBSUMsU0FBU0YsUUFBUSxVQUFSLENBQWI7QUFDQSxJQUFJRyxTQUFTSCxRQUFRLFVBQVIsQ0FBYjtBQUNBLElBQUlJLFdBQVdKLFFBQVEsWUFBUixDQUFmO0FBQ0EsSUFBSUssV0FBV0wsUUFBUSxZQUFSLENBQWY7O2dCQUNpQ0EsUUFBUSxh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O0FBQzNCLGlCQUFLUixRQUFMLENBQWNPLFNBQVNFLElBQXZCO0FBQ0FaLGtCQUFRLE9BQUt0QixPQUFMLENBQWFFLE1BQXJCO0FBQ0QsU0FIRCxNQUdPO0FBQ0xxQixpQkFBT1MsUUFBUDtBQUNEO0FBQ0YsT0FSSCxFQVNFVCxNQVRGO0FBV0Q7OztvQ0FFZTtBQUNkLFVBQUlZLFdBQVMsS0FBS25DLE9BQUwsQ0FBYW1CLFFBQXRCLEdBQWlDaEMsVUFBckM7QUFDQSxVQUFJUyxXQUFXLEtBQUtJLE9BQUwsQ0FBYUosUUFBNUI7QUFDQSxVQUFJQyxlQUFlLEtBQUtHLE9BQUwsQ0FBYUgsWUFBaEM7QUFDQSxhQUFPcEIsTUFBTTtBQUNYLGVBQU8wRCxHQURJO0FBRVgsa0JBQVUsTUFGQztBQUdYLGdCQUFRO0FBQ04sc0JBQVl2QyxRQUROO0FBRU4sc0JBQVlDO0FBRk47QUFIRyxPQUFOLENBQVA7QUFRRDs7Ozs7O0FBRUg7O0FBRUF1QyxPQUFPQyxPQUFQLEdBQWlCOUMsR0FBakIiLCJmaWxlIjoiQXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsibGV0IGF4aW9zID0gcmVxdWlyZSgnYXhpb3MnKTtcbmxldCB7Y2hlY2tUeXBlfSA9IHJlcXVpcmUoJy4vaGVscGVycycpO1xubGV0IE1vZGVscyA9IHJlcXVpcmUoJy4vTW9kZWxzJyk7XG5sZXQgSW5wdXRzID0gcmVxdWlyZSgnLi9JbnB1dHMnKTtcbmxldCBDb25jZXB0cyA9IHJlcXVpcmUoJy4vQ29uY2VwdHMnKTtcbmxldCBXb3JrZmxvdyA9IHJlcXVpcmUoJy4vV29ya2Zsb3cnKTtcbmxldCB7QVBJLCBFUlJPUlMsIGdldEJhc2VQYXRofSA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5sZXQge1RPS0VOX1BBVEh9ID0gQVBJO1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgISgnUHJvbWlzZScgaW4gd2luZG93KSkge1xuICB3aW5kb3cuUHJvbWlzZSA9IHJlcXVpcmUoJ3Byb21pc2UnKTtcbn1cblxuaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnICYmICEoJ1Byb21pc2UnIGluIGdsb2JhbCkpIHtcbiAgZ2xvYmFsLlByb21pc2UgPSByZXF1aXJlKCdwcm9taXNlJyk7XG59XG5cbi8qKlxuICogdG9wLWxldmVsIGNsYXNzIHRoYXQgYWxsb3dzIGFjY2VzcyB0byBtb2RlbHMsIGlucHV0cyBhbmQgY29uY2VwdHNcbiAqIEBjbGFzc1xuICovXG5jbGFzcyBBcHAge1xuICBjb25zdHJ1Y3RvcihhcmcxLCBhcmcyLCBhcmczKSB7XG4gICAgbGV0IG9wdGlvbnNPYmogPSBhcmcxO1xuICAgIGlmICh0eXBlb2YgYXJnMSAhPT0gJ29iamVjdCcgfHwgYXJnMSA9PT0gbnVsbCkge1xuICAgICAgb3B0aW9uc09iaiA9IGFyZzMgfHwge307XG4gICAgICBvcHRpb25zT2JqLmNsaWVudElkID0gYXJnMTtcbiAgICAgIG9wdGlvbnNPYmouY2xpZW50U2VjcmV0ID0gYXJnMjtcbiAgICB9XG4gICAgdGhpcy5fdmFsaWRhdGUob3B0aW9uc09iaik7XG4gICAgdGhpcy5faW5pdChvcHRpb25zT2JqKTtcblxuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYSB0b2tlbiBmcm9tIHRoZSBBUEkgdXNpbmcgY2xpZW50IGNyZWRlbnRpYWxzXG4gICAqIEByZXR1cm4ge1Byb21pc2UodG9rZW4sIGVycm9yKX0gQSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdpdGggdGhlIHRva2VuIHN0cmluZyBvciByZWplY3RlZCB3aXRoIGFuIGVycm9yXG4gICAqL1xuICBnZXRUb2tlbigpIHtcbiAgICByZXR1cm4gdGhpcy5fY29uZmlnLnRva2VuKCk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgdG9rZW4gdG8gdXNlIGZvciB0aGUgQVBJXG4gICAqIEBwYXJhbSB7U3RyaW5nfSAgICAgICAgIF90b2tlbiAgICBUaGUgdG9rZW4geW91IGFyZSBzZXR0aW5nXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59ICAgICAgICAgICAgICAgICB0cnVlIGlmIHRva2VuIGhhcyB2YWxpZCBmaWVsZHMsIGZhbHNlIGlmIG5vdFxuICAgKi9cbiAgc2V0VG9rZW4oX3Rva2VuKSB7XG4gICAgbGV0IHRva2VuID0gX3Rva2VuO1xuICAgIGxldCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICBpZiAodHlwZW9mIF90b2tlbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRva2VuID0ge1xuICAgICAgICBhY2Nlc3NUb2tlbjogX3Rva2VuLFxuICAgICAgICBleHBpcmVzSW46IDE3NjQwMFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdG9rZW4gPSB7XG4gICAgICAgIGFjY2Vzc1Rva2VuOiBfdG9rZW4uYWNjZXNzX3Rva2VuIHx8IF90b2tlbi5hY2Nlc3NUb2tlbixcbiAgICAgICAgZXhwaXJlc0luOiBfdG9rZW4uZXhwaXJlc19pbiB8fCBfdG9rZW4uZXhwaXJlc0luXG4gICAgICB9O1xuICAgIH1cbiAgICBpZiAoKHRva2VuLmFjY2Vzc1Rva2VuICYmIHRva2VuLmV4cGlyZXNJbikgfHxcbiAgICAgICh0b2tlbi5hY2Nlc3NfdG9rZW4gJiYgdG9rZW4uZXhwaXJlc19pbikpIHtcbiAgICAgIGlmICghdG9rZW4uZXhwaXJlVGltZSkge1xuICAgICAgICB0b2tlbi5leHBpcmVUaW1lID0gbm93ICsgKHRva2VuLmV4cGlyZXNJbiAqIDEwMDApO1xuICAgICAgfVxuICAgICAgdGhpcy5fY29uZmlnLl90b2tlbiA9IHRva2VuO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIF92YWxpZGF0ZSh7Y2xpZW50SWQsIGNsaWVudFNlY3JldCwgdG9rZW4sIGFwaUtleSwgc2Vzc2lvblRva2VufSkge1xuICAgIGlmICgoIWNsaWVudElkIHx8ICFjbGllbnRTZWNyZXQpICYmICF0b2tlbiAmJiAhYXBpS2V5ICYmICFzZXNzaW9uVG9rZW4pIHtcbiAgICAgIHRocm93IEVSUk9SUy5wYXJhbXNSZXF1aXJlZChbJ0NsaWVudCBJRCcsICdDbGllbnQgU2VjcmV0J10pO1xuICAgIH1cbiAgfVxuXG4gIF9pbml0KG9wdGlvbnMpIHtcbiAgICBsZXQgYXBpRW5kcG9pbnQgPSBvcHRpb25zLmFwaUVuZHBvaW50IHx8XG4gICAgICAocHJvY2VzcyAmJiBwcm9jZXNzLmVudiAmJiBwcm9jZXNzLmVudi5BUElfRU5EUE9JTlQpIHx8ICdodHRwczovL2FwaS5jbGFyaWZhaS5jb20nO1xuICAgIHRoaXMuX2NvbmZpZyA9IHtcbiAgICAgIGFwaUVuZHBvaW50LFxuICAgICAgY2xpZW50SWQ6IG9wdGlvbnMuY2xpZW50SWQsXG4gICAgICBjbGllbnRTZWNyZXQ6IG9wdGlvbnMuY2xpZW50U2VjcmV0LFxuICAgICAgYXBpS2V5OiBvcHRpb25zLmFwaUtleSxcbiAgICAgIHNlc3Npb25Ub2tlbjogb3B0aW9ucy5zZXNzaW9uVG9rZW4sXG4gICAgICBiYXNlUGF0aDogZ2V0QmFzZVBhdGgoYXBpRW5kcG9pbnQsIG9wdGlvbnMudXNlcklkLCBvcHRpb25zLmFwcElkKSxcbiAgICAgIHRva2VuOiAoKSA9PiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgbGV0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgIGlmIChjaGVja1R5cGUoL09iamVjdC8sIHRoaXMuX2NvbmZpZy5fdG9rZW4pICYmIHRoaXMuX2NvbmZpZy5fdG9rZW4uZXhwaXJlVGltZSA+IG5vdykge1xuICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLl9jb25maWcuX3Rva2VuKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZ2V0VG9rZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gICAgaWYgKG9wdGlvbnMudG9rZW4pIHtcbiAgICAgIHRoaXMuc2V0VG9rZW4ob3B0aW9ucy50b2tlbik7XG4gICAgfVxuICAgIHRoaXMubW9kZWxzID0gbmV3IE1vZGVscyh0aGlzLl9jb25maWcpO1xuICAgIHRoaXMuaW5wdXRzID0gbmV3IElucHV0cyh0aGlzLl9jb25maWcpO1xuICAgIHRoaXMuY29uY2VwdHMgPSBuZXcgQ29uY2VwdHModGhpcy5fY29uZmlnKTtcbiAgICB0aGlzLndvcmtmbG93ID0gbmV3IFdvcmtmbG93KHRoaXMuX2NvbmZpZyk7XG4gIH1cblxuICBfZ2V0VG9rZW4ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdGhpcy5fcmVxdWVzdFRva2VuKCkudGhlbihcbiAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICB0aGlzLnNldFRva2VuKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgIHJlc29sdmUodGhpcy5fY29uZmlnLl90b2tlbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVqZWN0KHJlc3BvbnNlKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHJlamVjdFxuICAgICk7XG4gIH1cblxuICBfcmVxdWVzdFRva2VuKCkge1xuICAgIGxldCB1cmwgPSBgJHt0aGlzLl9jb25maWcuYmFzZVBhdGh9JHtUT0tFTl9QQVRIfWA7XG4gICAgbGV0IGNsaWVudElkID0gdGhpcy5fY29uZmlnLmNsaWVudElkO1xuICAgIGxldCBjbGllbnRTZWNyZXQgPSB0aGlzLl9jb25maWcuY2xpZW50U2VjcmV0O1xuICAgIHJldHVybiBheGlvcyh7XG4gICAgICAndXJsJzogdXJsLFxuICAgICAgJ21ldGhvZCc6ICdQT1NUJyxcbiAgICAgICdhdXRoJzoge1xuICAgICAgICAndXNlcm5hbWUnOiBjbGllbnRJZCxcbiAgICAgICAgJ3Bhc3N3b3JkJzogY2xpZW50U2VjcmV0XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cbjtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHA7XG4iXX0=
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/App.js","/")
},{"./Concepts":39,"./Inputs":41,"./Models":44,"./Workflow":45,"./constants":46,"./helpers":48,"axios":4,"buffer":23,"pBGvAp":27,"promise":28}],38:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * class representing a concept and its info
 * @class
 */
var Concept = function Concept(_config, data) {
  _classCallCheck(this, Concept);

  this.id = data.id;
  this.name = data.name;
  this.createdAt = data.created_at || data.createdAt;
  this.appId = data.app_id || data.appId;
  this.value = data.value || null;
  this._config = _config;
  this.rawData = data;
};

;

module.exports = Concept;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkNvbmNlcHQuanMiXSwibmFtZXMiOlsiQ29uY2VwdCIsIl9jb25maWciLCJkYXRhIiwiaWQiLCJuYW1lIiwiY3JlYXRlZEF0IiwiY3JlYXRlZF9hdCIsImFwcElkIiwiYXBwX2lkIiwidmFsdWUiLCJyYXdEYXRhIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBOzs7O0lBSU1BLE8sR0FDSixpQkFBWUMsT0FBWixFQUFxQkMsSUFBckIsRUFBMkI7QUFBQTs7QUFDekIsT0FBS0MsRUFBTCxHQUFVRCxLQUFLQyxFQUFmO0FBQ0EsT0FBS0MsSUFBTCxHQUFZRixLQUFLRSxJQUFqQjtBQUNBLE9BQUtDLFNBQUwsR0FBaUJILEtBQUtJLFVBQUwsSUFBbUJKLEtBQUtHLFNBQXpDO0FBQ0EsT0FBS0UsS0FBTCxHQUFhTCxLQUFLTSxNQUFMLElBQWVOLEtBQUtLLEtBQWpDO0FBQ0EsT0FBS0UsS0FBTCxHQUFhUCxLQUFLTyxLQUFMLElBQWMsSUFBM0I7QUFDQSxPQUFLUixPQUFMLEdBQWVBLE9BQWY7QUFDQSxPQUFLUyxPQUFMLEdBQWVSLElBQWY7QUFDRCxDOztBQUVIOztBQUVBUyxPQUFPQyxPQUFQLEdBQWlCWixPQUFqQiIsImZpbGUiOiJDb25jZXB0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBjbGFzcyByZXByZXNlbnRpbmcgYSBjb25jZXB0IGFuZCBpdHMgaW5mb1xuICogQGNsYXNzXG4gKi9cbmNsYXNzIENvbmNlcHQge1xuICBjb25zdHJ1Y3RvcihfY29uZmlnLCBkYXRhKSB7XG4gICAgdGhpcy5pZCA9IGRhdGEuaWQ7XG4gICAgdGhpcy5uYW1lID0gZGF0YS5uYW1lO1xuICAgIHRoaXMuY3JlYXRlZEF0ID0gZGF0YS5jcmVhdGVkX2F0IHx8IGRhdGEuY3JlYXRlZEF0O1xuICAgIHRoaXMuYXBwSWQgPSBkYXRhLmFwcF9pZCB8fCBkYXRhLmFwcElkO1xuICAgIHRoaXMudmFsdWUgPSBkYXRhLnZhbHVlIHx8IG51bGw7XG4gICAgdGhpcy5fY29uZmlnID0gX2NvbmZpZztcbiAgICB0aGlzLnJhd0RhdGEgPSBkYXRhO1xuICB9XG59XG47XG5cbm1vZHVsZS5leHBvcnRzID0gQ29uY2VwdDtcbiJdfQ==
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/Concept.js","/")
},{"buffer":23,"pBGvAp":27}],39:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var axios = require('axios');
var Concept = require('./Concept');

var _require = require('./constants'),
    API = _require.API,
    replaceVars = _require.replaceVars;

var CONCEPTS_PATH = API.CONCEPTS_PATH,
    CONCEPT_PATH = API.CONCEPT_PATH,
    CONCEPT_SEARCH_PATH = API.CONCEPT_SEARCH_PATH;

var _require2 = require('./utils'),
    wrapToken = _require2.wrapToken,
    formatConcept = _require2.formatConcept;

var _require3 = require('./helpers'),
    isSuccess = _require3.isSuccess,
    checkType = _require3.checkType;

/**
 * class representing a collection of concepts
 * @class
 */


var Concepts = function () {
  function Concepts(_config) {
    var _this = this;

    var rawData = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

    _classCallCheck(this, Concepts);

    this._config = _config;
    this.rawData = rawData;
    rawData.forEach(function (conceptData, index) {
      _this[index] = new Concept(_this._config, conceptData);
    });
    this.length = rawData.length;
  }

  /**
   * List all the concepts
   * @param {object}     options     Object with keys explained below: (optional)
   *    @param {number}    options.page        The page number (optional, default: 1)
   *    @param {number}    options.perPage     Number of images to return per page (optional, default: 20)
   * @return {Promise(Concepts, error)} A Promise that is fulfilled with a Concepts instance or rejected with an error
   */


  _createClass(Concepts, [{
    key: 'list',
    value: function list() {
      var _this2 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { page: 1, perPage: 20 };

      var url = '' + this._config.basePath + CONCEPTS_PATH;
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.get(url, {
            headers: headers,
            params: {
              'page': options.page,
              'per_page': options.perPage
            }
          }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new Concepts(_this2._config, response.data.concepts));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }

    /**
     * List a single concept given an id
     * @param {String}     id          The concept's id
     * @return {Promise(Concept, error)} A Promise that is fulfilled with a Concept instance or rejected with an error
     */

  }, {
    key: 'get',
    value: function get(id) {
      var _this3 = this;

      var url = '' + this._config.basePath + replaceVars(CONCEPT_PATH, [id]);
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.get(url, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new Concept(_this3._config, response.data.concept));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }

    /**
     * Add a list of concepts given an id and name
     * @param {object|object[]}   concepts       Can be a single media object or an array of media objects
     *   @param  {object|string}    concepts[].concept         If string, this is assumed to be the concept id. Otherwise, an object with the following attributes
     *     @param  {object}           concepts[].concept.id      The new concept's id (Required)
     *     @param  {object}           concepts[].concept.name    The new concept's name
     * @return {Promise(Concepts, error)}             A Promise that is fulfilled with a Concepts instance or rejected with an error
     */

  }, {
    key: 'create',
    value: function create() {
      var _this4 = this;

      var concepts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

      if (checkType(/(Object|String)/, concepts)) {
        concepts = [concepts];
      }
      var data = {
        'concepts': concepts.map(formatConcept)
      };
      var url = '' + this._config.basePath + CONCEPTS_PATH;
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.post(url, data, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new Concepts(_this4._config, response.data.concepts));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }

    /**
     * Search for a concept given a name. A wildcard can be given (example: The name "bo*" will match with "boat" and "bow" given those concepts exist
     * @param  {string}   name  The name of the concept to search for
     * @return {Promise(Concepts, error)} A Promise that is fulfilled with a Concepts instance or rejected with an error
     */

  }, {
    key: 'search',
    value: function search(name) {
      var _this5 = this;

      var language = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

      var url = '' + this._config.basePath + CONCEPT_SEARCH_PATH;
      return wrapToken(this._config, function (headers) {
        var params = {
          'concept_query': { name: name, language: language }
        };
        return new Promise(function (resolve, reject) {
          axios.post(url, params, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new Concepts(_this5._config, response.data.concepts));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }
  }]);

  return Concepts;
}();

;

module.exports = Concepts;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkNvbmNlcHRzLmpzIl0sIm5hbWVzIjpbImF4aW9zIiwicmVxdWlyZSIsIkNvbmNlcHQiLCJBUEkiLCJyZXBsYWNlVmFycyIsIkNPTkNFUFRTX1BBVEgiLCJDT05DRVBUX1BBVEgiLCJDT05DRVBUX1NFQVJDSF9QQVRIIiwid3JhcFRva2VuIiwiZm9ybWF0Q29uY2VwdCIsImlzU3VjY2VzcyIsImNoZWNrVHlwZSIsIkNvbmNlcHRzIiwiX2NvbmZpZyIsInJhd0RhdGEiLCJmb3JFYWNoIiwiY29uY2VwdERhdGEiLCJpbmRleCIsImxlbmd0aCIsIm9wdGlvbnMiLCJwYWdlIiwicGVyUGFnZSIsInVybCIsImJhc2VQYXRoIiwiaGVhZGVycyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZ2V0IiwicGFyYW1zIiwidGhlbiIsInJlc3BvbnNlIiwiZGF0YSIsImNvbmNlcHRzIiwiaWQiLCJjb25jZXB0IiwibWFwIiwicG9zdCIsIm5hbWUiLCJsYW5ndWFnZSIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsVUFBVUQsUUFBUSxXQUFSLENBQWQ7O2VBQ3lCQSxRQUFRLGFBQVIsQztJQUFwQkUsRyxZQUFBQSxHO0lBQUtDLFcsWUFBQUEsVzs7SUFDTEMsYSxHQUFvREYsRyxDQUFwREUsYTtJQUFlQyxZLEdBQXFDSCxHLENBQXJDRyxZO0lBQWNDLG1CLEdBQXVCSixHLENBQXZCSSxtQjs7Z0JBQ0ROLFFBQVEsU0FBUixDO0lBQTVCTyxTLGFBQUFBLFM7SUFBV0MsYSxhQUFBQSxhOztnQkFDYVIsUUFBUSxXQUFSLEM7SUFBeEJTLFMsYUFBQUEsUztJQUFXQyxTLGFBQUFBLFM7O0FBRWhCOzs7Ozs7SUFJTUMsUTtBQUNKLG9CQUFZQyxPQUFaLEVBQW1DO0FBQUE7O0FBQUEsUUFBZEMsT0FBYyx1RUFBSixFQUFJOztBQUFBOztBQUNqQyxTQUFLRCxPQUFMLEdBQWVB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cmUoJ2F4aW9zJyk7XG5sZXQgQ29uY2VwdCA9IHJlcXVpcmUoJy4vQ29uY2VwdCcpO1xubGV0IHtBUEksIHJlcGxhY2VWYXJzfSA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5sZXQge0NPTkNFUFRTX1BBVEgsIENPTkNFUFRfUEFUSCwgQ09OQ0VQVF9TRUFSQ0hfUEFUSH0gPSBBUEk7XG5sZXQge3dyYXBUb2tlbiwgZm9ybWF0Q29uY2VwdH0gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5sZXQge2lzU3VjY2VzcywgY2hlY2tUeXBlfSA9IHJlcXVpcmUoJy4vaGVscGVycycpO1xuXG4vKipcbiAqIGNsYXNzIHJlcHJlc2VudGluZyBhIGNvbGxlY3Rpb24gb2YgY29uY2VwdHNcbiAqIEBjbGFzc1xuICovXG5jbGFzcyBDb25jZXB0cyB7XG4gIGNvbnN0cnVjdG9yKF9jb25maWcsIHJhd0RhdGEgPSBbXSkge1xuICAgIHRoaXMuX2NvbmZpZyA9IF9jb25maWc7XG4gICAgdGhpcy5yYXdEYXRhID0gcmF3RGF0YTtcbiAgICByYXdEYXRhLmZvckVhY2goKGNvbmNlcHREYXRhLCBpbmRleCkgPT4ge1xuICAgICAgdGhpc1tpbmRleF0gPSBuZXcgQ29uY2VwdCh0aGlzLl9jb25maWcsIGNvbmNlcHREYXRhKTtcbiAgICB9KTtcbiAgICB0aGlzLmxlbmd0aCA9IHJhd0RhdGEubGVuZ3RoO1xuICB9XG5cbiAgLyoqXG4gICAqIExpc3QgYWxsIHRoZSBjb25jZXB0c1xuICAgKiBAcGFyYW0ge29iamVjdH0gICAgIG9wdGlvbnMgICAgIE9iamVjdCB3aXRoIGtleXMgZXhwbGFpbmVkIGJlbG93OiAob3B0aW9uYWwpXG4gICAqICAgIEBwYXJhbSB7bnVtYmVyfSAgICBvcHRpb25zLnBhZ2UgICAgICAgIFRoZSBwYWdlIG51bWJlciAob3B0aW9uYWwsIGRlZmF1bHQ6IDEpXG4gICAqICAgIEBwYXJhbSB7bnVtYmVyfSAgICBvcHRpb25zLnBlclBhZ2UgICAgIE51bWJlciBvZiBpbWFnZXMgdG8gcmV0dXJuIHBlciBwYWdlIChvcHRpb25hbCwgZGVmYXVsdDogMjApXG4gICAqIEByZXR1cm4ge1Byb21pc2UoQ29uY2VwdHMsIGVycm9yKX0gQSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdpdGggYSBDb25jZXB0cyBpbnN0YW5jZSBvciByZWplY3RlZCB3aXRoIGFuIGVycm9yXG4gICAqL1xuICBsaXN0KG9wdGlvbnMgPSB7cGFnZTogMSwgcGVyUGFnZTogMjB9KSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuX2NvbmZpZy5iYXNlUGF0aH0ke0NPTkNFUFRTX1BBVEh9YDtcbiAgICByZXR1cm4gd3JhcFRva2VuKHRoaXMuX2NvbmZpZywgKGhlYWRlcnMpID0+IHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGF4aW9zLmdldCh1cmwsIHtcbiAgICAgICAgICBoZWFkZXJzLFxuICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgJ3BhZ2UnOiBvcHRpb25zLnBhZ2UsXG4gICAgICAgICAgICAncGVyX3BhZ2UnOiBvcHRpb25zLnBlclBhZ2UsXG4gICAgICAgICAgfVxuICAgICAgICB9KS50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgIGlmIChpc1N1Y2Nlc3MocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICByZXNvbHZlKG5ldyBDb25jZXB0cyh0aGlzLl9jb25maWcsIHJlc3BvbnNlLmRhdGEuY29uY2VwdHMpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KHJlc3BvbnNlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIHJlamVjdCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0IGEgc2luZ2xlIGNvbmNlcHQgZ2l2ZW4gYW4gaWRcbiAgICogQHBhcmFtIHtTdHJpbmd9ICAgICBpZCAgICAgICAgICBUaGUgY29uY2VwdCdzIGlkXG4gICAqIEByZXR1cm4ge1Byb21pc2UoQ29uY2VwdCwgZXJyb3IpfSBBIFByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2l0aCBhIENvbmNlcHQgaW5zdGFuY2Ugb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgZ2V0KGlkKSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuX2NvbmZpZy5iYXNlUGF0aH0ke3JlcGxhY2VWYXJzKENPTkNFUFRfUEFUSCwgW2lkXSl9YDtcbiAgICByZXR1cm4gd3JhcFRva2VuKHRoaXMuX2NvbmZpZywgKGhlYWRlcnMpID0+IHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGF4aW9zLmdldCh1cmwsIHtoZWFkZXJzfSkudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICBpZiAoaXNTdWNjZXNzKHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgcmVzb2x2ZShuZXcgQ29uY2VwdCh0aGlzLl9jb25maWcsIHJlc3BvbnNlLmRhdGEuY29uY2VwdCkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIGxpc3Qgb2YgY29uY2VwdHMgZ2l2ZW4gYW4gaWQgYW5kIG5hbWVcbiAgICogQHBhcmFtIHtvYmplY3R8b2JqZWN0W119ICAgY29uY2VwdHMgICAgICAgQ2FuIGJlIGEgc2luZ2xlIG1lZGlhIG9iamVjdCBvciBhbiBhcnJheSBvZiBtZWRpYSBvYmplY3RzXG4gICAqICAgQHBhcmFtICB7b2JqZWN0fHN0cmluZ30gICAgY29uY2VwdHNbXS5jb25jZXB0ICAgICAgICAgSWYgc3RyaW5nLCB0aGlzIGlzIGFzc3VtZWQgdG8gYmUgdGhlIGNvbmNlcHQgaWQuIE90aGVyd2lzZSwgYW4gb2JqZWN0IHdpdGggdGhlIGZvbGxvd2luZyBhdHRyaWJ1dGVzXG4gICAqICAgICBAcGFyYW0gIHtvYmplY3R9ICAgICAgICAgICBjb25jZXB0c1tdLmNvbmNlcHQuaWQgICAgICBUaGUgbmV3IGNvbmNlcHQncyBpZCAoUmVxdWlyZWQpXG4gICAqICAgICBAcGFyYW0gIHtvYmplY3R9ICAgICAgICAgICBjb25jZXB0c1tdLmNvbmNlcHQubmFtZSAgICBUaGUgbmV3IGNvbmNlcHQncyBuYW1lXG4gICAqIEByZXR1cm4ge1Byb21pc2UoQ29uY2VwdHMsIGVycm9yKX0gICAgICAgICAgICAgQSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdpdGggYSBDb25jZXB0cyBpbnN0YW5jZSBvciByZWplY3RlZCB3aXRoIGFuIGVycm9yXG4gICAqL1xuICBjcmVhdGUoY29uY2VwdHMgPSBbXSkge1xuICAgIGlmIChjaGVja1R5cGUoLyhPYmplY3R8U3RyaW5nKS8sIGNvbmNlcHRzKSkge1xuICAgICAgY29uY2VwdHMgPSBbY29uY2VwdHNdO1xuICAgIH1cbiAgICBsZXQgZGF0YSA9IHtcbiAgICAgICdjb25jZXB0cyc6IGNvbmNlcHRzLm1hcChmb3JtYXRDb25jZXB0KVxuICAgIH07XG4gICAgbGV0IHVybCA9IGAke3RoaXMuX2NvbmZpZy5iYXNlUGF0aH0ke0NPTkNFUFRTX1BBVEh9YDtcbiAgICByZXR1cm4gd3JhcFRva2VuKHRoaXMuX2NvbmZpZywgKGhlYWRlcnMpID0+IHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGF4aW9zLnBvc3QodXJsLCBkYXRhLCB7aGVhZGVyc30pXG4gICAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNTdWNjZXNzKHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgICByZXNvbHZlKG5ldyBDb25jZXB0cyh0aGlzLl9jb25maWcsIHJlc3BvbnNlLmRhdGEuY29uY2VwdHMpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlYXJjaCBmb3IgYSBjb25jZXB0IGdpdmVuIGEgbmFtZS4gQSB3aWxkY2FyZCBjYW4gYmUgZ2l2ZW4gKGV4YW1wbGU6IFRoZSBuYW1lIFwiYm8qXCIgd2lsbCBtYXRjaCB3aXRoIFwiYm9hdFwiIGFuZCBcImJvd1wiIGdpdmVuIHRob3NlIGNvbmNlcHRzIGV4aXN0XG4gICAqIEBwYXJhbSAge3N0cmluZ30gICBuYW1lICBUaGUgbmFtZSBvZiB0aGUgY29uY2VwdCB0byBzZWFyY2ggZm9yXG4gICAqIEByZXR1cm4ge1Byb21pc2UoQ29uY2VwdHMsIGVycm9yKX0gQSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdpdGggYSBDb25jZXB0cyBpbnN0YW5jZSBvciByZWplY3RlZCB3aXRoIGFuIGVycm9yXG4gICAqL1xuICBzZWFyY2gobmFtZSwgbGFuZ3VhZ2UgPSBudWxsKSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuX2NvbmZpZy5iYXNlUGF0aH0ke0NPTkNFUFRfU0VBUkNIX1BBVEh9YDtcbiAgICByZXR1cm4gd3JhcFRva2VuKHRoaXMuX2NvbmZpZywgKGhlYWRlcnMpID0+IHtcbiAgICAgIGxldCBwYXJhbXMgPSB7XG4gICAgICAgICdjb25jZXB0X3F1ZXJ5Jzoge25hbWUsIGxhbmd1YWdlfVxuICAgICAgfTtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGF4aW9zLnBvc3QodXJsLCBwYXJhbXMsIHtoZWFkZXJzfSkudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICBpZiAoaXNTdWNjZXNzKHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgcmVzb2x2ZShuZXcgQ29uY2VwdHModGhpcy5fY29uZmlnLCByZXNwb25zZS5kYXRhLmNvbmNlcHRzKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCByZWplY3QpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cbjtcblxubW9kdWxlLmV4cG9ydHMgPSBDb25jZXB0cztcbiJdfQ==
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/Concepts.js","/")
},{"./Concept":38,"./constants":46,"./helpers":48,"./utils":49,"axios":4,"buffer":23,"pBGvAp":27}],40:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var axios = require('axios');
var Concepts = require('./Concepts');

var _require = require('./constants'),
    API = _require.API;

var INPUTS_PATH = API.INPUTS_PATH;

/**
 * class representing an input
 * @class
 */

var Input = function () {
  function Input(_config, data) {
    _classCallCheck(this, Input);

    this.id = data.id;
    this.createdAt = data.created_at || data.createdAt;
    this.imageUrl = data.data.image.url;
    this.concepts = new Concepts(_config, data.data.concepts);
    this.score = data.score;
    this.metadata = data.data.metadata;
    if (data.data.geo && data.data.geo['geo_point']) {
      this.geo = { geoPoint: data.data.geo['geo_point'] };
    }
    this.rawData = data;
    this._config = _config;
  }

  /**
   * Merge concepts to an input
   * @param {object[]}         concepts    Object with keys explained below:
   *   @param {object}           concepts[].concept
   *     @param {string}           concepts[].concept.id        The concept id (required)
   *     @param {boolean}          concepts[].concept.value     Whether or not the input is a positive (true) or negative (false) example of the concept (default: true)
   * @param {object}           metadata                      Object with key values to attach to the input (optional)
   * @return {Promise(Input, error)} A Promise that is fulfilled with an instance of Input or rejected with an error
   */


  _createClass(Input, [{
    key: 'mergeConcepts',
    value: function mergeConcepts(concepts, metadata) {
      return this._update('merge', concepts, metadata);
    }

    /**
     * Delete concept from an input
     * @param {object[]}         concepts    Object with keys explained below:
     *   @param {object}           concepts[].concept
     *     @param {string}           concepts[].concept.id        The concept id (required)
     *     @param {boolean}          concepts[].concept.value     Whether or not the input is a positive (true) or negative (false) example of the concept (default: true)
     * @param {object}           metadata                      Object with key values to attach to the input (optional)
     * @return {Promise(Input, error)} A Promise that is fulfilled with an instance of Input or rejected with an error
     */

  }, {
    key: 'deleteConcepts',
    value: function deleteConcepts(concepts, metadata) {
      return this._update('remove', concepts, metadata);
    }

    /**
     * Overwrite inputs
     * @param {object[]}         concepts                      Array of object with keys explained below:
     *   @param {object}           concepts[].concept
     *     @param {string}           concepts[].concept.id         The concept id (required)
     *     @param {boolean}          concepts[].concept.value      Whether or not the input is a positive (true) or negative (false) example of the concept (default: true)
     * @param {object}           metadata                      Object with key values to attach to the input (optional)
     * @return {Promise(Input, error)} A Promise that is fulfilled with an instance of Input or rejected with an error
     */

  }, {
    key: 'overwriteConcepts',
    value: function overwriteConcepts(concepts, metadata) {
      return this._update('overwrite', concepts, metadata);
    }
  }, {
    key: '_update',
    value: function _update(action) {
      var concepts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      var metadata = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

      var url = '' + this._config.basePath + INPUTS_PATH;
      var inputData = {};
      if (concepts.length) {
        inputData.concepts = concepts;
      }
      if (metadata !== null) {
        inputData.metadata = metadata;
      }
      var data = {
        action: action,
        inputs: [{
          id: this.id,
          data: inputData
        }]
      };
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          return axios.patch(url, data, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new Input(response.data.input));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }
  }]);

  return Input;
}();

;

module.exports = Input;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIklucHV0LmpzIl0sIm5hbWVzIjpbImF4aW9zIiwicmVxdWlyZSIsIkNvbmNlcHRzIiwiQVBJIiwiSU5QVVRTX1BBVEgiLCJJbnB1dCIsIl9jb25maWciLCJkYXRhIiwiaWQiLCJjcmVhdGVkQXQiLCJjcmVhdGVkX2F0IiwiaW1hZ2VVcmwiLCJpbWFnZSIsInVybCIsImNvbmNlcHRzIiwic2NvcmUiLCJtZXRhZGF0YSIsImdlbyIsImdlb1BvaW50IiwicmF3RGF0YSIsIl91cGRhdGUiLCJhY3Rpb24iLCJiYXNlUGF0aCIsImlucHV0RGF0YSIsImxlbmd0aCIsImlucHV0cyIsIndyYXBUb2tlbiIsImhlYWRlcnMiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInBhdGNoIiwidGhlbiIsInJlc3BvbnNlIiwiaXNTdWNjZXNzIiwiaW5wdXQiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFdBQVdELFFBQVEsWUFBUixDQUFmOztlQUNZQSxRQUFRLGFBQVIsQztJQUFQRSxHLFlBQUFBLEc7O0lBQ0FDLFcsR0FBZUQsRyxDQUFmQyxXOztBQUVMOzs7OztJQUlNQyxLO0FBQ0osaUJBQVlDLE9BQVosRUFBcUJDLElBQXJCLEVBQTJCO0FBQUE7O0FBQ3pCLFNBQUtDLEVBQUwsR0FBVUQsS0FBS0MsRUFBZjtBQUNBLFNBQUtDLFNBQUwsR0FBaUJGLEtBQUtHLFVBQUwsSUFBbUJILEtBQUtFLFNBQXpDO0FBQ0EsU0FBS0UsUUFBTCxHQUFnQkosS0FBS0EsSUFBTCxDQUFVSyxLQUFWLENBQWdCQyxHQUFoQztBQUNBLFNBQUtDLFFBQUwsR0FBZ0IsSUFBSVosUUFBSixDQUFhSSxPQUFiLEVBQXNCQyxLQUFLQSxJQUFMLENBQVVPLFFBQWhDLENBQWhCO0FBQ0EsU0FBS0MsS0FBTCxHQUFhUixLQUFLUSxLQUFsQjtBQUNBLFNBQUtDLFFBQUwsR0FBZ0JULEtBQUtBLElBQUwsQ0FBVVMsUUFBMUI7QUFDQSxRQUFJVCxLQUFLQSxJQUFMLENBQVVVLEdBQVYsSUFBaUJWLEtBQUtBLElBQUwsQ0FBVVUsR0FBVixDQUFjLFdBQWQsQ0FBckIsRUFBaUQ7QUFDL0MsV0FBS0EsR0FBTCxHQUFXLEVBQUNDLFVBQVVYLEtBQUtBLElBQUwsQ0FBVVUsR0FBVixDQUFjLFdBQWQsQ0FBWCxFQUFYO0FBQ0Q7QUFDRCxTQUFLRSxPQUFMLEdBQWVaLElBQWY7QUFDQSxTQUFLRCxPQUFMLEdBQWVBLE9BQWY7QUFDRDs7QUFFRDs7Ozs7Ozs7Ozs7OztrQ0FTY1EsUSxFQUFVRSxRLEVBQVU7QUFDaEMsYUFBTyxLQUFLSSxPQUFMLENBQWEsT0FBYixFQUFzQk4sUUFBdEIsRUFBZ0NFLFFBQWhDLENBQVA7QUFDRDs7QUFFRDs7Ozs7Ozs7Ozs7O21DQVNlRixRLEVBQVVFLFEsRUFBVTtBQUNqQyxhQUFPLEtBQUtJLE9BQUwsQ0FBYSxRQUFiLEVBQXVCTixRQUF2QixFQUFpQ0UsUUFBakMsQ0FBUDtBQUNEOztBQUVEOzs7Ozs7Ozs7Ozs7c0NBU2tCRixRLEVBQVVFLFEsRUFBVTtBQUNwQyxhQUFPLEtBQUtJLE9BQUwsQ0FBYSxXQUFiLEVBQTBCTixRQUExQixFQUFvQ0UsUUFBcEMsQ0FBUDtBQUNEOzs7NEJBRU9LLE0sRUFBd0M7QUFBQSxVQUFoQ1AsUUFBZ0MsdUVBQXJCLEVBQXFCO0FBQUEsVUFBakJFLFFBQWlCLHVFQUFOLElBQU07O0FBQzlDLFVBQUlILFdBQVMsS0FBS1AsT0FBTCxDQUFhZ0IsUUFBdEIsR0FBaUNsQixXQUFyQztBQUNBLFVBQUltQixZQUFZLEVBQWhCO0FBQ0EsVUFBSVQsU0FBU1UsTUFBYixFQUFxQjtBQUNuQkQsa0JBQVVULFFBQVYsR0FBcUJBLFFBQXJCO0FBQ0Q7QUFDRCxVQUFJRSxhQUFhLElBQWpCLEVBQXVCO0FBQ3JCTyxrQkFBVVAsUUFBVixHQUFxQkEsUUFBckI7QUFDRDtBQUNELFVBQUlULE9BQU87QUFDVGMsc0JBRFM7QUFFVEksZ0JBQVEsQ0FDTjtBQUNFakIsY0FBSSxLQUFLQSxFQURYO0FBRUVELGdCQUFNZ0I7QUFGUixTQURNO0FBRkMsT0FBWDtBQVNBLGFBQU9HLFVBQVUsS0FBS3BCLE9BQWYsRUFBd0IsVUFBQ3FCLE9BQUQsRUFBYTtBQUMxQyxlQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVVDLE1BQVYsRUFBcUI7QUFDdEMsaUJBQU85QixNQUFNK0IsS0FBTixDQUFZbEIsR0FBWixFQUFpQk4sSUFBakIsRUFBdUIsRUFBQ29CLGdCQUFELEVBQXZCLEVBQ0pLLElBREksQ0FDQyxVQUFDQyxRQUFELEVBQWM7QUFDbEIsZ0JBQUlDLFVBQVVELFFBQVYsQ0FBSixFQUF5QjtBQUN2Qkosc0JBQVEsSUFBSXhCLEtBQUosQ0FBVTRCLFNBQVMxQixJQUFULENBQWM0QixLQUF4QixDQUFSO0FBQ0QsYUFGRCxNQUVPO0FBQ0xMLHFCQUFPRyxRQUFQO0FBQ0Q7QUFDRixXQVBJLEVBT0ZILE1BUEUsQ0FBUDtBQVFELFNBVE0sQ0FBUDtBQVVELE9BWE0sQ0FBUDtBQVlEOzs7Ozs7QUFFSDs7QUFFQU0sT0FBT0MsT0FBUCxHQUFpQmhDLEtBQWpCIiwiZmlsZSI6IklucHV0LmpzIiwic291cmNlc0NvbnRlbnQiOlsibGV0IGF4aW9zID0gcmVxdWlyZSgnYXhpb3MnKTtcbmxldCBDb25jZXB0cyA9IHJlcXVpcmUoJy4vQ29uY2VwdHMnKTtcbmxldCB7QVBJfSA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5sZXQge0lOUFVUU19QQVRIfSA9IEFQSTtcblxuLyoqXG4gKiBjbGFzcyByZXByZXNlbnRpbmcgYW4gaW5wdXRcbiAqIEBjbGFzc1xuICovXG5jbGFzcyBJbnB1dCB7XG4gIGNvbnN0cnVjdG9yKF9jb25maWcsIGRhdGEpIHtcbiAgICB0aGlzLmlkID0gZGF0YS5pZDtcbiAgICB0aGlzLmNyZWF0ZWRBdCA9IGRhdGEuY3JlYXRlZF9hdCB8fCBkYXRhLmNyZWF0ZWRBdDtcbiAgICB0aGlzLmltYWdlVXJsID0gZGF0YS5kYXRhLmltYWdlLnVybDtcbiAgICB0aGlzLmNvbmNlcHRzID0gbmV3IENvbmNlcHRzKF9jb25maWcsIGRhdGEuZGF0YS5jb25jZXB0cyk7XG4gICAgdGhpcy5zY29yZSA9IGRhdGEuc2NvcmU7XG4gICAgdGhpcy5tZXRhZGF0YSA9IGRhdGEuZGF0YS5tZXRhZGF0YTtcbiAgICBpZiAoZGF0YS5kYXRhLmdlbyAmJiBkYXRhLmRhdGEuZ2VvWydnZW9fcG9pbnQnXSkge1xuICAgICAgdGhpcy5nZW8gPSB7Z2VvUG9pbnQ6IGRhdGEuZGF0YS5nZW9bJ2dlb19wb2ludCddfTtcbiAgICB9XG4gICAgdGhpcy5yYXdEYXRhID0gZGF0YTtcbiAgICB0aGlzLl9jb25maWcgPSBfY29uZmlnO1xuICB9XG5cbiAgLyoqXG4gICAqIE1lcmdlIGNvbmNlcHRzIHRvIGFuIGlucHV0XG4gICAqIEBwYXJhbSB7b2JqZWN0W119ICAgICAgICAgY29uY2VwdHMgICAgT2JqZWN0IHdpdGgga2V5cyBleHBsYWluZWQgYmVsb3c6XG4gICAqICAgQHBhcmFtIHtvYmplY3R9ICAgICAgICAgICBjb25jZXB0c1tdLmNvbmNlcHRcbiAgICogICAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgY29uY2VwdHNbXS5jb25jZXB0LmlkICAgICAgICBUaGUgY29uY2VwdCBpZCAocmVxdWlyZWQpXG4gICAqICAgICBAcGFyYW0ge2Jvb2xlYW59ICAgICAgICAgIGNvbmNlcHRzW10uY29uY2VwdC52YWx1ZSAgICAgV2hldGhlciBvciBub3QgdGhlIGlucHV0IGlzIGEgcG9zaXRpdmUgKHRydWUpIG9yIG5lZ2F0aXZlIChmYWxzZSkgZXhhbXBsZSBvZiB0aGUgY29uY2VwdCAoZGVmYXVsdDogdHJ1ZSlcbiAgICogQHBhcmFtIHtvYmplY3R9ICAgICAgICAgICBtZXRhZGF0YSAgICAgICAgICAgICAgICAgICAgICBPYmplY3Qgd2l0aCBrZXkgdmFsdWVzIHRvIGF0dGFjaCB0byB0aGUgaW5wdXQgKG9wdGlvbmFsKVxuICAgKiBAcmV0dXJuIHtQcm9taXNlKElucHV0LCBlcnJvcil9IEEgUHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aXRoIGFuIGluc3RhbmNlIG9mIElucHV0IG9yIHJlamVjdGVkIHdpdGggYW4gZXJyb3JcbiAgICovXG4gIG1lcmdlQ29uY2VwdHMoY29uY2VwdHMsIG1ldGFkYXRhKSB7XG4gICAgcmV0dXJuIHRoaXMuX3VwZGF0ZSgnbWVyZ2UnLCBjb25jZXB0cywgbWV0YWRhdGEpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZSBjb25jZXB0IGZyb20gYW4gaW5wdXRcbiAgICogQHBhcmFtIHtvYmplY3RbXX0gICAgICAgICBjb25jZXB0cyAgICBPYmplY3Qgd2l0aCBrZXlzIGV4cGxhaW5lZCBiZWxvdzpcbiAgICogICBAcGFyYW0ge29iamVjdH0gICAgICAgICAgIGNvbmNlcHRzW10uY29uY2VwdFxuICAgKiAgICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICBjb25jZXB0c1tdLmNvbmNlcHQuaWQgICAgICAgIFRoZSBjb25jZXB0IGlkIChyZXF1aXJlZClcbiAgICogICAgIEBwYXJhbSB7Ym9vbGVhbn0gICAgICAgICAgY29uY2VwdHNbXS5jb25jZXB0LnZhbHVlICAgICBXaGV0aGVyIG9yIG5vdCB0aGUgaW5wdXQgaXMgYSBwb3NpdGl2ZSAodHJ1ZSkgb3IgbmVnYXRpdmUgKGZhbHNlKSBleGFtcGxlIG9mIHRoZSBjb25jZXB0IChkZWZhdWx0OiB0cnVlKVxuICAgKiBAcGFyYW0ge29iamVjdH0gICAgICAgICAgIG1ldGFkYXRhICAgICAgICAgICAgICAgICAgICAgIE9iamVjdCB3aXRoIGtleSB2YWx1ZXMgdG8gYXR0YWNoIHRvIHRoZSBpbnB1dCAob3B0aW9uYWwpXG4gICAqIEByZXR1cm4ge1Byb21pc2UoSW5wdXQsIGVycm9yKX0gQSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdpdGggYW4gaW5zdGFuY2Ugb2YgSW5wdXQgb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgZGVsZXRlQ29uY2VwdHMoY29uY2VwdHMsIG1ldGFkYXRhKSB7XG4gICAgcmV0dXJuIHRoaXMuX3VwZGF0ZSgncmVtb3ZlJywgY29uY2VwdHMsIG1ldGFkYXRhKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPdmVyd3JpdGUgaW5wdXRzXG4gICAqIEBwYXJhbSB7b2JqZWN0W119ICAgICAgICAgY29uY2VwdHMgICAgICAgICAgICAgICAgICAgICAgQXJyYXkgb2Ygb2JqZWN0IHdpdGgga2V5cyBleHBsYWluZWQgYmVsb3c6XG4gICAqICAgQHBhcmFtIHtvYmplY3R9ICAgICAgICAgICBjb25jZXB0c1tdLmNvbmNlcHRcbiAgICogICAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgY29uY2VwdHNbXS5jb25jZXB0LmlkICAgICAgICAgVGhlIGNvbmNlcHQgaWQgKHJlcXVpcmVkKVxuICAgKiAgICAgQHBhcmFtIHtib29sZWFufSAgICAgICAgICBjb25jZXB0c1tdLmNvbmNlcHQudmFsdWUgICAgICBXaGV0aGVyIG9yIG5vdCB0aGUgaW5wdXQgaXMgYSBwb3NpdGl2ZSAodHJ1ZSkgb3IgbmVnYXRpdmUgKGZhbHNlKSBleGFtcGxlIG9mIHRoZSBjb25jZXB0IChkZWZhdWx0OiB0cnVlKVxuICAgKiBAcGFyYW0ge29iamVjdH0gICAgICAgICAgIG1ldGFkYXRhICAgICAgICAgICAgICAgICAgICAgIE9iamVjdCB3aXRoIGtleSB2YWx1ZXMgdG8gYXR0YWNoIHRvIHRoZSBpbnB1dCAob3B0aW9uYWwpXG4gICAqIEByZXR1cm4ge1Byb21pc2UoSW5wdXQsIGVycm9yKX0gQSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdpdGggYW4gaW5zdGFuY2Ugb2YgSW5wdXQgb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgb3ZlcndyaXRlQ29uY2VwdHMoY29uY2VwdHMsIG1ldGFkYXRhKSB7XG4gICAgcmV0dXJuIHRoaXMuX3VwZGF0ZSgnb3ZlcndyaXRlJywgY29uY2VwdHMsIG1ldGFkYXRhKTtcbiAgfVxuXG4gIF91cGRhdGUoYWN0aW9uLCBjb25jZXB0cyA9IFtdLCBtZXRhZGF0YSA9IG51bGwpIHtcbiAgICBsZXQgdXJsID0gYCR7dGhpcy5fY29uZmlnLmJhc2VQYXRofSR7SU5QVVRTX1BBVEh9YDtcbiAgICBsZXQgaW5wdXREYXRhID0ge307XG4gICAgaWYgKGNvbmNlcHRzLmxlbmd0aCkge1xuICAgICAgaW5wdXREYXRhLmNvbmNlcHRzID0gY29uY2VwdHM7XG4gICAgfVxuICAgIGlmIChtZXRhZGF0YSAhPT0gbnVsbCkge1xuICAgICAgaW5wdXREYXRhLm1ldGFkYXRhID0gbWV0YWRhdGE7XG4gICAgfVxuICAgIGxldCBkYXRhID0ge1xuICAgICAgYWN0aW9uLFxuICAgICAgaW5wdXRzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgICBkYXRhOiBpbnB1dERhdGFcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG4gICAgcmV0dXJuIHdyYXBUb2tlbih0aGlzLl9jb25maWcsIChoZWFkZXJzKSA9PiB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICByZXR1cm4gYXhpb3MucGF0Y2godXJsLCBkYXRhLCB7aGVhZGVyc30pXG4gICAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNTdWNjZXNzKHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgICByZXNvbHZlKG5ldyBJbnB1dChyZXNwb25zZS5kYXRhLmlucHV0KSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuO1xuXG5tb2R1bGUuZXhwb3J0cyA9IElucHV0O1xuIl19
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/Input.js","/")
},{"./Concepts":39,"./constants":46,"axios":4,"buffer":23,"pBGvAp":27}],41:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var axios = require('axios');
var Input = require('./Input');

var _require = require('./constants'),
    API = _require.API,
    ERRORS = _require.ERRORS,
    MAX_BATCH_SIZE = _require.MAX_BATCH_SIZE,
    replaceVars = _require.replaceVars;

var INPUT_PATH = API.INPUT_PATH,
    INPUTS_PATH = API.INPUTS_PATH,
    INPUTS_STATUS_PATH = API.INPUTS_STATUS_PATH,
    SEARCH_PATH = API.SEARCH_PATH;

var _require2 = require('./utils'),
    wrapToken = _require2.wrapToken,
    formatInput = _require2.formatInput,
    formatImagesSearch = _require2.formatImagesSearch,
    formatConceptsSearch = _require2.formatConceptsSearch;

var _require3 = require('./helpers'),
    isSuccess = _require3.isSuccess,
    checkType = _require3.checkType,
    clone = _require3.clone;

/**
 * class representing a collection of inputs
 * @class
 */


var Inputs = function () {
  function Inputs(_config) {
    var _this = this;

    var rawData = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

    _classCallCheck(this, Inputs);

    this.rawData = rawData;
    rawData.forEach(function (inputData, index) {
      if (inputData.input && inputData.score) {
        inputData.input.score = inputData.score;
        inputData = inputData.input;
      }
      _this[index] = new Input(_this._config, inputData);
    });
    this.length = rawData.length;
    this._config = _config;
  }

  /**
   * Get all inputs in app
   * @param {Object}    options  Object with keys explained below: (optional)
   *   @param {Number}    options.page  The page number (optional, default: 1)
   *   @param {Number}    options.perPage  Number of images to return per page (optional, default: 20)
   * @return {Promise(Inputs, error)} A Promise that is fulfilled with an instance of Inputs or rejected with an error
   */


  _createClass(Inputs, [{
    key: 'list',
    value: function list() {
      var _this2 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { page: 1, perPage: 20 };

      var url = '' + this._config.basePath + INPUTS_PATH;
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.get(url, {
            headers: headers,
            params: {
              page: options.page,
              per_page: options.perPage
            }
          }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new Inputs(_this2._config, response.data.inputs));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }

    /**
     * Adds an input or multiple inputs
     * @param {object|object[]}        inputs                                Can be a single media object or an array of media objects (max of 128 inputs/call; passing > 128 will throw an exception)
     *   @param {object|string}          inputs[].input                        If string, is given, this is assumed to be an image url
     *     @param {string}                 inputs[].input.(url|base64)           Can be a publicly accessibly url or base64 string representing image bytes (required)
     *     @param {string}                 inputs[].input.id                     ID of input (optional)
     *     @param {number[]}               inputs[].input.crop                   An array containing the percent to be cropped from top, left, bottom and right (optional)
     *     @param {object[]}               inputs[].input.metadata               Object with key and values pair (value can be string, array or other objects) to attach to the input (optional)
     *     @param {object}                 inputs[].input.geo                    Object with latitude and longitude coordinates to associate with an input. Can be used in search query as the proximity of an input to a reference point (optional)
     *       @param {number}                 inputs[].input.geo.latitude           +/- latitude val of geodata
     *       @param {number}                 inputs[].input.geo.longitude          +/- longitude val of geodata
     *     @param {object[]}               inputs[].input.concepts               An array of concepts to attach to media object (optional)
     *       @param {object|string}          inputs[].input.concepts[].concept     If string, is given, this is assumed to be concept id with value equals true
     *         @param {string}                 inputs[].input.concepts[].concept.id          The concept id (required)
     *         @param {boolean}                inputs[].input.concepts[].concept.value       Whether or not the input is a positive (true) or negative (false) example of the concept (default: true)
     * @return {Promise(Inputs, error)} A Promise that is fulfilled with an instance of Inputs or rejected with an error
     */

  }, {
    key: 'create',
    value: function create(inputs) {
      var _this3 = this;

      if (checkType(/(String|Object)/, inputs)) {
        inputs = [inputs];
      }
      var url = '' + this._config.basePath + INPUTS_PATH;
      if (inputs.length > MAX_BATCH_SIZE) {
        throw ERRORS.MAX_INPUTS;
      }
      return wrapToken(this._config, function (headers) {
        var data = {
          inputs: inputs.map(formatInput)
        };
        return new Promise(function (resolve, reject) {
          axios.post(url, data, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new Inputs(_this3._config, response.data.inputs));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }

    /**
     * Get input by id
     * @param {String}    id  The input id
     * @return {Promise(Input, error)} A Promise that is fulfilled with an instance of Input or rejected with an error
     */

  }, {
    key: 'get',
    value: function get(id) {
      var _this4 = this;

      var url = '' + this._config.basePath + replaceVars(INPUT_PATH, [id]);
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.get(url, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new Input(_this4._config, response.data.input));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }

    /**
     * Delete an input or a list of inputs by id or all inputs if no id is passed
     * @param {string|string[]}    id           The id of input to delete (optional)
     * @return {Promise(response, error)} A Promise that is fulfilled with the API response or rejected with an error
     */

  }, {
    key: 'delete',
    value: function _delete() {
      var id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

      var val = void 0;
      // delete an input
      if (checkType(/String/, id)) {
        var url = '' + this._config.basePath + replaceVars(INPUT_PATH, [id]);
        val = wrapToken(this._config, function (headers) {
          return axios.delete(url, { headers: headers });
        });
      } else {
        val = this._deleteInputs(id);
      }
      return val;
    }
  }, {
    key: '_deleteInputs',
    value: function _deleteInputs() {
      var id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

      var url = '' + this._config.basePath + INPUTS_PATH;
      return wrapToken(this._config, function (headers) {
        var data = id === null ? { delete_all: true } : { ids: id };
        return axios({
          url: url,
          method: 'delete',
          headers: headers,
          data: data
        });
      });
    }

    /**
     * Merge concepts to inputs in bulk
     * @param {object[]}         inputs    List of concepts to update (max of 128 inputs/call; passing > 128 will throw an exception)
     *   @param {object}           inputs[].input
     *     @param {string}           inputs[].input.id        The id of the input to update
     *     @param {string}           inputs[].input.concepts  Object with keys explained below:
     *       @param {object}           inputs[].input.concepts[].concept
     *         @param {string}           inputs[].input.concepts[].concept.id        The concept id (required)
     *         @param {boolean}          inputs[].input.concepts[].concept.value     Whether or not the input is a positive (true) or negative (false) example of the concept (default: true)
     * @return {Promise(Inputs, error)} A Promise that is fulfilled with an instance of Inputs or rejected with an error
     */

  }, {
    key: 'mergeConcepts',
    value: function mergeConcepts(inputs) {
      inputs.action = 'merge';
      return this.update(inputs);
    }

    /**
     * Delete concepts to inputs in bulk
     * @param {object[]}         inputs    List of concepts to update (max of 128 inputs/call; passing > 128 will throw an exception)
     *   @param {object}           inputs[].input
     *     @param {string}           inputs[].input.id                           The id of the input to update
     *     @param {string}           inputs[].input.concepts                     Object with keys explained below:
     *       @param {object}           inputs[].input.concepts[].concept
     *         @param {string}           inputs[].input.concepts[].concept.id        The concept id (required)
     *         @param {boolean}          inputs[].input.concepts[].concept.value     Whether or not the input is a positive (true) or negative (false) example of the concept (default: true)
     * @return {Promise(Inputs, error)} A Promise that is fulfilled with an instance of Inputs or rejected with an error
     */

  }, {
    key: 'deleteConcepts',
    value: function deleteConcepts(inputs) {
      inputs.action = 'remove';
      return this.update(inputs);
    }

    /**
     * Overwrite inputs in bulk
     * @param {object[]}         inputs    List of concepts to update (max of 128 inputs/call; passing > 128 will throw an exception)
     *   @param {object}           inputs[].input
     *     @param {string}           inputs[].input.id                           The id of the input to update
     *     @param {string}           inputs[].input.concepts                     Object with keys explained below:
     *       @param {object}           inputs[].input.concepts[].concept
     *         @param {string}           inputs[].input.concepts[].concept.id        The concept id (required)
     *         @param {boolean}          inputs[].input.concepts[].concept.value     Whether or not the input is a positive (true) or negative (false) example of the concept (default: true)
     * @return {Promise(Inputs, error)} A Promise that is fulfilled with an instance of Inputs or rejected with an error
     */

  }, {
    key: 'overwriteConcepts',
    value: function overwriteConcepts(inputs) {
      inputs.action = 'overwrite';
      return this.update(inputs);
    }

    /**
     * @param {object[]}         inputs    List of concepts to update (max of 128 inputs/call; passing > 128 will throw an exception)
     *   @param {object}           inputs[].input
     *     @param {string}           inputs[].input.id                           The id of the input to update
     *     @param {object}           inputs[].input.metadata                     Object with key values to attach to the input (optional)
     *     @param {object}           inputs[].input.geo                          Object with latitude and longitude coordinates to associate with an input. Can be used in search query as the proximity of an input to a reference point (optional)
     *       @param {number}           inputs[].input.geo.latitude                 +/- latitude val of geodata
     *       @param {number}           inputs[].input.geo.longitude                +/- longitude val of geodata
     *     @param {string}           inputs[].input.concepts                     Object with keys explained below (optional):
     *       @param {object}           inputs[].input.concepts[].concept
     *         @param {string}           inputs[].input.concepts[].concept.id        The concept id (required)
     *         @param {boolean}          inputs[].input.concepts[].concept.value     Whether or not the input is a positive (true) or negative (false) example of the concept (default: true)
     * @return {Promise(Inputs, error)} A Promise that is fulfilled with an instance of Inputs or rejected with an error
     */

  }, {
    key: 'update',
    value: function update(inputs) {
      var _this5 = this;

      var url = '' + this._config.basePath + INPUTS_PATH;
      var inputsList = Array.isArray(inputs) ? inputs : [inputs];
      if (inputsList.length > MAX_BATCH_SIZE) {
        throw ERRORS.MAX_INPUTS;
      }
      var data = {
        action: inputs.action,
        inputs: inputsList.map(function (input) {
          return formatInput(input, false);
        })
      };
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.patch(url, data, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new Inputs(_this5._config, response.data.inputs));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }

    /**
     * Search for inputs or outputs based on concepts or images
     *   @param {object[]}               queries          List of all predictions to match with
     *     @param {object}                 queries[].concept            An object with the following keys:
     *       @param {string}                 queries[].concept.id          The concept id
     *       @param {string}                 queries[].concept.type        Search over 'input' to get input matches to criteria or 'output' to get inputs that are visually similar to the criteria (default: 'output')
     *       @param {string}                 queries[].concept.name        The concept name
     *       @param {boolean}                queries[].concept.value       Indicates whether or not the term should match with the prediction returned (default: true)
     *     @param {object}                 queries[].input              An image object that contains the following keys:
     *       @param {string}                 queries[].input.id            The input id
     *       @param {string}                 queries[].input.type          Search over 'input' to get input matches to criteria or 'output' to get inputs that are visually similar to the criteria (default: 'output')
     *       @param {string}                 queries[].input.(base64|url)  Can be a publicly accessibly url or base64 string representing image bytes (required)
     *       @param {number[]}               queries[].input.crop          An array containing the percent to be cropped from top, left, bottom and right (optional)
     *       @param {object}                 queries[].input.metadata      An object with key and value specified by user to refine search with (optional)
     * @param {Object}                   options       Object with keys explained below: (optional)
     *    @param {Number}                  options.page          The page number (optional, default: 1)
     *    @param {Number}                  options.perPage       Number of images to return per page (optional, default: 20)
     * @return {Promise(response, error)} A Promise that is fulfilled with the API response or rejected with an error
     */

  }, {
    key: 'search',
    value: function search() {
      var queries = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { page: 1, perPage: 20 };

      var formattedAnds = [];
      var url = '' + this._config.basePath + SEARCH_PATH;
      var data = {
        query: {
          ands: []
        },
        pagination: {
          page: options.page,
          per_page: options.perPage
        }
      };

      if (!Array.isArray(queries)) {
        queries = [queries];
      }
      if (queries.length > 0) {
        queries.forEach(function (query) {
          if (query.input) {
            formattedAnds = formattedAnds.concat(formatImagesSearch(query.input));
          } else if (query.concept) {
            formattedAnds = formattedAnds.concat(formatConceptsSearch(query.concept));
          }
        });
        data.query.ands = formattedAnds;
      }
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.post(url, data, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              var _data = clone(response.data);
              _data.rawData = clone(response.data);
              resolve(_data);
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }

    /**
     * Get inputs status (number of uploaded, in process or failed inputs)
     * @return {Promise(response, error)} A Promise that is fulfilled with the API response or rejected with an error
     */

  }, {
    key: 'getStatus',
    value: function getStatus() {
      var url = '' + this._config.basePath + INPUTS_STATUS_PATH;
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.get(url, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              var data = clone(response.data);
              data.rawData = clone(response.data);
              resolve(data);
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }
  }]);

  return Inputs;
}();

;

module.exports = Inputs;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIklucHV0cy5qcyJdLCJuYW1lcyI6WyJheGlvcyIsInJlcXVpcmUiLCJJbnB1dCIsIkFQSSIsIkVSUk9SUyIsIk1BWF9CQVRDSF9TSVpFIiwicmVwbGFjZVZhcnMiLCJJTlBVVF9QQVRIIiwiSU5QVVRTX1BBVEgiLCJJTlBVVFNfU1RBVFVTX1BBVEgiLCJTRUFSQ0hfUEFUSCIsIndyYXBUb2tlbiIsImZvcm1hdElucHV0IiwiZm9ybWF0SW1hZ2VzU2VhcmNoIiwiZm9ybWF0Q29uY2VwdHNTZWFyY2giLCJpc1N1Y2Nlc3MiLCJjaGVja1R5cGUiLCJjbG9uZSIsIklucHV0cyIsIl9jb25maWciLCJyYXdEYXRhIiwiZm9yRWFjaCIsImlucHV0RGF0YSIsImluZGV4IiwiaW5wdXQiLCJzY29yZSIsImxlbmd0aCIsIm9wdGlvbnMiLCJwYWdlIiwicGVyUGFnZSIsInVybCIsImJhc2VQYXRoIiwiaGVhZGVycyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZ2V0IiwicGFyYW1zIiwicGVyX3BhZ2UiLCJ0aGVuIiwicmVzcG9uc2UiLCJkYXRhIiwiaW5wdXRzIiwiTUFYX0lOUFVUUyIsIm1hcCIsInBvc3QiLCJpZCIsInZhbCIsImRlbGV0ZSIsIl9kZWxldGVJbnB1dHMiLCJkZWxldGVfYWxsIiwiaWRzIiwibWV0aG9kIiwiYWN0aW9uIiwidXBkYXRlIiwiaW5wdXRzTGlzdCIsIkFycmF5IiwiaXNBcnJheSIsInBhdGNoIiwicXVlcmllcyIsImZvcm1hdHRlZEFuZHMiLCJxdWVyeSIsImFuZHMiLCJwYWdpbmF0aW9uIiwiY29uY2F0IiwiY29uY2VwdCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsUUFBUUQsUUFBUSxTQUFSLENBQVo7O2VBQ2lEQSxRQUFRLGFBQVIsQztJQUE1Q0UsRyxZQUFBQSxHO0lBQUtDLE0sWUFBQUEsTTtJQUFRQyxjLFlBQUFBLGM7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Q0dPLElBREgsQ0FDUSxVQUFDQyxRQUFELEVBQWM7QUFDbEIsZ0JBQUl6QixVQUFVeUIsUUFBVixDQUFKLEVBQXlCO0FBQ3ZCLGtCQUFJQyxRQUFPeEIsTUFBTXVCLFNBQVNDLElBQWYsQ0FBWDtBQUNBQSxvQkFBS3JCLE9BQUwsR0FBZUgsTUFBTXVCLFNBQVNDLElBQWYsQ0FBZjtBQUNBUCxzQkFBUU8sS0FBUjtBQUNELGFBSkQsTUFJTztBQUNMTixxQkFBT0ssUUFBUDtBQUNEO0FBQ0YsV0FUSCxFQVNLTCxNQVRMO0FBVUQsU0FYTSxDQUFQO0FBWUQsT0FiTSxDQUFQO0FBY0Q7O0FBRUQ7Ozs7Ozs7Z0NBSVk7QUFDVixVQUFJTCxXQUFTLEtBQUtYLE9BQUwsQ0FBYVksUUFBdEIsR0FBaUN0QixrQkFBckM7QUFDQSxhQUFPRSxVQUFVLEtBQUtRLE9BQWYsRUFBd0IsVUFBQ2EsT0FBRCxFQUFhO0FBQzFDLGVBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjtBQUN0Q25DLGdCQUFNb0MsR0FBTixDQUFVTixHQUFWLEVBQWUsRUFBQ0UsZ0JBQUQsRUFBZixFQUNHTyxJQURILENBQ1EsVUFBQ0MsUUFBRCxFQUFjO0FBQ2xCLGdCQUFJekIsVUFBVXlCLFFBQVYsQ0FBSixFQUF5QjtBQUN2QixrQkFBSUMsT0FBT3hCLE1BQU11QixTQUFTQyxJQUFmLENBQVg7QUFDQUEsbUJBQUtyQixPQUFMLEdBQWVILE1BQU11QixTQUFTQyxJQUFmLENBQWY7QUFDQVAsc0JBQVFPLElBQVI7QUFDRCxhQUpELE1BSU87QUFDTE4scUJBQU9LLFFBQVA7QUFDRDtBQUNGLFdBVEgsRUFTS0wsTUFUTDtBQVVELFNBWE0sQ0FBUDtBQVlELE9BYk0sQ0FBUDtBQWNEOzs7Ozs7QUFFSDs7QUFFQStCLE9BQU9DLE9BQVAsR0FBaUJqRCxNQUFqQiIsImZpbGUiOiJJbnB1dHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgYXhpb3MgPSByZXF1aXJlKCdheGlvcycpO1xubGV0IElucHV0ID0gcmVxdWlyZSgnLi9JbnB1dCcpO1xubGV0IHtBUEksIEVSUk9SUywgTUFYX0JBVENIX1NJWkUsIHJlcGxhY2VWYXJzfSA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5sZXQge0lOUFVUX1BBVEgsIElOUFVUU19QQVRILCBJTlBVVFNfU1RBVFVTX1BBVEgsIFNFQVJDSF9QQVRIfSA9IEFQSTtcbmxldCB7d3JhcFRva2VuLCBmb3JtYXRJbnB1dCwgZm9ybWF0SW1hZ2VzU2VhcmNoLCBmb3JtYXRDb25jZXB0c1NlYXJjaH0gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5sZXQge2lzU3VjY2VzcywgY2hlY2tUeXBlLCBjbG9uZX0gPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcblxuLyoqXG4gKiBjbGFzcyByZXByZXNlbnRpbmcgYSBjb2xsZWN0aW9uIG9mIGlucHV0c1xuICogQGNsYXNzXG4gKi9cbmNsYXNzIElucHV0cyB7XG4gIGNvbnN0cnVjdG9yKF9jb25maWcsIHJhd0RhdGEgPSBbXSkge1xuICAgIHRoaXMucmF3RGF0YSA9IHJhd0RhdGE7XG4gICAgcmF3RGF0YS5mb3JFYWNoKChpbnB1dERhdGEsIGluZGV4KSA9PiB7XG4gICAgICBpZiAoaW5wdXREYXRhLmlucHV0ICYmIGlucHV0RGF0YS5zY29yZSkge1xuICAgICAgICBpbnB1dERhdGEuaW5wdXQuc2NvcmUgPSBpbnB1dERhdGEuc2NvcmU7XG4gICAgICAgIGlucHV0RGF0YSA9IGlucHV0RGF0YS5pbnB1dDtcbiAgICAgIH1cbiAgICAgIHRoaXNbaW5kZXhdID0gbmV3IElucHV0KHRoaXMuX2NvbmZpZywgaW5wdXREYXRhKTtcbiAgICB9KTtcbiAgICB0aGlzLmxlbmd0aCA9IHJhd0RhdGEubGVuZ3RoO1xuICAgIHRoaXMuX2NvbmZpZyA9IF9jb25maWc7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBpbnB1dHMgaW4gYXBwXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAgICBvcHRpb25zICBPYmplY3Qgd2l0aCBrZXlzIGV4cGxhaW5lZCBiZWxvdzogKG9wdGlvbmFsKVxuICAgKiAgIEBwYXJhbSB7TnVtYmVyfSAgICBvcHRpb25zLnBhZ2UgIFRoZSBwYWdlIG51bWJlciAob3B0aW9uYWwsIGRlZmF1bHQ6IDEpXG4gICAqICAgQHBhcmFtIHtOdW1iZXJ9ICAgIG9wdGlvbnMucGVyUGFnZSAgTnVtYmVyIG9mIGltYWdlcyB0byByZXR1cm4gcGVyIHBhZ2UgKG9wdGlvbmFsLCBkZWZhdWx0OiAyMClcbiAgICogQHJldHVybiB7UHJvbWlzZShJbnB1dHMsIGVycm9yKX0gQSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdpdGggYW4gaW5zdGFuY2Ugb2YgSW5wdXRzIG9yIHJlamVjdGVkIHdpdGggYW4gZXJyb3JcbiAgICovXG4gIGxpc3Qob3B0aW9ucyA9IHtwYWdlOiAxLCBwZXJQYWdlOiAyMH0pIHtcbiAgICBsZXQgdXJsID0gYCR7dGhpcy5fY29uZmlnLmJhc2VQYXRofSR7SU5QVVRTX1BBVEh9YDtcbiAgICByZXR1cm4gd3JhcFRva2VuKHRoaXMuX2NvbmZpZywgKGhlYWRlcnMpID0+IHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGF4aW9zLmdldCh1cmwsIHtcbiAgICAgICAgICBoZWFkZXJzLFxuICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgcGFnZTogb3B0aW9ucy5wYWdlLFxuICAgICAgICAgICAgcGVyX3BhZ2U6IG9wdGlvbnMucGVyUGFnZSxcbiAgICAgICAgICB9XG4gICAgICAgIH0pLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgaWYgKGlzU3VjY2VzcyhyZXNwb25zZSkpIHtcbiAgICAgICAgICAgIHJlc29sdmUobmV3IElucHV0cyh0aGlzLl9jb25maWcsIHJlc3BvbnNlLmRhdGEuaW5wdXRzKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCByZWplY3QpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhbiBpbnB1dCBvciBtdWx0aXBsZSBpbnB1dHNcbiAgICogQHBhcmFtIHtvYmplY3R8b2JqZWN0W119ICAgICAgICBpbnB1dHMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENhbiBiZSBhIHNpbmdsZSBtZWRpYSBvYmplY3Qgb3IgYW4gYXJyYXkgb2YgbWVkaWEgb2JqZWN0cyAobWF4IG9mIDEyOCBpbnB1dHMvY2FsbDsgcGFzc2luZyA+IDEyOCB3aWxsIHRocm93IGFuIGV4Y2VwdGlvbilcbiAgICogICBAcGFyYW0ge29iamVjdHxzdHJpbmd9ICAgICAgICAgIGlucHV0c1tdLmlucHV0ICAgICAgICAgICAgICAgICAgICAgICAgSWYgc3RyaW5nLCBpcyBnaXZlbiwgdGhpcyBpcyBhc3N1bWVkIHRvIGJlIGFuIGltYWdlIHVybFxuICAgKiAgICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICAgICAgICBpbnB1dHNbXS5pbnB1dC4odXJsfGJhc2U2NCkgICAgICAgICAgIENhbiBiZSBhIHB1YmxpY2x5IGFjY2Vzc2libHkgdXJsIG9yIGJhc2U2NCBzdHJpbmcgcmVwcmVzZW50aW5nIGltYWdlIGJ5dGVzIChyZXF1aXJlZClcbiAgICogICAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICAgICAgaW5wdXRzW10uaW5wdXQuaWQgICAgICAgICAgICAgICAgICAgICBJRCBvZiBpbnB1dCAob3B0aW9uYWwpXG4gICAqICAgICBAcGFyYW0ge251bWJlcltdfSAgICAgICAgICAgICAgIGlucHV0c1tdLmlucHV0LmNyb3AgICAgICAgICAgICAgICAgICAgQW4gYXJyYXkgY29udGFpbmluZyB0aGUgcGVyY2VudCB0byBiZSBjcm9wcGVkIGZyb20gdG9wLCBsZWZ0LCBib3R0b20gYW5kIHJpZ2h0IChvcHRpb25hbClcbiAgICogICAgIEBwYXJhbSB7b2JqZWN0W119ICAgICAgICAgICAgICAgaW5wdXRzW10uaW5wdXQubWV0YWRhdGEgICAgICAgICAgICAgICBPYmplY3Qgd2l0aCBrZXkgYW5kIHZhbHVlcyBwYWlyICh2YWx1ZSBjYW4gYmUgc3RyaW5nLCBhcnJheSBvciBvdGhlciBvYmplY3RzKSB0byBhdHRhY2ggdG8gdGhlIGlucHV0IChvcHRpb25hbClcbiAgICogICAgIEBwYXJhbSB7b2JqZWN0fSAgICAgICAgICAgICAgICAgaW5wdXRzW10uaW5wdXQuZ2VvICAgICAgICAgICAgICAgICAgICBPYmplY3Qgd2l0aCBsYXRpdHVkZSBhbmQgbG9uZ2l0dWRlIGNvb3JkaW5hdGVzIHRvIGFzc29jaWF0ZSB3aXRoIGFuIGlucHV0LiBDYW4gYmUgdXNlZCBpbiBzZWFyY2ggcXVlcnkgYXMgdGhlIHByb3hpbWl0eSBvZiBhbiBpbnB1dCB0byBhIHJlZmVyZW5jZSBwb2ludCAob3B0aW9uYWwpXG4gICAqICAgICAgIEBwYXJhbSB7bnVtYmVyfSAgICAgICAgICAgICAgICAgaW5wdXRzW10uaW5wdXQuZ2VvLmxhdGl0dWRlICAgICAgICAgICArLy0gbGF0aXR1ZGUgdmFsIG9mIGdlb2RhdGFcbiAgICogICAgICAgQHBhcmFtIHtudW1iZXJ9ICAgICAgICAgICAgICAgICBpbnB1dHNbXS5pbnB1dC5nZW8ubG9uZ2l0dWRlICAgICAgICAgICsvLSBsb25naXR1ZGUgdmFsIG9mIGdlb2RhdGFcbiAgICogICAgIEBwYXJhbSB7b2JqZWN0W119ICAgICAgICAgICAgICAgaW5wdXRzW10uaW5wdXQuY29uY2VwdHMgICAgICAgICAgICAgICBBbiBhcnJheSBvZiBjb25jZXB0cyB0byBhdHRhY2ggdG8gbWVkaWEgb2JqZWN0IChvcHRpb25hbClcbiAgICogICAgICAgQHBhcmFtIHtvYmplY3R8c3RyaW5nfSAgICAgICAgICBpbnB1dHNbXS5pbnB1dC5jb25jZXB0c1tdLmNvbmNlcHQgICAgIElmIHN0cmluZywgaXMgZ2l2ZW4sIHRoaXMgaXMgYXNzdW1lZCB0byBiZSBjb25jZXB0IGlkIHdpdGggdmFsdWUgZXF1YWxzIHRydWVcbiAgICogICAgICAgICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICAgIGlucHV0c1tdLmlucHV0LmNvbmNlcHRzW10uY29uY2VwdC5pZCAgICAgICAgICBUaGUgY29uY2VwdCBpZCAocmVxdWlyZWQpXG4gICAqICAgICAgICAgQHBhcmFtIHtib29sZWFufSAgICAgICAgICAgICAgICBpbnB1dHNbXS5pbnB1dC5jb25jZXB0c1tdLmNvbmNlcHQudmFsdWUgICAgICAgV2hldGhlciBvciBub3QgdGhlIGlucHV0IGlzIGEgcG9zaXRpdmUgKHRydWUpIG9yIG5lZ2F0aXZlIChmYWxzZSkgZXhhbXBsZSBvZiB0aGUgY29uY2VwdCAoZGVmYXVsdDogdHJ1ZSlcbiAgICogQHJldHVybiB7UHJvbWlzZShJbnB1dHMsIGVycm9yKX0gQSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdpdGggYW4gaW5zdGFuY2Ugb2YgSW5wdXRzIG9yIHJlamVjdGVkIHdpdGggYW4gZXJyb3JcbiAgICovXG4gIGNyZWF0ZShpbnB1dHMpIHtcbiAgICBpZiAoY2hlY2tUeXBlKC8oU3RyaW5nfE9iamVjdCkvLCBpbnB1dHMpKSB7XG4gICAgICBpbnB1dHMgPSBbaW5wdXRzXTtcbiAgICB9XG4gICAgbGV0IHVybCA9IGAke3RoaXMuX2NvbmZpZy5iYXNlUGF0aH0ke0lOUFVUU19QQVRIfWA7XG4gICAgaWYgKGlucHV0cy5sZW5ndGggPiBNQVhfQkFUQ0hfU0laRSkge1xuICAgICAgdGhyb3cgRVJST1JTLk1BWF9JTlBVVFM7XG4gICAgfVxuICAgIHJldHVybiB3cmFwVG9rZW4odGhpcy5fY29uZmlnLCAoaGVhZGVycykgPT4ge1xuICAgICAgbGV0IGRhdGEgPSB7XG4gICAgICAgIGlucHV0czogaW5wdXRzLm1hcChmb3JtYXRJbnB1dClcbiAgICAgIH07XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBheGlvcy5wb3N0KHVybCwgZGF0YSwge2hlYWRlcnN9KVxuICAgICAgICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGlzU3VjY2VzcyhyZXNwb25zZSkpIHtcbiAgICAgICAgICAgICAgcmVzb2x2ZShuZXcgSW5wdXRzKHRoaXMuX2NvbmZpZywgcmVzcG9uc2UuZGF0YS5pbnB1dHMpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBpbnB1dCBieSBpZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gICAgaWQgIFRoZSBpbnB1dCBpZFxuICAgKiBAcmV0dXJuIHtQcm9taXNlKElucHV0LCBlcnJvcil9IEEgUHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aXRoIGFuIGluc3RhbmNlIG9mIElucHV0IG9yIHJlamVjdGVkIHdpdGggYW4gZXJyb3JcbiAgICovXG4gIGdldChpZCkge1xuICAgIGxldCB1cmwgPSBgJHt0aGlzLl9jb25maWcuYmFzZVBhdGh9JHtyZXBsYWNlVmFycyhJTlBVVF9QQVRILCBbaWRdKX1gO1xuICAgIHJldHVybiB3cmFwVG9rZW4odGhpcy5fY29uZmlnLCAoaGVhZGVycykgPT4ge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgYXhpb3MuZ2V0KHVybCwge2hlYWRlcnN9KS50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgIGlmIChpc1N1Y2Nlc3MocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICByZXNvbHZlKG5ldyBJbnB1dCh0aGlzLl9jb25maWcsIHJlc3BvbnNlLmRhdGEuaW5wdXQpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KHJlc3BvbnNlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIHJlamVjdCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGUgYW4gaW5wdXQgb3IgYSBsaXN0IG9mIGlucHV0cyBieSBpZCBvciBhbGwgaW5wdXRzIGlmIG5vIGlkIGlzIHBhc3NlZFxuICAgKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gICAgaWQgICAgICAgICAgIFRoZSBpZCBvZiBpbnB1dCB0byBkZWxldGUgKG9wdGlvbmFsKVxuICAgKiBAcmV0dXJuIHtQcm9taXNlKHJlc3BvbnNlLCBlcnJvcil9IEEgUHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aXRoIHRoZSBBUEkgcmVzcG9uc2Ugb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgZGVsZXRlKGlkID0gbnVsbCkge1xuICAgIGxldCB2YWw7XG4gICAgLy8gZGVsZXRlIGFuIGlucHV0XG4gICAgaWYgKGNoZWNrVHlwZSgvU3RyaW5nLywgaWQpKSB7XG4gICAgICBsZXQgdXJsID0gYCR7dGhpcy5fY29uZmlnLmJhc2VQYXRofSR7cmVwbGFjZVZhcnMoSU5QVVRfUEFUSCwgW2lkXSl9YDtcbiAgICAgIHZhbCA9IHdyYXBUb2tlbih0aGlzLl9jb25maWcsIChoZWFkZXJzKSA9PiB7XG4gICAgICAgIHJldHVybiBheGlvcy5kZWxldGUodXJsLCB7aGVhZGVyc30pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbCA9IHRoaXMuX2RlbGV0ZUlucHV0cyhpZCk7XG4gICAgfVxuICAgIHJldHVybiB2YWw7XG4gIH1cblxuICBfZGVsZXRlSW5wdXRzKGlkID0gbnVsbCkge1xuICAgIGxldCB1cmwgPSBgJHt0aGlzLl9jb25maWcuYmFzZVBhdGh9JHtJTlBVVFNfUEFUSH1gO1xuICAgIHJldHVybiB3cmFwVG9rZW4odGhpcy5fY29uZmlnLCAoaGVhZGVycykgPT4ge1xuICAgICAgbGV0IGRhdGEgPSBpZCA9PT0gbnVsbCA/IHtkZWxldGVfYWxsOiB0cnVlfSA6XG4gICAgICAgIHtpZHM6IGlkfTtcbiAgICAgIHJldHVybiBheGlvcyh7XG4gICAgICAgIHVybCxcbiAgICAgICAgbWV0aG9kOiAnZGVsZXRlJyxcbiAgICAgICAgaGVhZGVycyxcbiAgICAgICAgZGF0YVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTWVyZ2UgY29uY2VwdHMgdG8gaW5wdXRzIGluIGJ1bGtcbiAgICogQHBhcmFtIHtvYmplY3RbXX0gICAgICAgICBpbnB1dHMgICAgTGlzdCBvZiBjb25jZXB0cyB0byB1cGRhdGUgKG1heCBvZiAxMjggaW5wdXRzL2NhbGw7IHBhc3NpbmcgPiAxMjggd2lsbCB0aHJvdyBhbiBleGNlcHRpb24pXG4gICAqICAgQHBhcmFtIHtvYmplY3R9ICAgICAgICAgICBpbnB1dHNbXS5pbnB1dFxuICAgKiAgICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICBpbnB1dHNbXS5pbnB1dC5pZCAgICAgICAgVGhlIGlkIG9mIHRoZSBpbnB1dCB0byB1cGRhdGVcbiAgICogICAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgaW5wdXRzW10uaW5wdXQuY29uY2VwdHMgIE9iamVjdCB3aXRoIGtleXMgZXhwbGFpbmVkIGJlbG93OlxuICAgKiAgICAgICBAcGFyYW0ge29iamVjdH0gICAgICAgICAgIGlucHV0c1tdLmlucHV0LmNvbmNlcHRzW10uY29uY2VwdFxuICAgKiAgICAgICAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgaW5wdXRzW10uaW5wdXQuY29uY2VwdHNbXS5jb25jZXB0LmlkICAgICAgICBUaGUgY29uY2VwdCBpZCAocmVxdWlyZWQpXG4gICAqICAgICAgICAgQHBhcmFtIHtib29sZWFufSAgICAgICAgICBpbnB1dHNbXS5pbnB1dC5jb25jZXB0c1tdLmNvbmNlcHQudmFsdWUgICAgIFdoZXRoZXIgb3Igbm90IHRoZSBpbnB1dCBpcyBhIHBvc2l0aXZlICh0cnVlKSBvciBuZWdhdGl2ZSAoZmFsc2UpIGV4YW1wbGUgb2YgdGhlIGNvbmNlcHQgKGRlZmF1bHQ6IHRydWUpXG4gICAqIEByZXR1cm4ge1Byb21pc2UoSW5wdXRzLCBlcnJvcil9IEEgUHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aXRoIGFuIGluc3RhbmNlIG9mIElucHV0cyBvciByZWplY3RlZCB3aXRoIGFuIGVycm9yXG4gICAqL1xuICBtZXJnZUNvbmNlcHRzKGlucHV0cykge1xuICAgIGlucHV0cy5hY3Rpb24gPSAnbWVyZ2UnO1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZShpbnB1dHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZSBjb25jZXB0cyB0byBpbnB1dHMgaW4gYnVsa1xuICAgKiBAcGFyYW0ge29iamVjdFtdfSAgICAgICAgIGlucHV0cyAgICBMaXN0IG9mIGNvbmNlcHRzIHRvIHVwZGF0ZSAobWF4IG9mIDEyOCBpbnB1dHMvY2FsbDsgcGFzc2luZyA+IDEyOCB3aWxsIHRocm93IGFuIGV4Y2VwdGlvbilcbiAgICogICBAcGFyYW0ge29iamVjdH0gICAgICAgICAgIGlucHV0c1tdLmlucHV0XG4gICAqICAgICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgIGlucHV0c1tdLmlucHV0LmlkICAgICAgICAgICAgICAgICAgICAgICAgICAgVGhlIGlkIG9mIHRoZSBpbnB1dCB0byB1cGRhdGVcbiAgICogICAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgaW5wdXRzW10uaW5wdXQuY29uY2VwdHMgICAgICAgICAgICAgICAgICAgICBPYmplY3Qgd2l0aCBrZXlzIGV4cGxhaW5lZCBiZWxvdzpcbiAgICogICAgICAgQHBhcmFtIHtvYmplY3R9ICAgICAgICAgICBpbnB1dHNbXS5pbnB1dC5jb25jZXB0c1tdLmNvbmNlcHRcbiAgICogICAgICAgICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgIGlucHV0c1tdLmlucHV0LmNvbmNlcHRzW10uY29uY2VwdC5pZCAgICAgICAgVGhlIGNvbmNlcHQgaWQgKHJlcXVpcmVkKVxuICAgKiAgICAgICAgIEBwYXJhbSB7Ym9vbGVhbn0gICAgICAgICAgaW5wdXRzW10uaW5wdXQuY29uY2VwdHNbXS5jb25jZXB0LnZhbHVlICAgICBXaGV0aGVyIG9yIG5vdCB0aGUgaW5wdXQgaXMgYSBwb3NpdGl2ZSAodHJ1ZSkgb3IgbmVnYXRpdmUgKGZhbHNlKSBleGFtcGxlIG9mIHRoZSBjb25jZXB0IChkZWZhdWx0OiB0cnVlKVxuICAgKiBAcmV0dXJuIHtQcm9taXNlKElucHV0cywgZXJyb3IpfSBBIFByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2l0aCBhbiBpbnN0YW5jZSBvZiBJbnB1dHMgb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgZGVsZXRlQ29uY2VwdHMoaW5wdXRzKSB7XG4gICAgaW5wdXRzLmFjdGlvbiA9ICdyZW1vdmUnO1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZShpbnB1dHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIE92ZXJ3cml0ZSBpbnB1dHMgaW4gYnVsa1xuICAgKiBAcGFyYW0ge29iamVjdFtdfSAgICAgICAgIGlucHV0cyAgICBMaXN0IG9mIGNvbmNlcHRzIHRvIHVwZGF0ZSAobWF4IG9mIDEyOCBpbnB1dHMvY2FsbDsgcGFzc2luZyA+IDEyOCB3aWxsIHRocm93IGFuIGV4Y2VwdGlvbilcbiAgICogICBAcGFyYW0ge29iamVjdH0gICAgICAgICAgIGlucHV0c1tdLmlucHV0XG4gICAqICAgICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgIGlucHV0c1tdLmlucHV0LmlkICAgICAgICAgICAgICAgICAgICAgICAgICAgVGhlIGlkIG9mIHRoZSBpbnB1dCB0byB1cGRhdGVcbiAgICogICAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgaW5wdXRzW10uaW5wdXQuY29uY2VwdHMgICAgICAgICAgICAgICAgICAgICBPYmplY3Qgd2l0aCBrZXlzIGV4cGxhaW5lZCBiZWxvdzpcbiAgICogICAgICAgQHBhcmFtIHtvYmplY3R9ICAgICAgICAgICBpbnB1dHNbXS5pbnB1dC5jb25jZXB0c1tdLmNvbmNlcHRcbiAgICogICAgICAgICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgIGlucHV0c1tdLmlucHV0LmNvbmNlcHRzW10uY29uY2VwdC5pZCAgICAgICAgVGhlIGNvbmNlcHQgaWQgKHJlcXVpcmVkKVxuICAgKiAgICAgICAgIEBwYXJhbSB7Ym9vbGVhbn0gICAgICAgICAgaW5wdXRzW10uaW5wdXQuY29uY2VwdHNbXS5jb25jZXB0LnZhbHVlICAgICBXaGV0aGVyIG9yIG5vdCB0aGUgaW5wdXQgaXMgYSBwb3NpdGl2ZSAodHJ1ZSkgb3IgbmVnYXRpdmUgKGZhbHNlKSBleGFtcGxlIG9mIHRoZSBjb25jZXB0IChkZWZhdWx0OiB0cnVlKVxuICAgKiBAcmV0dXJuIHtQcm9taXNlKElucHV0cywgZXJyb3IpfSBBIFByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2l0aCBhbiBpbnN0YW5jZSBvZiBJbnB1dHMgb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgb3ZlcndyaXRlQ29uY2VwdHMoaW5wdXRzKSB7XG4gICAgaW5wdXRzLmFjdGlvbiA9ICdvdmVyd3JpdGUnO1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZShpbnB1dHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7b2JqZWN0W119ICAgICAgICAgaW5wdXRzICAgIExpc3Qgb2YgY29uY2VwdHMgdG8gdXBkYXRlIChtYXggb2YgMTI4IGlucHV0cy9jYWxsOyBwYXNzaW5nID4gMTI4IHdpbGwgdGhyb3cgYW4gZXhjZXB0aW9uKVxuICAgKiAgIEBwYXJhbSB7b2JqZWN0fSAgICAgICAgICAgaW5wdXRzW10uaW5wdXRcbiAgICogICAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgaW5wdXRzW10uaW5wdXQuaWQgICAgICAgICAgICAgICAgICAgICAgICAgICBUaGUgaWQgb2YgdGhlIGlucHV0IHRvIHVwZGF0ZVxuICAgKiAgICAgQHBhcmFtIHtvYmplY3R9ICAgICAgICAgICBpbnB1dHNbXS5pbnB1dC5tZXRhZGF0YSAgICAgICAgICAgICAgICAgICAgIE9iamVjdCB3aXRoIGtleSB2YWx1ZXMgdG8gYXR0YWNoIHRvIHRoZSBpbnB1dCAob3B0aW9uYWwpXG4gICAqICAgICBAcGFyYW0ge29iamVjdH0gICAgICAgICAgIGlucHV0c1tdLmlucHV0LmdlbyAgICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0IHdpdGggbGF0aXR1ZGUgYW5kIGxvbmdpdHVkZSBjb29yZGluYXRlcyB0byBhc3NvY2lhdGUgd2l0aCBhbiBpbnB1dC4gQ2FuIGJlIHVzZWQgaW4gc2VhcmNoIHF1ZXJ5IGFzIHRoZSBwcm94aW1pdHkgb2YgYW4gaW5wdXQgdG8gYSByZWZlcmVuY2UgcG9pbnQgKG9wdGlvbmFsKVxuICAgKiAgICAgICBAcGFyYW0ge251bWJlcn0gICAgICAgICAgIGlucHV0c1tdLmlucHV0Lmdlby5sYXRpdHVkZSAgICAgICAgICAgICAgICAgKy8tIGxhdGl0dWRlIHZhbCBvZiBnZW9kYXRhXG4gICAqICAgICAgIEBwYXJhbSB7bnVtYmVyfSAgICAgICAgICAgaW5wdXRzW10uaW5wdXQuZ2VvLmxvbmdpdHVkZSAgICAgICAgICAgICAgICArLy0gbG9uZ2l0dWRlIHZhbCBvZiBnZW9kYXRhXG4gICAqICAgICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgIGlucHV0c1tdLmlucHV0LmNvbmNlcHRzICAgICAgICAgICAgICAgICAgICAgT2JqZWN0IHdpdGgga2V5cyBleHBsYWluZWQgYmVsb3cgKG9wdGlvbmFsKTpcbiAgICogICAgICAgQHBhcmFtIHtvYmplY3R9ICAgICAgICAgICBpbnB1dHNbXS5pbnB1dC5jb25jZXB0c1tdLmNvbmNlcHRcbiAgICogICAgICAgICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgIGlucHV0c1tdLmlucHV0LmNvbmNlcHRzW10uY29uY2VwdC5pZCAgICAgICAgVGhlIGNvbmNlcHQgaWQgKHJlcXVpcmVkKVxuICAgKiAgICAgICAgIEBwYXJhbSB7Ym9vbGVhbn0gICAgICAgICAgaW5wdXRzW10uaW5wdXQuY29uY2VwdHNbXS5jb25jZXB0LnZhbHVlICAgICBXaGV0aGVyIG9yIG5vdCB0aGUgaW5wdXQgaXMgYSBwb3NpdGl2ZSAodHJ1ZSkgb3IgbmVnYXRpdmUgKGZhbHNlKSBleGFtcGxlIG9mIHRoZSBjb25jZXB0IChkZWZhdWx0OiB0cnVlKVxuICAgKiBAcmV0dXJuIHtQcm9taXNlKElucHV0cywgZXJyb3IpfSBBIFByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2l0aCBhbiBpbnN0YW5jZSBvZiBJbnB1dHMgb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgdXBkYXRlKGlucHV0cykge1xuICAgIGxldCB1cmwgPSBgJHt0aGlzLl9jb25maWcuYmFzZVBhdGh9JHtJTlBVVFNfUEFUSH1gO1xuICAgIGxldCBpbnB1dHNMaXN0ID0gQXJyYXkuaXNBcnJheShpbnB1dHMpID8gaW5wdXRzIDogW2lucHV0c107XG4gICAgaWYgKGlucHV0c0xpc3QubGVuZ3RoID4gTUFYX0JBVENIX1NJWkUpIHtcbiAgICAgIHRocm93IEVSUk9SUy5NQVhfSU5QVVRTO1xuICAgIH1cbiAgICBsZXQgZGF0YSA9IHtcbiAgICAgIGFjdGlvbjogaW5wdXRzLmFjdGlvbixcbiAgICAgIGlucHV0czogaW5wdXRzTGlzdC5tYXAoKGlucHV0KSA9PiBmb3JtYXRJbnB1dChpbnB1dCwgZmFsc2UpKVxuICAgIH07XG4gICAgcmV0dXJuIHdyYXBUb2tlbih0aGlzLl9jb25maWcsIChoZWFkZXJzKSA9PiB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBheGlvcy5wYXRjaCh1cmwsIGRhdGEsIHtoZWFkZXJzfSlcbiAgICAgICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChpc1N1Y2Nlc3MocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICAgIHJlc29sdmUobmV3IElucHV0cyh0aGlzLl9jb25maWcsIHJlc3BvbnNlLmRhdGEuaW5wdXRzKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggZm9yIGlucHV0cyBvciBvdXRwdXRzIGJhc2VkIG9uIGNvbmNlcHRzIG9yIGltYWdlc1xuICAgKiAgIEBwYXJhbSB7b2JqZWN0W119ICAgICAgICAgICAgICAgcXVlcmllcyAgICAgICAgICBMaXN0IG9mIGFsbCBwcmVkaWN0aW9ucyB0byBtYXRjaCB3aXRoXG4gICAqICAgICBAcGFyYW0ge29iamVjdH0gICAgICAgICAgICAgICAgIHF1ZXJpZXNbXS5jb25jZXB0ICAgICAgICAgICAgQW4gb2JqZWN0IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAgKiAgICAgICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICAgIHF1ZXJpZXNbXS5jb25jZXB0LmlkICAgICAgICAgIFRoZSBjb25jZXB0IGlkXG4gICAqICAgICAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICAgICAgcXVlcmllc1tdLmNvbmNlcHQudHlwZSAgICAgICAgU2VhcmNoIG92ZXIgJ2lucHV0JyB0byBnZXQgaW5wdXQgbWF0Y2hlcyB0byBjcml0ZXJpYSBvciAnb3V0cHV0JyB0byBnZXQgaW5wdXRzIHRoYXQgYXJlIHZpc3VhbGx5IHNpbWlsYXIgdG8gdGhlIGNyaXRlcmlhIChkZWZhdWx0OiAnb3V0cHV0JylcbiAgICogICAgICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICAgICAgICBxdWVyaWVzW10uY29uY2VwdC5uYW1lICAgICAgICBUaGUgY29uY2VwdCBuYW1lXG4gICAqICAgICAgIEBwYXJhbSB7Ym9vbGVhbn0gICAgICAgICAgICAgICAgcXVlcmllc1tdLmNvbmNlcHQudmFsdWUgICAgICAgSW5kaWNhdGVzIHdoZXRoZXIgb3Igbm90IHRoZSB0ZXJtIHNob3VsZCBtYXRjaCB3aXRoIHRoZSBwcmVkaWN0aW9uIHJldHVybmVkIChkZWZhdWx0OiB0cnVlKVxuICAgKiAgICAgQHBhcmFtIHtvYmplY3R9ICAgICAgICAgICAgICAgICBxdWVyaWVzW10uaW5wdXQgICAgICAgICAgICAgIEFuIGltYWdlIG9iamVjdCB0aGF0IGNvbnRhaW5zIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgICogICAgICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICAgICAgICBxdWVyaWVzW10uaW5wdXQuaWQgICAgICAgICAgICBUaGUgaW5wdXQgaWRcbiAgICogICAgICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICAgICAgICBxdWVyaWVzW10uaW5wdXQudHlwZSAgICAgICAgICBTZWFyY2ggb3ZlciAnaW5wdXQnIHRvIGdldCBpbnB1dCBtYXRjaGVzIHRvIGNyaXRlcmlhIG9yICdvdXRwdXQnIHRvIGdldCBpbnB1dHMgdGhhdCBhcmUgdmlzdWFsbHkgc2ltaWxhciB0byB0aGUgY3JpdGVyaWEgKGRlZmF1bHQ6ICdvdXRwdXQnKVxuICAgKiAgICAgICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICAgIHF1ZXJpZXNbXS5pbnB1dC4oYmFzZTY0fHVybCkgIENhbiBiZSBhIHB1YmxpY2x5IGFjY2Vzc2libHkgdXJsIG9yIGJhc2U2NCBzdHJpbmcgcmVwcmVzZW50aW5nIGltYWdlIGJ5dGVzIChyZXF1aXJlZClcbiAgICogICAgICAgQHBhcmFtIHtudW1iZXJbXX0gICAgICAgICAgICAgICBxdWVyaWVzW10uaW5wdXQuY3JvcCAgICAgICAgICBBbiBhcnJheSBjb250YWluaW5nIHRoZSBwZXJjZW50IHRvIGJlIGNyb3BwZWQgZnJvbSB0b3AsIGxlZnQsIGJvdHRvbSBhbmQgcmlnaHQgKG9wdGlvbmFsKVxuICAgKiAgICAgICBAcGFyYW0ge29iamVjdH0gICAgICAgICAgICAgICAgIHF1ZXJpZXNbXS5pbnB1dC5tZXRhZGF0YSAgICAgIEFuIG9iamVjdCB3aXRoIGtleSBhbmQgdmFsdWUgc3BlY2lmaWVkIGJ5IHVzZXIgdG8gcmVmaW5lIHNlYXJjaCB3aXRoIChvcHRpb25hbClcbiAgICogQHBhcmFtIHtPYmplY3R9ICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgICAgICAgT2JqZWN0IHdpdGgga2V5cyBleHBsYWluZWQgYmVsb3c6IChvcHRpb25hbClcbiAgICogICAgQHBhcmFtIHtOdW1iZXJ9ICAgICAgICAgICAgICAgICAgb3B0aW9ucy5wYWdlICAgICAgICAgIFRoZSBwYWdlIG51bWJlciAob3B0aW9uYWwsIGRlZmF1bHQ6IDEpXG4gICAqICAgIEBwYXJhbSB7TnVtYmVyfSAgICAgICAgICAgICAgICAgIG9wdGlvbnMucGVyUGFnZSAgICAgICBOdW1iZXIgb2YgaW1hZ2VzIHRvIHJldHVybiBwZXIgcGFnZSAob3B0aW9uYWwsIGRlZmF1bHQ6IDIwKVxuICAgKiBAcmV0dXJuIHtQcm9taXNlKHJlc3BvbnNlLCBlcnJvcil9IEEgUHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aXRoIHRoZSBBUEkgcmVzcG9uc2Ugb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgc2VhcmNoKHF1ZXJpZXMgPSBbXSwgb3B0aW9ucyA9IHtwYWdlOiAxLCBwZXJQYWdlOiAyMH0pIHtcbiAgICBsZXQgZm9ybWF0dGVkQW5kcyA9IFtdO1xuICAgIGxldCB1cmwgPSBgJHt0aGlzLl9jb25maWcuYmFzZVBhdGh9JHtTRUFSQ0hfUEFUSH1gO1xuICAgIGxldCBkYXRhID0ge1xuICAgICAgcXVlcnk6IHtcbiAgICAgICAgYW5kczogW11cbiAgICAgIH0sXG4gICAgICBwYWdpbmF0aW9uOiB7XG4gICAgICAgIHBhZ2U6IG9wdGlvbnMucGFnZSxcbiAgICAgICAgcGVyX3BhZ2U6IG9wdGlvbnMucGVyUGFnZVxuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocXVlcmllcykpIHtcbiAgICAgIHF1ZXJpZXMgPSBbcXVlcmllc107XG4gICAgfVxuICAgIGlmIChxdWVyaWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIHF1ZXJpZXMuZm9yRWFjaChmdW5jdGlvbihxdWVyeSkge1xuICAgICAgICBpZiAocXVlcnkuaW5wdXQpIHtcbiAgICAgICAgICBmb3JtYXR0ZWRBbmRzID0gZm9ybWF0dGVkQW5kcy5jb25jYXQoZm9ybWF0SW1hZ2VzU2VhcmNoKHF1ZXJ5LmlucHV0KSk7XG4gICAgICAgIH0gZWxzZSBpZiAocXVlcnkuY29uY2VwdCkge1xuICAgICAgICAgIGZvcm1hdHRlZEFuZHMgPSBmb3JtYXR0ZWRBbmRzLmNvbmNhdChmb3JtYXRDb25jZXB0c1NlYXJjaChxdWVyeS5jb25jZXB0KSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgZGF0YS5xdWVyeS5hbmRzID0gZm9ybWF0dGVkQW5kcztcbiAgICB9XG4gICAgcmV0dXJuIHdyYXBUb2tlbih0aGlzLl9jb25maWcsIChoZWFkZXJzKSA9PiB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBheGlvcy5wb3N0KHVybCwgZGF0YSwge2hlYWRlcnN9KVxuICAgICAgICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGlzU3VjY2VzcyhyZXNwb25zZSkpIHtcbiAgICAgICAgICAgICAgbGV0IGRhdGEgPSBjbG9uZShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgZGF0YS5yYXdEYXRhID0gY2xvbmUocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgaW5wdXRzIHN0YXR1cyAobnVtYmVyIG9mIHVwbG9hZGVkLCBpbiBwcm9jZXNzIG9yIGZhaWxlZCBpbnB1dHMpXG4gICAqIEByZXR1cm4ge1Byb21pc2UocmVzcG9uc2UsIGVycm9yKX0gQSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdpdGggdGhlIEFQSSByZXNwb25zZSBvciByZWplY3RlZCB3aXRoIGFuIGVycm9yXG4gICAqL1xuICBnZXRTdGF0dXMoKSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuX2NvbmZpZy5iYXNlUGF0aH0ke0lOUFVUU19TVEFUVVNfUEFUSH1gO1xuICAgIHJldHVybiB3cmFwVG9rZW4odGhpcy5fY29uZmlnLCAoaGVhZGVycykgPT4ge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgYXhpb3MuZ2V0KHVybCwge2hlYWRlcnN9KVxuICAgICAgICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGlzU3VjY2VzcyhyZXNwb25zZSkpIHtcbiAgICAgICAgICAgICAgbGV0IGRhdGEgPSBjbG9uZShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgZGF0YS5yYXdEYXRhID0gY2xvbmUocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuO1xuXG5tb2R1bGUuZXhwb3J0cyA9IElucHV0cztcbiJdfQ==
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/Inputs.js","/")
},{"./Input":40,"./constants":46,"./helpers":48,"./utils":49,"axios":4,"buffer":23,"pBGvAp":27}],42:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var axios = require('axios');
var ModelVersion = require('./ModelVersion');

var _require = require('./helpers'),
    isSuccess = _require.isSuccess,
    checkType = _require.checkType,
    clone = _require.clone;

var _require2 = require('./constants'),
    API = _require2.API,
    SYNC_TIMEOUT = _require2.SYNC_TIMEOUT,
    replaceVars = _require2.replaceVars,
    STATUS = _require2.STATUS,
    POLLTIME = _require2.POLLTIME;

var MODEL_QUEUED_FOR_TRAINING = STATUS.MODEL_QUEUED_FOR_TRAINING,
    MODEL_TRAINING = STATUS.MODEL_TRAINING;

var _require3 = require('./utils'),
    wrapToken = _require3.wrapToken,
    formatMediaPredict = _require3.formatMediaPredict,
    formatModel = _require3.formatModel,
    formatObjectForSnakeCase = _require3.formatObjectForSnakeCase;

var MODEL_VERSIONS_PATH = API.MODEL_VERSIONS_PATH,
    MODEL_VERSION_PATH = API.MODEL_VERSION_PATH,
    MODELS_PATH = API.MODELS_PATH,
    MODEL_FEEDBACK_PATH = API.MODEL_FEEDBACK_PATH,
    MODEL_VERSION_FEEDBACK_PATH = API.MODEL_VERSION_FEEDBACK_PATH,
    PREDICT_PATH = API.PREDICT_PATH,
    VERSION_PREDICT_PATH = API.VERSION_PREDICT_PATH,
    MODEL_INPUTS_PATH = API.MODEL_INPUTS_PATH,
    MODEL_OUTPUT_PATH = API.MODEL_OUTPUT_PATH,
    MODEL_VERSION_INPUTS_PATH = API.MODEL_VERSION_INPUTS_PATH,
    MODEL_VERSION_METRICS_PATH = API.MODEL_VERSION_METRICS_PATH;

/**
 * class representing a model
 * @class
 */

var Model = function () {
  function Model(_config, data) {
    _classCallCheck(this, Model);

    this._config = _config;
    this.name = data.name;
    this.id = data.id;
    this.createdAt = data.created_at || data.createdAt;
    this.appId = data.app_id || data.appId;
    this.outputInfo = data.output_info || data.outputInfo;
    if (checkType(/(String)/, data.version)) {
      this.modelVersion = {};
      this.versionId = data.version;
    } else {
      if (data.model_version || data.modelVersion || data.version) {
        this.modelVersion = new ModelVersion(this._config, data.model_version || data.modelVersion || data.version);
      }
      this.versionId = (this.modelVersion || {}).id;
    }
    this.rawData = data;
  }

  /**
   * Merge concepts to a model
   * @param {object[]}      concepts    List of concept objects with id
   * @return {Promise(Model, error)} A Promise that is fulfilled with a Model instance or rejected with an error
   */


  _createClass(Model, [{
    key: 'mergeConcepts',
    value: function mergeConcepts() {
      var concepts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

      var conceptsArr = Array.isArray(concepts) ? concepts : [concepts];
      return this.update({ action: 'merge', concepts: conceptsArr });
    }

    /**
     * Remove concepts from a model
     * @param {object[]}      concepts    List of concept objects with id
     * @return {Promise(Model, error)} A Promise that is fulfilled with a Model instance or rejected with an error
     */

  }, {
    key: 'deleteConcepts',
    value: function deleteConcepts() {
      var concepts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

      var conceptsArr = Array.isArray(concepts) ? concepts : [concepts];
      return this.update({ action: 'remove', concepts: conceptsArr });
    }

    /**
     * Overwrite concepts in a model
     * @param {object[]}      concepts    List of concept objects with id
     * @return {Promise(Model, error)} A Promise that is fulfilled with a Model instance or rejected with an error
     */

  }, {
    key: 'overwriteConcepts',
    value: function overwriteConcepts() {
      var concepts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

      var conceptsArr = Array.isArray(concepts) ? concepts : [concepts];
      return this.update({ action: 'overwrite', concepts: conceptsArr });
    }

    /**
     * Start a model evaluation job
     * @return {Promise(ModelVersion, error)} A Promise that is fulfilled with a ModelVersion instance or rejected with an error
     */

  }, {
    key: 'runModelEval',
    value: function runModelEval() {
      var _this = this;

      var url = '' + this._config.basePath + replaceVars(MODEL_VERSION_METRICS_PATH, [this.id, this.versionId]);
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.post(url, {}, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new ModelVersion(_this._config, response.data.model_version));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }

    /**
     * Update a model's output config or concepts
     * @param {object}               model                                 An object with any of the following attrs:
     *   @param {string}               name                                  The new name of the model to update with
     *   @param {boolean}              conceptsMutuallyExclusive             Do you expect to see more than one of the concepts in this model in the SAME image? Set to false (default) if so. Otherwise, set to true.
     *   @param {boolean}              closedEnvironment                     Do you expect to run the trained model on images that do not contain ANY of the concepts in the model? Set to false (default) if so. Otherwise, set to true.
     *   @param {object[]}             concepts                              An array of concept objects or string
     *     @param {object|string}        concepts[].concept                    If string is given, this is interpreted as concept id. Otherwise, if object is given, client expects the following attributes
     *       @param {string}             concepts[].concept.id                   The id of the concept to attach to the model
     *   @param {object[]}             action                                The action to perform on the given concepts. Possible values are 'merge', 'remove', or 'overwrite'. Default: 'merge'
     * @return {Promise(Model, error)} A Promise that is fulfilled with a Model instance or rejected with an error
     */

  }, {
    key: 'update',
    value: function update(obj) {
      var _this2 = this;

      var url = '' + this._config.basePath + MODELS_PATH;
      var modelData = [obj];
      var data = { models: modelData.map(function (m) {
          return formatModel(Object.assign(m, { id: _this2.id }));
        }) };
      if (Array.isArray(obj.concepts)) {
        data['action'] = obj.action || 'merge';
      }

      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.patch(url, data, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new Model(_this2._config, response.data.models[0]));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }

    /**
     * Create a new model version
     * @param {boolean}       sync     If true, this returns after model has completely trained. If false, this immediately returns default api response.
     * @return {Promise(Model, error)} A Promise that is fulfilled with a Model instance or rejected with an error
     */

  }, {
    key: 'train',
    value: function train(sync) {
      var _this3 = this;

      var url = '' + this._config.basePath + replaceVars(MODEL_VERSIONS_PATH, [this.id]);
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.post(url, null, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              if (sync) {
                var timeStart = Date.now();
                _this3._pollTrain.bind(_this3)(timeStart, resolve, reject);
              } else {
                resolve(new Model(_this3._config, response.data.model));
              }
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }
  }, {
    key: '_pollTrain',
    value: function _pollTrain(timeStart, resolve, reject) {
      var _this4 = this;

      clearTimeout(this.pollTimeout);
      if (Date.now() - timeStart >= SYNC_TIMEOUT) {
        return reject({
          status: 'Error',
          message: 'Sync call timed out'
        });
      }
      this.getOutputInfo().then(function (model) {
        var modelStatusCode = model.modelVersion.status.code.toString();
        if (modelStatusCode === MODEL_QUEUED_FOR_TRAINING || modelStatusCode === MODEL_TRAINING) {
          _this4.pollTimeout = setTimeout(function () {
            return _this4._pollTrain(timeStart, resolve, reject);
          }, POLLTIME);
        } else {
          resolve(model);
        }
      }, reject).catch(reject);
    }

    /**
     * Returns model ouputs according to inputs
     * @param {object[]|object|string}       inputs    An array of objects/object/string pointing to an image resource. A string can either be a url or base64 image bytes. Object keys explained below:
     *    @param {object}                      inputs[].image     Object with keys explained below:
     *       @param {string}                     inputs[].image.(url|base64)   Can be a publicly accessibly url or base64 string representing image bytes (required)
     *       @param {number[]}                   inputs[].image.crop           An array containing the percent to be cropped from top, left, bottom and right (optional)
     * @param {object|string} config An object with keys explained below. If a string is passed instead, it will be treated as the language (backwards compatibility)
     *   @param {string} config.language A string code representing the language to return results in (example: 'zh' for simplified Chinese, 'ru' for Russian, 'ja' for Japanese)
     *   @param {boolean} config.video indicates if the input should be processed as a video
     *   @param {object[]} config.selectConcepts An array of concepts to return. Each object in the array will have a form of {name: <CONCEPT_NAME>} or {id: CONCEPT_ID}
     *   @param {float} config.minValue The minimum confidence threshold that a result must meet. From 0.0 to 1.0
     *   @param {number} config.maxConcepts The maximum number of concepts to return
     * @param {boolean} isVideo  Deprecated: indicates if the input should be processed as a video (default false). Deprecated in favor of using config object
     * @return {Promise(response, error)} A Promise that is fulfilled with the API response or rejected with an error
     */

  }, {
    key: 'predict',
    value: function predict(inputs) {
      var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var isVideo = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      if (checkType(/String/, config)) {
        console.warn('passing the language as a string is deprecated, consider using the configuration object instead');
        config = {
          language: config
        };
      }

      if (isVideo) {
        console.warn('"isVideo" argument is deprecated, consider using the configuration object instead');
        config.video = isVideo;
      }
      var video = config.video || false;
      delete config.video;
      if (checkType(/(Object|String)/, inputs)) {
        inputs = [inputs];
      }
      var url = '' + this._config.basePath + (this.versionId ? replaceVars(VERSION_PREDICT_PATH, [this.id, this.versionId]) : replaceVars(PREDICT_PATH, [this.id]));
      return wrapToken(this._config, function (headers) {
        var params = { inputs: inputs.map(function (input) {
            return formatMediaPredict(input, video ? 'video' : 'image');
          }) };
        if (config && Object.getOwnPropertyNames(config).length > 0) {
          params['model'] = {
            output_info: {
              output_config: formatObjectForSnakeCase(config)
            }
          };
        }
        return new Promise(function (resolve, reject) {
          axios.post(url, params, { headers: headers }).then(function (response) {
            var data = clone(response.data);
            data.rawData = clone(response.data);
            resolve(data);
          }, reject);
        });
      });
    }

    /**
     * Returns a version of the model specified by its id
     * @param {string}     versionId   The model's id
     * @return {Promise(response, error)} A Promise that is fulfilled with the API response or rejected with an error
     */

  }, {
    key: 'getVersion',
    value: function getVersion(versionId) {
      var url = '' + this._config.basePath + replaceVars(MODEL_VERSION_PATH, [this.id, versionId]);
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.get(url, { headers: headers }).then(function (response) {
            var data = clone(response.data);
            data.rawData = clone(response.data);
            resolve(data);
          }, reject);
        });
      });
    }

    /**
     * Returns a list of versions of the model
     * @param {object}     options     Object with keys explained below: (optional)
     *   @param {number}     options.page        The page number (optional, default: 1)
     *   @param {number}     options.perPage     Number of images to return per page (optional, default: 20)
     * @return {Promise(response, error)} A Promise that is fulfilled with the API response or rejected with an error
     */

  }, {
    key: 'getVersions',
    value: function getVersions() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { page: 1, perPage: 20 };

      var url = '' + this._config.basePath + replaceVars(MODEL_VERSIONS_PATH, [this.id]);
      return wrapToken(this._config, function (headers) {
        var data = {
          headers: headers,
          params: { 'per_page': options.perPage, 'page': options.page }
        };
        return new Promise(function (resolve, reject) {
          axios.get(url, data).then(function (response) {
            var data = clone(response.data);
            data.rawData = clone(response.data);
            resolve(data);
          }, reject);
        });
      });
    }

    /**
     * Returns all the model's output info
     * @return {Promise(Model, error)} A Promise that is fulfilled with a Model instance or rejected with an error
     */

  }, {
    key: 'getOutputInfo',
    value: function getOutputInfo() {
      var _this5 = this;

      var url = '' + this._config.basePath + replaceVars(MODEL_OUTPUT_PATH, [this.id]);
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.get(url, { headers: headers }).then(function (response) {
            resolve(new Model(_this5._config, response.data.model));
          }, reject);
        });
      });
    }

    /**
     * Returns all the model's inputs
     * @param {object}     options     Object with keys explained below: (optional)
     *   @param {number}     options.page        The page number (optional, default: 1)
     *   @param {number}     options.perPage     Number of images to return per page (optional, default: 20)
     * @return {Promise(response, error)} A Promise that is fulfilled with the API response or rejected with an error
     */

  }, {
    key: 'getInputs',
    value: function getInputs() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { page: 1, perPage: 20 };

      var url = '' + this._config.basePath + (this.versionId ? replaceVars(MODEL_VERSION_INPUTS_PATH, [this.id, this.versionId]) : replaceVars(MODEL_INPUTS_PATH, [this.id]));
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.get(url, {
            params: { 'per_page': options.perPage, 'page': options.page },
            headers: headers
          }).then(function (response) {
            var data = clone(response.data);
            data.rawData = clone(response.data);
            resolve(data);
          }, reject);
        });
      });
    }

    /**
     *
     * @param {string} input A string pointing to an image resource. A string must be a url
     * @param {object} config A configuration object consisting of the following required keys
     *   @param {string} config.id The id of the feedback request
     *   @param {object} config.data The feedback data to be sent
     *   @param {object} config.info Meta data related to the feedback request
     * @return {Promise(response, error)} A Promise that is fulfilled with the API response or rejected with an error
     */

  }, {
    key: 'feedback',
    value: function feedback(input, _ref) {
      var id = _ref.id,
          data = _ref.data,
          info = _ref.info;

      var url = '' + this._config.basePath + (this.versionId ? replaceVars(MODEL_VERSION_FEEDBACK_PATH, [this.id, this.versionId]) : replaceVars(MODEL_FEEDBACK_PATH, [this.id]));
      var media = formatMediaPredict(input).data;
      info.eventType = 'annotation';
      var body = {
        input: {
          id: id,
          data: Object.assign(media, data),
          'feedback_info': formatObjectForSnakeCase(info)
        }
      };
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.post(url, body, {
            headers: headers
          }).then(function (_ref2) {
            var data = _ref2.data;

            var d = clone(data);
            d.rawData = clone(data);
            resolve(d);
          }, reject);
        });
      });
    }
  }]);

  return Model;
}();

module.exports = Model;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIk1vZGVsLmpzIl0sIm5hbWVzIjpbImF4aW9zIiwicmVxdWlyZSIsIk1vZGVsVmVyc2lvbiIsImlzU3VjY2VzcyIsImNoZWNrVHlwZSIsImNsb25lIiwiQVBJIiwiU1lOQ19USU1FT1VUIiwicmVwbGFjZVZhcnMiLCJTVEFUVVMiLCJQT0xMVElNRSIsIk1PREVMX1FVRVVFRF9GT1JfVFJBSU5JTkciLCJNT0RFTF9UUkFJTklORyIsIndyYXBUb2tlbiIsImZvcm1hdE1lZGlhUHJlZGljdCIsImZvcm1hdE1vZGVsIiwiZm9ybWF0T2JqZWN0Rm9yU25ha2VDYXNlIiwiTU9ERUxfVkVSU0lPTlNfUEFUSCIsIk1PREVMX1ZFUlNJT05fUEFUSCIsIk1PREVMU19QQVRIIiwiTU9ERUxfRkVFREJBQ0tfUEFUSCIsIk1PREVMX1ZFUlNJT05fRkVFREJBQ0tfUEFUSCIsIlBSRURJQ1RfUEFUSCIsIlZFUlNJT05fUFJFRElDVF9QQVRIIiwiTU9ERUxfSU5QVVRTX1BBVEgiLCJNT0RFTF9PVVRQVVRfUEFUSCIsIk1PREVMX1ZFUlNJT05fSU5QVVRTX1BBVEgiLCJNT0RFTF9WRVJTSU9OX01FVFJJQ1NfUEFUSCIsIk1vZGVsIiwiX2NvbmZpZyIsImRhdGEiLCJuYW1lIiwiaWQiLCJjcmVhdGVkQXQiLCJjcmVhdGVkX2F0IiwiYXBwSWQiLCJhcHBfaWQiLCJvdXRwdXRJbmZvIiwib3V0cHV0X2luZm8iLCJ2ZXJzaW9uIiwibW9kZWxWZXJzaW9uIiwidmVyc2lvbklkIiwibW9kZWxfdmVyc2lvbiIsInJhd0RhdGEiLCJjb25jZXB0cyIsImNvbmNlcHRzQXJyIiwiQXJyYXkiLCJpc0FycmF5IiwidXBkYXRlIiwiYWN0aW9uIiwidXJsIiwiYmFzZVBhdGgiLCJoZWFkZXJzIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJwb3N0IiwidGhlbiIsInJlc3BvbnNlIiwib2JqIiwibW9kZWxEYXRhIiwibW9kZWxzIiwibWFwIiwiT2JqZWN0IiwiYXNzaWduIiwibSIsInBhdGNoIiwic3luYyIsInRpbWVTdGFydCIsIkRhdGUiLCJub3ciLCJfcG9sbFRyYWluIiwiYmluZCIsIm1vZGVsIiwiY2xlYXJUaW1lb3V0IiwicG9sbFRpbWVvdXQiLCJzdGF0dXMiLCJtZXNzYWdlIiwiZ2V0T3V0cHV0SW5mbyIsIm1vZGVsU3RhdHVzQ29kZSIsImNvZGUiLCJ0b1N0cmluZyIsInNldFRpbWVvdXQiLCJjYXRjaCIsImlucHV0cyIsImNvbmZpZyIsImlzVmlkZW8iLCJjb25zb2xlIiwid2FybiIsImxhbmd1YWdlIiwidmlkZW8iLCJwYXJhbXMiLCJpbnB1dCIsImdldE93blByb3BlcnR5TmFtZXMiLCJsZW5ndGgiLCJvdXRwdXRfY29uZmlnIiwiZ2V0Iiwib3B0aW9ucyIsInBhZ2UiLCJwZXJQYWdlIiwiaW5mbyIsIm1lZGlhIiwiZXZlbnRUeXBlIiwiYm9keSIsImQiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLGVBQWVELFFBQVEsZ0JBQVIsQ0FBbkI7O2VBQ29DQSxRQUFRLFdBQVIsQztJQUEvQkUsUyxZQUFBQSxTO0lBQVdDLFMsWUFBQUEsUztJQUFXQyxLLFlBQUFBLEs7O2dCQU92QkosUUFBUSxhQUFSLEM7SUFMRkssRyxhQUFBQSxHO0lBQ0FDLFksYUFBQUEsWTtJQUNBQyxXLGFBQUFBLFc7SUFDQUMsTSxhQUFBQSxNO0lBQ0FDLFEsYUFBQUEsUTs7SUFFR0MseUIsR0FBNkNGLE0sQ0FBN0NFLHlCO0lBQTJCQyxjLEdBQWtCSCxNLENBQWxCRyxjOztnQkFDNkNYLFFBQVEsU0FBUixDO0lBQXhFWSxTLGFBQUFBLFM7SUFBV0Msa0IsYUFBQUEsa0I7SUFBb0JDLFcsYUFBQUEsVztJQUFhQyx3QixhQUFBQSx3Qjs7SUFFL0NDLG1CLEdBV0VYLEcsQ0FYRlcsbUI7SUFDQUMsa0IsR0FVRVosRyxDQVZGWSxrQjtJQUNBQyxXLEdBU0ViLEcsQ0FURmEsVztJQUNBQyxtQixHQVFFZCxHLENB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Q0FBQyxLQUFLWSxFQUFOLENBQWpDLENBRkksQ0FBTjtBQUdBLFVBQU1xRSxRQUFRdkYsbUJBQW1COEUsS0FBbkIsRUFBMEI5RCxJQUF4QztBQUNBc0UsV0FBS0UsU0FBTCxHQUFpQixZQUFqQjtBQUNBLFVBQU1DLE9BQU87QUFDWFgsZUFBTztBQUNMNUQsZ0JBREs7QUFFTEYsZ0JBQU1pQyxPQUFPQyxNQUFQLENBQWNxQyxLQUFkLEVBQXFCdkUsSUFBckIsQ0FGRDtBQUdMLDJCQUFpQmQseUJBQXlCb0YsSUFBekI7QUFIWjtBQURJLE9BQWI7QUFPQSxhQUFPdkYsVUFBVSxLQUFLZ0IsT0FBZixFQUF3QixtQkFBVztBQUN4QyxlQUFPLElBQUl3QixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFVQyxNQUFWLEVBQXFCO0FBQ3RDdkQsZ0JBQU13RCxJQUFOLENBQVdOLEdBQVgsRUFBZ0JxRCxJQUFoQixFQUFzQjtBQUNwQm5EO0FBRG9CLFdBQXRCLEVBRUdLLElBRkgsQ0FFUSxpQkFBWTtBQUFBLGdCQUFWM0IsSUFBVSxTQUFWQSxJQUFVOztBQUNsQixnQkFBTTBFLElBQUluRyxNQUFNeUIsSUFBTixDQUFWO0FBQ0EwRSxjQUFFN0QsT0FBRixHQUFZdEMsTUFBTXlCLElBQU4sQ0FBWjtBQUNBd0Isb0JBQVFrRCxDQUFSO0FBQ0QsV0FORCxFQU1HakQsTUFOSDtBQU9ELFNBUk0sQ0FBUDtBQVNELE9BVk0sQ0FBUDtBQVdEOzs7Ozs7QUFHSGtELE9BQ0dDLE9BREgsR0FDYTlFLEtBRGIiLCJmaWxlIjoiTW9kZWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgYXhpb3MgPSByZXF1aXJlKCdheGlvcycpO1xubGV0IE1vZGVsVmVyc2lvbiA9IHJlcXVpcmUoJy4vTW9kZWxWZXJzaW9uJyk7XG5sZXQge2lzU3VjY2VzcywgY2hlY2tUeXBlLCBjbG9uZX0gPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcbmxldCB7XG4gIEFQSSxcbiAgU1lOQ19USU1FT1VULFxuICByZXBsYWNlVmFycyxcbiAgU1RBVFVTLFxuICBQT0xMVElNRVxufSA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5sZXQge01PREVMX1FVRVVFRF9GT1JfVFJBSU5JTkcsIE1PREVMX1RSQUlOSU5HfSA9IFNUQVRVUztcbmxldCB7d3JhcFRva2VuLCBmb3JtYXRNZWRpYVByZWRpY3QsIGZvcm1hdE1vZGVsLCBmb3JtYXRPYmplY3RGb3JTbmFrZUNhc2V9ID0gcmVxdWlyZSgnLi91dGlscycpO1xubGV0IHtcbiAgTU9ERUxfVkVSU0lPTlNfUEFUSCxcbiAgTU9ERUxfVkVSU0lPTl9QQVRILFxuICBNT0RFTFNfUEFUSCxcbiAgTU9ERUxfRkVFREJBQ0tfUEFUSCxcbiAgTU9ERUxfVkVSU0lPTl9GRUVEQkFDS19QQVRILFxuICBQUkVESUNUX1BBVEgsXG4gIFZFUlNJT05fUFJFRElDVF9QQVRILFxuICBNT0RFTF9JTlBVVFNfUEFUSCxcbiAgTU9ERUxfT1VUUFVUX1BBVEgsXG4gIE1PREVMX1ZFUlNJT05fSU5QVVRTX1BBVEgsXG4gIE1PREVMX1ZFUlNJT05fTUVUUklDU19QQVRIXG59ID0gQVBJO1xuXG4vKipcbiAqIGNsYXNzIHJlcHJlc2VudGluZyBhIG1vZGVsXG4gKiBAY2xhc3NcbiAqL1xuY2xhc3MgTW9kZWwge1xuICBjb25zdHJ1Y3RvcihfY29uZmlnLCBkYXRhKSB7XG4gICAgdGhpcy5fY29uZmlnID0gX2NvbmZpZztcbiAgICB0aGlzLm5hbWUgPSBkYXRhLm5hbWU7XG4gICAgdGhpcy5pZCA9IGRhdGEuaWQ7XG4gICAgdGhpcy5jcmVhdGVkQXQgPSBkYXRhLmNyZWF0ZWRfYXQgfHwgZGF0YS5jcmVhdGVkQXQ7XG4gICAgdGhpcy5hcHBJZCA9IGRhdGEuYXBwX2lkIHx8IGRhdGEuYXBwSWQ7XG4gICAgdGhpcy5vdXRwdXRJbmZvID0gZGF0YS5vdXRwdXRfaW5mbyB8fCBkYXRhLm91dHB1dEluZm87XG4gICAgaWYgKGNoZWNrVHlwZSgvKFN0cmluZykvLCBkYXRhLnZlcnNpb24pKSB7XG4gICAgICB0aGlzLm1vZGVsVmVyc2lvbiA9IHt9O1xuICAgICAgdGhpcy52ZXJzaW9uSWQgPSBkYXRhLnZlcnNpb247XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChkYXRhLm1vZGVsX3ZlcnNpb24gfHwgZGF0YS5tb2RlbFZlcnNpb24gfHwgZGF0YS52ZXJzaW9uKSB7XG4gICAgICAgIHRoaXMubW9kZWxWZXJzaW9uID0gbmV3IE1vZGVsVmVyc2lvbih0aGlzLl9jb25maWcsIGRhdGEubW9kZWxfdmVyc2lvbiB8fCBkYXRhLm1vZGVsVmVyc2lvbiB8fCBkYXRhLnZlcnNpb24pO1xuICAgICAgfVxuICAgICAgdGhpcy52ZXJzaW9uSWQgPSAodGhpcy5tb2RlbFZlcnNpb24gfHwge30pLmlkO1xuICAgIH1cbiAgICB0aGlzLnJhd0RhdGEgPSBkYXRhO1xuICB9XG5cbiAgLyoqXG4gICAqIE1lcmdlIGNvbmNlcHRzIHRvIGEgbW9kZWxcbiAgICogQHBhcmFtIHtvYmplY3RbXX0gICAgICBjb25jZXB0cyAgICBMaXN0IG9mIGNvbmNlcHQgb2JqZWN0cyB3aXRoIGlkXG4gICAqIEByZXR1cm4ge1Byb21pc2UoTW9kZWwsIGVycm9yKX0gQSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdpdGggYSBNb2RlbCBpbnN0YW5jZSBvciByZWplY3RlZCB3aXRoIGFuIGVycm9yXG4gICAqL1xuICBtZXJnZUNvbmNlcHRzKGNvbmNlcHRzID0gW10pIHtcbiAgICBsZXQgY29uY2VwdHNBcnIgPSBBcnJheS5pc0FycmF5KGNvbmNlcHRzKSA/IGNvbmNlcHRzIDogW2NvbmNlcHRzXTtcbiAgICByZXR1cm4gdGhpcy51cGRhdGUoe2FjdGlvbjogJ21lcmdlJywgY29uY2VwdHM6IGNvbmNlcHRzQXJyfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGNvbmNlcHRzIGZyb20gYSBtb2RlbFxuICAgKiBAcGFyYW0ge29iamVjdFtdfSAgICAgIGNvbmNlcHRzICAgIExpc3Qgb2YgY29uY2VwdCBvYmplY3RzIHdpdGggaWRcbiAgICogQHJldHVybiB7UHJvbWlzZShNb2RlbCwgZXJyb3IpfSBBIFByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2l0aCBhIE1vZGVsIGluc3RhbmNlIG9yIHJlamVjdGVkIHdpdGggYW4gZXJyb3JcbiAgICovXG4gIGRlbGV0ZUNvbmNlcHRzKGNvbmNlcHRzID0gW10pIHtcbiAgICBsZXQgY29uY2VwdHNBcnIgPSBBcnJheS5pc0FycmF5KGNvbmNlcHRzKSA/IGNvbmNlcHRzIDogW2NvbmNlcHRzXTtcbiAgICByZXR1cm4gdGhpcy51cGRhdGUoe2FjdGlvbjogJ3JlbW92ZScsIGNvbmNlcHRzOiBjb25jZXB0c0Fycn0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE92ZXJ3cml0ZSBjb25jZXB0cyBpbiBhIG1vZGVsXG4gICAqIEBwYXJhbSB7b2JqZWN0W119ICAgICAgY29uY2VwdHMgICAgTGlzdCBvZiBjb25jZXB0IG9iamVjdHMgd2l0aCBpZFxuICAgKiBAcmV0dXJuIHtQcm9taXNlKE1vZGVsLCBlcnJvcil9IEEgUHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aXRoIGEgTW9kZWwgaW5zdGFuY2Ugb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgb3ZlcndyaXRlQ29uY2VwdHMoY29uY2VwdHMgPSBbXSkge1xuICAgIGxldCBjb25jZXB0c0FyciA9IEFycmF5LmlzQXJyYXkoY29uY2VwdHMpID8gY29uY2VwdHMgOiBbY29uY2VwdHNdO1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZSh7YWN0aW9uOiAnb3ZlcndyaXRlJywgY29uY2VwdHM6IGNvbmNlcHRzQXJyfSk7XG4gIH1cblxuICAvKipcbiAgICogU3RhcnQgYSBtb2RlbCBldmFsdWF0aW9uIGpvYlxuICAgKiBAcmV0dXJuIHtQcm9taXNlKE1vZGVsVmVyc2lvbiwgZXJyb3IpfSBBIFByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2l0aCBhIE1vZGVsVmVyc2lvbiBpbnN0YW5jZSBvciByZWplY3RlZCB3aXRoIGFuIGVycm9yXG4gICAqL1xuICBydW5Nb2RlbEV2YWwoKSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuX2NvbmZpZy5iYXNlUGF0aH0ke3JlcGxhY2VWYXJzKE1PREVMX1ZFUlNJT05fTUVUUklDU19QQVRILCBbdGhpcy5pZCwgdGhpcy52ZXJzaW9uSWRdKX1gO1xuICAgIHJldHVybiB3cmFwVG9rZW4odGhpcy5fY29uZmlnLCAoaGVhZGVycykgPT4ge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgYXhpb3MucG9zdCh1cmwsIHt9LCB7aGVhZGVyc30pLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgaWYgKGlzU3VjY2VzcyhyZXNwb25zZSkpIHtcbiAgICAgICAgICAgIHJlc29sdmUobmV3IE1vZGVsVmVyc2lvbih0aGlzLl9jb25maWcsIHJlc3BvbnNlLmRhdGEubW9kZWxfdmVyc2lvbikpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSBhIG1vZGVsJ3Mgb3V0cHV0IGNvbmZpZyBvciBjb25jZXB0c1xuICAgKiBAcGFyYW0ge29iamVjdH0gICAgICAgICAgICAgICBtb2RlbCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEFuIG9iamVjdCB3aXRoIGFueSBvZiB0aGUgZm9sbG93aW5nIGF0dHJzOlxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICAgIG5hbWUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVGhlIG5ldyBuYW1lIG9mIHRoZSBtb2RlbCB0byB1cGRhdGUgd2l0aFxuICAgKiAgIEBwYXJhbSB7Ym9vbGVhbn0gICAgICAgICAgICAgIGNvbmNlcHRzTXV0dWFsbHlFeGNsdXNpdmUgICAgICAgICAgICAgRG8geW91IGV4cGVjdCB0byBzZWUgbW9yZSB0aGFuIG9uZSBvZiB0aGUgY29uY2VwdHMgaW4gdGhpcyBtb2RlbCBpbiB0aGUgU0FNRSBpbWFnZT8gU2V0IHRvIGZhbHNlIChkZWZhdWx0KSBpZiBzby4gT3RoZXJ3aXNlLCBzZXQgdG8gdHJ1ZS5cbiAgICogICBAcGFyYW0ge2Jvb2xlYW59ICAgICAgICAgICAgICBjbG9zZWRFbnZpcm9ubWVudCAgICAgICAgICAgICAgICAgICAgIERvIHlvdSBleHBlY3QgdG8gcnVuIHRoZSB0cmFpbmVkIG1vZGVsIG9uIGltYWdlcyB0aGF0IGRvIG5vdCBjb250YWluIEFOWSBvZiB0aGUgY29uY2VwdHMgaW4gdGhlIG1vZGVsPyBTZXQgdG8gZmFsc2UgKGRlZmF1bHQpIGlmIHNvLiBPdGhlcndpc2UsIHNldCB0byB0cnVlLlxuICAgKiAgIEBwYXJhbSB7b2JqZWN0W119ICAgICAgICAgICAgIGNvbmNlcHRzICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQW4gYXJyYXkgb2YgY29uY2VwdCBvYmplY3RzIG9yIHN0cmluZ1xuICAgKiAgICAgQHBhcmFtIHtvYmplY3R8c3RyaW5nfSAgICAgICAgY29uY2VwdHNbXS5jb25jZXB0ICAgICAgICAgICAgICAgICAgICBJZiBzdHJpbmcgaXMgZ2l2ZW4sIHRoaXMgaXMgaW50ZXJwcmV0ZWQgYXMgY29uY2VwdCBpZC4gT3RoZXJ3aXNlLCBpZiBvYmplY3QgaXMgZ2l2ZW4sIGNsaWVudCBleHBlY3RzIHRoZSBmb2xsb3dpbmcgYXR0cmlidXRlc1xuICAgKiAgICAgICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgY29uY2VwdHNbXS5jb25jZXB0LmlkICAgICAgICAgICAgICAgICAgIFRoZSBpZCBvZiB0aGUgY29uY2VwdCB0byBhdHRhY2ggdG8gdGhlIG1vZGVsXG4gICAqICAgQHBhcmFtIHtvYmplY3RbXX0gICAgICAgICAgICAgYWN0aW9uICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBUaGUgYWN0aW9uIHRvIHBlcmZvcm0gb24gdGhlIGdpdmVuIGNvbmNlcHRzLiBQb3NzaWJsZSB2YWx1ZXMgYXJlICdtZXJnZScsICdyZW1vdmUnLCBvciAnb3ZlcndyaXRlJy4gRGVmYXVsdDogJ21lcmdlJ1xuICAgKiBAcmV0dXJuIHtQcm9taXNlKE1vZGVsLCBlcnJvcil9IEEgUHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aXRoIGEgTW9kZWwgaW5zdGFuY2Ugb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgdXBkYXRlKG9iaikge1xuICAgIGxldCB1cmwgPSBgJHt0aGlzLl9jb25maWcuYmFzZVBhdGh9JHtNT0RFTFNfUEFUSH1gO1xuICAgIGxldCBtb2RlbERhdGEgPSBbb2JqXTtcbiAgICBsZXQgZGF0YSA9IHttb2RlbHM6IG1vZGVsRGF0YS5tYXAobSA9PiBmb3JtYXRNb2RlbChPYmplY3QuYXNzaWduKG0sIHtpZDogdGhpcy5pZH0pKSl9O1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9iai5jb25jZXB0cykpIHtcbiAgICAgIGRhdGFbJ2FjdGlvbiddID0gb2JqLmFjdGlvbiB8fCAnbWVyZ2UnO1xuICAgIH1cblxuICAgIHJldHVybiB3cmFwVG9rZW4odGhpcy5fY29uZmlnLCAoaGVhZGVycykgPT4ge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgYXhpb3MucGF0Y2godXJsLCBkYXRhLCB7aGVhZGVyc30pLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgaWYgKGlzU3VjY2VzcyhyZXNwb25zZSkpIHtcbiAgICAgICAgICAgIHJlc29sdmUobmV3IE1vZGVsKHRoaXMuX2NvbmZpZywgcmVzcG9uc2UuZGF0YS5tb2RlbHNbMF0pKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KHJlc3BvbnNlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIHJlamVjdCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgbW9kZWwgdmVyc2lvblxuICAgKiBAcGFyYW0ge2Jvb2xlYW59ICAgICAgIHN5bmMgICAgIElmIHRydWUsIHRoaXMgcmV0dXJucyBhZnRlciBtb2RlbCBoYXMgY29tcGxldGVseSB0cmFpbmVkLiBJZiBmYWxzZSwgdGhpcyBpbW1lZGlhdGVseSByZXR1cm5zIGRlZmF1bHQgYXBpIHJlc3BvbnNlLlxuICAgKiBAcmV0dXJuIHtQcm9taXNlKE1vZGVsLCBlcnJvcil9IEEgUHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aXRoIGEgTW9kZWwgaW5zdGFuY2Ugb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgdHJhaW4oc3luYykge1xuICAgIGxldCB1cmwgPSBgJHt0aGlzLl9jb25maWcuYmFzZVBhdGh9JHtyZXBsYWNlVmFycyhNT0RFTF9WRVJTSU9OU19QQVRILCBbdGhpcy5pZF0pfWA7XG4gICAgcmV0dXJuIHdyYXBUb2tlbih0aGlzLl9jb25maWcsIChoZWFkZXJzKSA9PiB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBheGlvcy5wb3N0KHVybCwgbnVsbCwge2hlYWRlcnN9KS50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgIGlmIChpc1N1Y2Nlc3MocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICBpZiAoc3luYykge1xuICAgICAgICAgICAgICBsZXQgdGltZVN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgICAgdGhpcy5fcG9sbFRyYWluLmJpbmQodGhpcykodGltZVN0YXJ0LCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzb2x2ZShuZXcgTW9kZWwodGhpcy5fY29uZmlnLCByZXNwb25zZS5kYXRhLm1vZGVsKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCByZWplY3QpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBfcG9sbFRyYWluKHRpbWVTdGFydCwgcmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMucG9sbFRpbWVvdXQpO1xuICAgIGlmICgoRGF0ZS5ub3coKSAtIHRpbWVTdGFydCkgPj0gU1lOQ19USU1FT1VUKSB7XG4gICAgICByZXR1cm4gcmVqZWN0KHtcbiAgICAgICAgc3RhdHVzOiAnRXJyb3InLFxuICAgICAgICBtZXNzYWdlOiAnU3luYyBjYWxsIHRpbWVkIG91dCdcbiAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLmdldE91dHB1dEluZm8oKS50aGVuKChtb2RlbCkgPT4ge1xuICAgICAgbGV0IG1vZGVsU3RhdHVzQ29kZSA9IG1vZGVsLm1vZGVsVmVyc2lvbi5zdGF0dXMuY29kZS50b1N0cmluZygpO1xuICAgICAgaWYgKG1vZGVsU3RhdHVzQ29kZSA9PT0gTU9ERUxfUVVFVUVEX0ZPUl9UUkFJTklORyB8fCBtb2RlbFN0YXR1c0NvZGUgPT09IE1PREVMX1RSQUlOSU5HKSB7XG4gICAgICAgIHRoaXMucG9sbFRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHRoaXMuX3BvbGxUcmFpbih0aW1lU3RhcnQsIHJlc29sdmUsIHJlamVjdCksIFBPTExUSU1FKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUobW9kZWwpO1xuICAgICAgfVxuICAgIH0sIHJlamVjdClcbiAgICAgIC5jYXRjaChyZWplY3QpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgbW9kZWwgb3VwdXRzIGFjY29yZGluZyB0byBpbnB1dHNcbiAgICogQHBhcmFtIHtvYmplY3RbXXxvYmplY3R8c3RyaW5nfSAgICAgICBpbnB1dHMgICAgQW4gYXJyYXkgb2Ygb2JqZWN0cy9vYmplY3Qvc3RyaW5nIHBvaW50aW5nIHRvIGFuIGltYWdlIHJlc291cmNlLiBBIHN0cmluZyBjYW4gZWl0aGVyIGJlIGEgdXJsIG9yIGJhc2U2NCBpbWFnZSBieXRlcy4gT2JqZWN0IGtleXMgZXhwbGFpbmVkIGJlbG93OlxuICAgKiAgICBAcGFyYW0ge29iamVjdH0gICAgICAgICAgICAgICAgICAgICAgaW5wdXRzW10uaW1hZ2UgICAgIE9iamVjdCB3aXRoIGtleXMgZXhwbGFpbmVkIGJlbG93OlxuICAgKiAgICAgICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICAgICAgICBpbnB1dHNbXS5pbWFnZS4odXJsfGJhc2U2NCkgICBDYW4gYmUgYSBwdWJsaWNseSBhY2Nlc3NpYmx5IHVybCBvciBiYXNlNjQgc3RyaW5nIHJlcHJlc2VudGluZyBpbWFnZSBieXRlcyAocmVxdWlyZWQpXG4gICAqICAgICAgIEBwYXJhbSB7bnVtYmVyW119ICAgICAgICAgICAgICAgICAgIGlucHV0c1tdLmltYWdlLmNyb3AgICAgICAgICAgIEFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIHBlcmNlbnQgdG8gYmUgY3JvcHBlZCBmcm9tIHRvcCwgbGVmdCwgYm90dG9tIGFuZCByaWdodCAob3B0aW9uYWwpXG4gICAqIEBwYXJhbSB7b2JqZWN0fHN0cmluZ30gY29uZmlnIEFuIG9iamVjdCB3aXRoIGtleXMgZXhwbGFpbmVkIGJlbG93LiBJZiBhIHN0cmluZyBpcyBwYXNzZWQgaW5zdGVhZCwgaXQgd2lsbCBiZSB0cmVhdGVkIGFzIHRoZSBsYW5ndWFnZSAoYmFja3dhcmRzIGNvbXBhdGliaWxpdHkpXG4gICAqICAgQHBhcmFtIHtzdHJpbmd9IGNvbmZpZy5sYW5ndWFnZSBBIHN0cmluZyBjb2RlIHJlcHJlc2VudGluZyB0aGUgbGFuZ3VhZ2UgdG8gcmV0dXJuIHJlc3VsdHMgaW4gKGV4YW1wbGU6ICd6aCcgZm9yIHNpbXBsaWZpZWQgQ2hpbmVzZSwgJ3J1JyBmb3IgUnVzc2lhbiwgJ2phJyBmb3IgSmFwYW5lc2UpXG4gICAqICAgQHBhcmFtIHtib29sZWFufSBjb25maWcudmlkZW8gaW5kaWNhdGVzIGlmIHRoZSBpbnB1dCBzaG91bGQgYmUgcHJvY2Vzc2VkIGFzIGEgdmlkZW9cbiAgICogICBAcGFyYW0ge29iamVjdFtdfSBjb25maWcuc2VsZWN0Q29uY2VwdHMgQW4gYXJyYXkgb2YgY29uY2VwdHMgdG8gcmV0dXJuLiBFYWNoIG9iamVjdCBpbiB0aGUgYXJyYXkgd2lsbCBoYXZlIGEgZm9ybSBvZiB7bmFtZTogPENPTkNFUFRfTkFNRT59IG9yIHtpZDogQ09OQ0VQVF9JRH1cbiAgICogICBAcGFyYW0ge2Zsb2F0fSBjb25maWcubWluVmFsdWUgVGhlIG1pbmltdW0gY29uZmlkZW5jZSB0aHJlc2hvbGQgdGhhdCBhIHJlc3VsdCBtdXN0IG1lZXQuIEZyb20gMC4wIHRvIDEuMFxuICAgKiAgIEBwYXJhbSB7bnVtYmVyfSBjb25maWcubWF4Q29uY2VwdHMgVGhlIG1heGltdW0gbnVtYmVyIG9mIGNvbmNlcHRzIHRvIHJldHVyblxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzVmlkZW8gIERlcHJlY2F0ZWQ6IGluZGljYXRlcyBpZiB0aGUgaW5wdXQgc2hvdWxkIGJlIHByb2Nlc3NlZCBhcyBhIHZpZGVvIChkZWZhdWx0IGZhbHNlKS4gRGVwcmVjYXRlZCBpbiBmYXZvciBvZiB1c2luZyBjb25maWcgb2JqZWN0XG4gICAqIEByZXR1cm4ge1Byb21pc2UocmVzcG9uc2UsIGVycm9yKX0gQSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdpdGggdGhlIEFQSSByZXNwb25zZSBvciByZWplY3RlZCB3aXRoIGFuIGVycm9yXG4gICAqL1xuICBwcmVkaWN0KGlucHV0cywgY29uZmlnID0ge30sIGlzVmlkZW8gPSBmYWxzZSkge1xuICAgIGlmIChjaGVja1R5cGUoL1N0cmluZy8sIGNvbmZpZykpIHtcbiAgICAgIGNvbnNvbGUud2FybigncGFzc2luZyB0aGUgbGFuZ3VhZ2UgYXMgYSBzdHJpbmcgaXMgZGVwcmVjYXRlZCwgY29uc2lkZXIgdXNpbmcgdGhlIGNvbmZpZ3VyYXRpb24gb2JqZWN0IGluc3RlYWQnKTtcbiAgICAgIGNvbmZpZyA9IHtcbiAgICAgICAgbGFuZ3VhZ2U6IGNvbmZpZ1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoaXNWaWRlbykge1xuICAgICAgY29uc29sZS53YXJuKCdcImlzVmlkZW9cIiBhcmd1bWVudCBpcyBkZXByZWNhdGVkLCBjb25zaWRlciB1c2luZyB0aGUgY29uZmlndXJhdGlvbiBvYmplY3QgaW5zdGVhZCcpO1xuICAgICAgY29uZmlnLnZpZGVvID0gaXNWaWRlbztcbiAgICB9XG4gICAgY29uc3QgdmlkZW8gPSBjb25maWcudmlkZW8gfHwgZmFsc2U7XG4gICAgZGVsZXRlIGNvbmZpZy52aWRlbztcbiAgICBpZiAoY2hlY2tUeXBlKC8oT2JqZWN0fFN0cmluZykvLCBpbnB1dHMpKSB7XG4gICAgICBpbnB1dHMgPSBbaW5wdXRzXTtcbiAgICB9XG4gICAgbGV0IHVybCA9IGAke3RoaXMuX2NvbmZpZy5iYXNlUGF0aH0ke3RoaXMudmVyc2lvbklkID9cbiAgICAgIHJlcGxhY2VWYXJzKFZFUlNJT05fUFJFRElDVF9QQVRILCBbdGhpcy5pZCwgdGhpcy52ZXJzaW9uSWRdKSA6XG4gICAgICByZXBsYWNlVmFycyhQUkVESUNUX1BBVEgsIFt0aGlzLmlkXSl9YDtcbiAgICByZXR1cm4gd3JhcFRva2VuKHRoaXMuX2NvbmZpZywgKGhlYWRlcnMpID0+IHtcbiAgICAgIGxldCBwYXJhbXMgPSB7aW5wdXRzOiBpbnB1dHMubWFwKGlucHV0ID0+IGZvcm1hdE1lZGlhUHJlZGljdChpbnB1dCwgdmlkZW8gPyAndmlkZW8nIDogJ2ltYWdlJykpfTtcbiAgICAgIGlmIChjb25maWcgJiYgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoY29uZmlnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHBhcmFtc1snbW9kZWwnXSA9IHtcbiAgICAgICAgICBvdXRwdXRfaW5mbzoge1xuICAgICAgICAgICAgb3V0cHV0X2NvbmZpZzogZm9ybWF0T2JqZWN0Rm9yU25ha2VDYXNlKGNvbmZpZylcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBheGlvcy5wb3N0KHVybCwgcGFyYW1zLCB7aGVhZGVyc30pLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgbGV0IGRhdGEgPSBjbG9uZShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICBkYXRhLnJhd0RhdGEgPSBjbG9uZShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICB9LCByZWplY3QpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIHZlcnNpb24gb2YgdGhlIG1vZGVsIHNwZWNpZmllZCBieSBpdHMgaWRcbiAgICogQHBhcmFtIHtzdHJpbmd9ICAgICB2ZXJzaW9uSWQgICBUaGUgbW9kZWwncyBpZFxuICAgKiBAcmV0dXJuIHtQcm9taXNlKHJlc3BvbnNlLCBlcnJvcil9IEEgUHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aXRoIHRoZSBBUEkgcmVzcG9uc2Ugb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgZ2V0VmVyc2lvbih2ZXJzaW9uSWQpIHtcbiAgICBsZXQgdXJsID0gYCR7dGhpcy5fY29uZmlnLmJhc2VQYXRofSR7cmVwbGFjZVZhcnMoTU9ERUxfVkVSU0lPTl9QQVRILCBbdGhpcy5pZCwgdmVyc2lvbklkXSl9YDtcbiAgICByZXR1cm4gd3JhcFRva2VuKHRoaXMuX2NvbmZpZywgKGhlYWRlcnMpID0+IHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGF4aW9zLmdldCh1cmwsIHtoZWFkZXJzfSkudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICBsZXQgZGF0YSA9IGNsb25lKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgIGRhdGEucmF3RGF0YSA9IGNsb25lKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgIH0sIHJlamVjdCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgbGlzdCBvZiB2ZXJzaW9ucyBvZiB0aGUgbW9kZWxcbiAgICogQHBhcmFtIHtvYmplY3R9ICAgICBvcHRpb25zICAgICBPYmplY3Qgd2l0aCBrZXlzIGV4cGxhaW5lZCBiZWxvdzogKG9wdGlvbmFsKVxuICAgKiAgIEBwYXJhbSB7bnVtYmVyfSAgICAgb3B0aW9ucy5wYWdlICAgICAgICBUaGUgcGFnZSBudW1iZXIgKG9wdGlvbmFsLCBkZWZhdWx0OiAxKVxuICAgKiAgIEBwYXJhbSB7bnVtYmVyfSAgICAgb3B0aW9ucy5wZXJQYWdlICAgICBOdW1iZXIgb2YgaW1hZ2VzIHRvIHJldHVybiBwZXIgcGFnZSAob3B0aW9uYWwsIGRlZmF1bHQ6IDIwKVxuICAgKiBAcmV0dXJuIHtQcm9taXNlKHJlc3BvbnNlLCBlcnJvcil9IEEgUHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aXRoIHRoZSBBUEkgcmVzcG9uc2Ugb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgZ2V0VmVyc2lvbnMob3B0aW9ucyA9IHtwYWdlOiAxLCBwZXJQYWdlOiAyMH0pIHtcbiAgICBsZXQgdXJsID0gYCR7dGhpcy5fY29uZmlnLmJhc2VQYXRofSR7cmVwbGFjZVZhcnMoTU9ERUxfVkVSU0lPTlNfUEFUSCwgW3RoaXMuaWRdKX1gO1xuICAgIHJldHVybiB3cmFwVG9rZW4odGhpcy5fY29uZmlnLCAoaGVhZGVycykgPT4ge1xuICAgICAgbGV0IGRhdGEgPSB7XG4gICAgICAgIGhlYWRlcnMsXG4gICAgICAgIHBhcmFtczogeydwZXJfcGFnZSc6IG9wdGlvbnMucGVyUGFnZSwgJ3BhZ2UnOiBvcHRpb25zLnBhZ2V9LFxuICAgICAgfTtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGF4aW9zLmdldCh1cmwsIGRhdGEpLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgbGV0IGRhdGEgPSBjbG9uZShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICBkYXRhLnJhd0RhdGEgPSBjbG9uZShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICB9LCByZWplY3QpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbGwgdGhlIG1vZGVsJ3Mgb3V0cHV0IGluZm9cbiAgICogQHJldHVybiB7UHJvbWlzZShNb2RlbCwgZXJyb3IpfSBBIFByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2l0aCBhIE1vZGVsIGluc3RhbmNlIG9yIHJlamVjdGVkIHdpdGggYW4gZXJyb3JcbiAgICovXG4gIGdldE91dHB1dEluZm8oKSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuX2NvbmZpZy5iYXNlUGF0aH0ke3JlcGxhY2VWYXJzKE1PREVMX09VVFBVVF9QQVRILCBbdGhpcy5pZF0pfWA7XG4gICAgcmV0dXJuIHdyYXBUb2tlbih0aGlzLl9jb25maWcsIChoZWFkZXJzKSA9PiB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBheGlvcy5nZXQodXJsLCB7aGVhZGVyc30pLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgcmVzb2x2ZShuZXcgTW9kZWwodGhpcy5fY29uZmlnLCByZXNwb25zZS5kYXRhLm1vZGVsKSk7XG4gICAgICAgIH0sIHJlamVjdCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFsbCB0aGUgbW9kZWwncyBpbnB1dHNcbiAgICogQHBhcmFtIHtvYmplY3R9ICAgICBvcHRpb25zICAgICBPYmplY3Qgd2l0aCBrZXlzIGV4cGxhaW5lZCBiZWxvdzogKG9wdGlvbmFsKVxuICAgKiAgIEBwYXJhbSB7bnVtYmVyfSAgICAgb3B0aW9ucy5wYWdlICAgICAgICBUaGUgcGFnZSBudW1iZXIgKG9wdGlvbmFsLCBkZWZhdWx0OiAxKVxuICAgKiAgIEBwYXJhbSB7bnVtYmVyfSAgICAgb3B0aW9ucy5wZXJQYWdlICAgICBOdW1iZXIgb2YgaW1hZ2VzIHRvIHJldHVybiBwZXIgcGFnZSAob3B0aW9uYWwsIGRlZmF1bHQ6IDIwKVxuICAgKiBAcmV0dXJuIHtQcm9taXNlKHJlc3BvbnNlLCBlcnJvcil9IEEgUHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aXRoIHRoZSBBUEkgcmVzcG9uc2Ugb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgZ2V0SW5wdXRzKG9wdGlvbnMgPSB7cGFnZTogMSwgcGVyUGFnZTogMjB9KSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuX2NvbmZpZy5iYXNlUGF0aH0ke3RoaXMudmVyc2lvbklkID9cbiAgICAgIHJlcGxhY2VWYXJzKE1PREVMX1ZFUlNJT05fSU5QVVRTX1BBVEgsIFt0aGlzLmlkLCB0aGlzLnZlcnNpb25JZF0pIDpcbiAgICAgIHJlcGxhY2VWYXJzKE1PREVMX0lOUFVUU19QQVRILCBbdGhpcy5pZF0pfWA7XG4gICAgcmV0dXJuIHdyYXBUb2tlbih0aGlzLl9jb25maWcsIChoZWFkZXJzKSA9PiB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBheGlvcy5nZXQodXJsLCB7XG4gICAgICAgICAgcGFyYW1zOiB7J3Blcl9wYWdlJzogb3B0aW9ucy5wZXJQYWdlLCAncGFnZSc6IG9wdGlvbnMucGFnZX0sXG4gICAgICAgICAgaGVhZGVyc1xuICAgICAgICB9KS50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgIGxldCBkYXRhID0gY2xvbmUocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgZGF0YS5yYXdEYXRhID0gY2xvbmUocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpbnB1dCBBIHN0cmluZyBwb2ludGluZyB0byBhbiBpbWFnZSByZXNvdXJjZS4gQSBzdHJpbmcgbXVzdCBiZSBhIHVybFxuICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIEEgY29uZmlndXJhdGlvbiBvYmplY3QgY29uc2lzdGluZyBvZiB0aGUgZm9sbG93aW5nIHJlcXVpcmVkIGtleXNcbiAgICogICBAcGFyYW0ge3N0cmluZ30gY29uZmlnLmlkIFRoZSBpZCBvZiB0aGUgZmVlZGJhY2sgcmVxdWVzdFxuICAgKiAgIEBwYXJhbSB7b2JqZWN0fSBjb25maWcuZGF0YSBUaGUgZmVlZGJhY2sgZGF0YSB0byBiZSBzZW50XG4gICAqICAgQHBhcmFtIHtvYmplY3R9IGNvbmZpZy5pbmZvIE1ldGEgZGF0YSByZWxhdGVkIHRvIHRoZSBmZWVkYmFjayByZXF1ZXN0XG4gICAqIEByZXR1cm4ge1Byb21pc2UocmVzcG9uc2UsIGVycm9yKX0gQSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdpdGggdGhlIEFQSSByZXNwb25zZSBvciByZWplY3RlZCB3aXRoIGFuIGVycm9yXG4gICAqL1xuICBmZWVkYmFjayhpbnB1dCwge2lkLCBkYXRhLCBpbmZvfSkge1xuICAgIGNvbnN0IHVybCA9IGAke3RoaXMuX2NvbmZpZy5iYXNlUGF0aH0ke3RoaXMudmVyc2lvbklkID9cbiAgICAgIHJlcGxhY2VWYXJzKE1PREVMX1ZFUlNJT05fRkVFREJBQ0tfUEFUSCwgW3RoaXMuaWQsIHRoaXMudmVyc2lvbklkXSkgOlxuICAgICAgcmVwbGFjZVZhcnMoTU9ERUxfRkVFREJBQ0tfUEFUSCwgW3RoaXMuaWRdKX1gO1xuICAgIGNvbnN0IG1lZGlhID0gZm9ybWF0TWVkaWFQcmVkaWN0KGlucHV0KS5kYXRhO1xuICAgIGluZm8uZXZlbnRUeXBlID0gJ2Fubm90YXRpb24nO1xuICAgIGNvbnN0IGJvZHkgPSB7XG4gICAgICBpbnB1dDoge1xuICAgICAgICBpZCxcbiAgICAgICAgZGF0YTogT2JqZWN0LmFzc2lnbihtZWRpYSwgZGF0YSksXG4gICAgICAgICdmZWVkYmFja19pbmZvJzogZm9ybWF0T2JqZWN0Rm9yU25ha2VDYXNlKGluZm8pXG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gd3JhcFRva2VuKHRoaXMuX2NvbmZpZywgaGVhZGVycyA9PiB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBheGlvcy5wb3N0KHVybCwgYm9keSwge1xuICAgICAgICAgIGhlYWRlcnNcbiAgICAgICAgfSkudGhlbigoe2RhdGF9KSA9PiB7XG4gICAgICAgICAgY29uc3QgZCA9IGNsb25lKGRhdGEpO1xuICAgICAgICAgIGQucmF3RGF0YSA9IGNsb25lKGRhdGEpO1xuICAgICAgICAgIHJlc29sdmUoZCk7XG4gICAgICAgIH0sIHJlamVjdCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuXG5tb2R1bGVcbiAgLmV4cG9ydHMgPSBNb2RlbDtcbiJdfQ==
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/Model.js","/")
},{"./ModelVersion":43,"./constants":46,"./helpers":48,"./utils":49,"axios":4,"buffer":23,"pBGvAp":27}],43:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * class representing a version of a model
 * @class
 */
var ModelVersion = function ModelVersion(_config, data) {
  _classCallCheck(this, ModelVersion);

  this.id = data.id;
  this.created_at = this.createdAt = data.created_at || data.createdAt;
  this.status = data.status;
  this.active_concept_count = data.active_concept_count;
  this.metrics = data.metrics;
  this._config = _config;
  this.rawData = data;
};

;

module.exports = ModelVersion;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIk1vZGVsVmVyc2lvbi5qcyJdLCJuYW1lcyI6WyJNb2RlbFZlcnNpb24iLCJfY29uZmlnIiwiZGF0YSIsImlkIiwiY3JlYXRlZF9hdCIsImNyZWF0ZWRBdCIsInN0YXR1cyIsImFjdGl2ZV9jb25jZXB0X2NvdW50IiwibWV0cmljcyIsInJhd0RhdGEiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7SUFJTUEsWSxHQUNKLHNCQUFZQyxPQUFaLEVBQXFCQyxJQUFyQixFQUEyQjtBQUFBOztBQUN6QixPQUFLQyxFQUFMLEdBQVVELEtBQUtDLEVBQWY7QUFDQSxPQUFLQyxVQUFMLEdBQWtCLEtBQUtDLFNBQUwsR0FBaUJILEtBQUtFLFVBQUwsSUFBbUJGLEtBQUtHLFNBQTNEO0FBQ0EsT0FBS0MsTUFBTCxHQUFjSixLQUFLSSxNQUFuQjtBQUNBLE9BQUtDLG9CQUFMLEdBQTRCTCxLQUFLSyxvQkFBakM7QUFDQSxPQUFLQyxPQUFMLEdBQWVOLEtBQUtNLE9BQXBCO0FBQ0EsT0FBS1AsT0FBTCxHQUFlQSxPQUFmO0FBQ0EsT0FBS1EsT0FBTCxHQUFlUCxJQUFmO0FBQ0QsQzs7QUFFSDs7QUFFQVEsT0FBT0MsT0FBUCxHQUFpQlgsWUFBakIiLCJmaWxlIjoiTW9kZWxWZXJzaW9uLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBjbGFzcyByZXByZXNlbnRpbmcgYSB2ZXJzaW9uIG9mIGEgbW9kZWxcbiAqIEBjbGFzc1xuICovXG5jbGFzcyBNb2RlbFZlcnNpb24ge1xuICBjb25zdHJ1Y3RvcihfY29uZmlnLCBkYXRhKSB7XG4gICAgdGhpcy5pZCA9IGRhdGEuaWQ7XG4gICAgdGhpcy5jcmVhdGVkX2F0ID0gdGhpcy5jcmVhdGVkQXQgPSBkYXRhLmNyZWF0ZWRfYXQgfHwgZGF0YS5jcmVhdGVkQXQ7XG4gICAgdGhpcy5zdGF0dXMgPSBkYXRhLnN0YXR1cztcbiAgICB0aGlzLmFjdGl2ZV9jb25jZXB0X2NvdW50ID0gZGF0YS5hY3RpdmVfY29uY2VwdF9jb3VudDtcbiAgICB0aGlzLm1ldHJpY3MgPSBkYXRhLm1ldHJpY3M7XG4gICAgdGhpcy5fY29uZmlnID0gX2NvbmZpZztcbiAgICB0aGlzLnJhd0RhdGEgPSBkYXRhO1xuICB9XG59XG47XG5cbm1vZHVsZS5leHBvcnRzID0gTW9kZWxWZXJzaW9uO1xuIl19
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/ModelVersion.js","/")
},{"buffer":23,"pBGvAp":27}],44:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var axios = require('axios');
var Promise = require('promise');
var Model = require('./Model');
var Concepts = require('./Concepts');

var _require = require('./constants'),
    API = _require.API,
    ERRORS = _require.ERRORS,
    replaceVars = _require.replaceVars;

var _require2 = require('./helpers'),
    isSuccess = _require2.isSuccess,
    checkType = _require2.checkType,
    clone = _require2.clone;

var _require3 = require('./utils'),
    wrapToken = _require3.wrapToken,
    formatModel = _require3.formatModel;

var MODELS_PATH = API.MODELS_PATH,
    MODEL_PATH = API.MODEL_PATH,
    MODEL_SEARCH_PATH = API.MODEL_SEARCH_PATH,
    MODEL_VERSION_PATH = API.MODEL_VERSION_PATH;

/**
 * class representing a collection of models
 * @class
 */

var Models = function () {
  function Models(_config) {
    var _this = this;

    var rawData = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

    _classCallCheck(this, Models);

    this._config = _config;
    this.rawData = rawData;
    rawData.forEach(function (modelData, index) {
      _this[index] = new Model(_this._config, modelData);
    });
    this.length = rawData.length;
  }

  /**
   * Returns a Model instance given model id or name. It will call search if name is given.
   * @param {string|object}    model       If string, it is assumed to be model id. Otherwise, if object is given, it can have any of the following keys:
   *   @param {string}           model.id          Model id
   *   @param {string}           model.name        Model name
   *   @param {string}           model.version     Model version
   *   @param {string}           model.type        This can be "concept", "color", "embed", "facedetect", "cluster" or "blur"
   * @return {Promise(Model, error)} A Promise that is fulfilled with a Model instance or rejected with an error
   */


  _createClass(Models, [{
    key: 'initModel',
    value: function initModel(model) {
      var _this2 = this;

      var data = {};
      var fn = void 0;
      if (checkType(/String/, model)) {
        data.id = model;
      } else {
        data = model;
      }
      if (data.id) {
        fn = function fn(resolve, reject) {
          resolve(new Model(_this2._config, data));
        };
      } else {
        fn = function fn(resolve, reject) {
          _this2.search(data.name, data.type).then(function (models) {
            if (data.version) {
              resolve(models.rawData.filter(function (model) {
                return model.modelVersion.id === data.version;
              }));
            } else {
              resolve(models[0]);
            }
          }, reject).catch(reject);
        };
      }
      return new Promise(fn);
    }

    /**
     * Calls predict given model info and inputs to predict on
     * @param {string|object}            model       If string, it is assumed to be model id. Otherwise, if object is given, it can have any of the following keys:
     *   @param {string}                   model.id          Model id
     *   @param {string}                   model.name        Model name
     *   @param {string}                   model.version     Model version
     *   @param {string}                   model.language    Model language (only for Clarifai's public models)
     *   @param {string}                   model.type        This can be "concept", "color", "embed", "facedetect", "cluster" or "blur"
     * @param {object[]|object|string}   inputs    An array of objects/object/string pointing to an image resource. A string can either be a url or base64 image bytes. Object keys explained below:
     *    @param {object}                  inputs[].image     Object with keys explained below:
     *       @param {string}                 inputs[].image.(url|base64)  Can be a publicly accessibly url or base64 string representing image bytes (required)
     * @param {boolean} isVideo  indicates if the input should be processed as a video (default false)
     * @return {Promise(response, error)} A Promise that is fulfilled with the API response or rejected with an error
     */

  }, {
    key: 'predict',
    value: function predict(model, inputs) {
      var _this3 = this;

      var config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      if (checkType(/Boolean/, config)) {
        console.warn('"isVideo" argument is deprecated, consider using the configuration object instead');
        config = {
          video: config
        };
      }
      if (model.language) {
        config.language = model.language;
      }
      return new Promise(function (resolve, reject) {
        _this3.initModel(model).then(function (modelObj) {
          modelObj.predict(inputs, config).then(resolve, reject).catch(reject);
        }, reject);
      });
    }

    /**
     * Calls train on a model and creates a new model version given model info
     * @param {string|object}            model       If string, it is assumed to be model id. Otherwise, if object is given, it can have any of the following keys:
     *   @param {string}                   model.id          Model id
     *   @param {string}                   model.name        Model name
     *   @param {string}                   model.version     Model version
     *   @param {string}                   model.type        This can be "concept", "color", "embed", "facedetect", "cluster" or "blur"
     * @param {boolean}                  sync        If true, this returns after model has completely trained. If false, this immediately returns default api response.
     * @return {Promise(Model, error)} A Promise that is fulfilled with a Model instance or rejected with an error
     */

  }, {
    key: 'train',
    value: function train(model) {
      var _this4 = this;

      var sync = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      return new Promise(function (resolve, reject) {
        _this4.initModel(model).then(function (model) {
          model.train(sync).then(resolve, reject).catch(reject);
        }, reject);
      });
    }

    /**
     *
     * @param {string|object}            model       If string, it is assumed to be model id. Otherwise, if object is given, it can have any of the following keys:
     *   @param {string}                   model.id          Model id
     *   @param {string}                   model.name        Model name
     *   @param {string}                   model.version     Model version
     *   @param {string}                   model.type        This can be "concept", "color", "embed", "facedetect", "cluster" or "blur"
     * @param {string} input A string pointing to an image resource. A string must be a url
     * @param {object} config A configuration object consisting of the following required keys
     *   @param {string} config.id The id of the feedback request
     *   @param {object} config.data The feedback data to be sent
     *   @param {object} config.info Meta data related to the feedback request
     */

  }, {
    key: 'feedback',
    value: function feedback(model, input, config) {
      var _this5 = this;

      return new Promise(function (resolve, reject) {
        _this5.initModel(model).then(function (model) {
          return model.feedback(input, config);
        }).then(function (d) {
          return resolve(d);
        }).catch(function (e) {
          return reject(e);
        });
      });
    }

    /**
     * Returns a version of the model specified by its id
     * @param {string|object}            model       If string, it is assumed to be model id. Otherwise, if object is given, it can have any of the following keys:
     *   @param {string}                   model.id          Model id
     *   @param {string}                   model.name        Model name
     *   @param {string}                   model.version     Model version
     *   @param {string}                   model.type        This can be "concept", "color", "embed", "facedetect", "cluster" or "blur"
     * @param {string}     versionId   The model's id
     * @return {Promise(response, error)} A Promise that is fulfilled with the API response or rejected with an error
     */

  }, {
    key: 'getVersion',
    value: function getVersion(model, versionId) {
      var _this6 = this;

      return new Promise(function (resolve, reject) {
        _this6.initModel(model).then(function (model) {
          model.getVersion(versionId).then(resolve, reject).catch(reject);
        }, reject);
      });
    }

    /**
     * Returns a list of versions of the model
     * @param {string|object}            model       If string, it is assumed to be model id. Otherwise, if object is given, it can have any of the following keys:
     *   @param {string}                   model.id          Model id
     *   @param {string}                   model.name        Model name
     *   @param {string}                   model.version     Model version
     *   @param {string}                   model.type        This can be "concept", "color", "embed", "facedetect", "cluster" or "blur"
     * @param {object}                   options     Object with keys explained below: (optional)
     *   @param {number}                   options.page        The page number (optional, default: 1)
     *   @param {number}                   options.perPage     Number of images to return per page (optional, default: 20)
     * @return {Promise(response, error)} A Promise that is fulfilled with the API response or rejected with an error
     */

  }, {
    key: 'getVersions',
    value: function getVersions(model) {
      var _this7 = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { page: 1, perPage: 20 };

      return new Promise(function (resolve, reject) {
        _this7.initModel(model).then(function (model) {
          model.getVersions().then(resolve, reject).catch(reject);
        }, reject);
      });
    }

    /**
     * Returns all the model's output info
     * @param {string|object}            model       If string, it is assumed to be model id. Otherwise, if object is given, it can have any of the following keys:
     *   @param {string}                   model.id          Model id
     *   @param {string}                   model.name        Model name
     *   @param {string}                   model.version     Model version
     *   @param {string}                   model.type        This can be "concept", "color", "embed", "facedetect", "cluster" or "blur"
     * @return {Promise(Model, error)} A Promise that is fulfilled with a Model instance or rejected with an error
     */

  }, {
    key: 'getOutputInfo',
    value: function getOutputInfo(model) {
      var _this8 = this;

      return new Promise(function (resolve, reject) {
        _this8.initModel(model).then(function (model) {
          model.getOutputInfo().then(resolve, reject).catch(reject);
        }, reject);
      });
    }

    /**
     * Returns all the models
     * @param {Object}     options     Object with keys explained below: (optional)
     *   @param {Number}     options.page        The page number (optional, default: 1)
     *   @param {Number}     options.perPage     Number of images to return per page (optional, default: 20)
     * @return {Promise(Models, error)} A Promise that is fulfilled with an instance of Models or rejected with an error
     */

  }, {
    key: 'list',
    value: function list() {
      var _this9 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { page: 1, perPage: 20 };

      var url = '' + this._config.basePath + MODELS_PATH;
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.get(url, {
            params: { 'per_page': options.perPage, 'page': options.page },
            headers: headers
          }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new Models(_this9._config, response.data.models));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }

    /**
     * Create a model
     * @param {string|object}                  model                                  If string, it is assumed to be the model id. Otherwise, if object is given, it can have any of the following keys:
     *   @param {string}                         model.id                               Model id
     *   @param {string}                         model.name                             Model name
     * @param {object[]|string[]|Concepts[]}   conceptsData                           List of objects with ids, concept id strings or an instance of Concepts object
     * @param {Object}                         options                                Object with keys explained below:
     *   @param {boolean}                        options.conceptsMutuallyExclusive      Do you expect to see more than one of the concepts in this model in the SAME image? Set to false (default) if so. Otherwise, set to true.
     *   @param {boolean}                        options.closedEnvironment              Do you expect to run the trained model on images that do not contain ANY of the concepts in the model? Set to false (default) if so. Otherwise, set to true.
     * @return {Promise(Model, error)} A Promise that is fulfilled with an instance of Model or rejected with an error
     */

  }, {
    key: 'create',
    value: function create(model) {
      var _this10 = this;

      var conceptsData = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var concepts = conceptsData instanceof Concepts ? conceptsData.toObject('id') : conceptsData.map(function (concept) {
        var val = concept;
        if (checkType(/String/, concept)) {
          val = { 'id': concept };
        }
        return val;
      });
      var modelObj = model;
      if (checkType(/String/, model)) {
        modelObj = { id: model, name: model };
      }
      if (modelObj.id === undefined) {
        throw ERRORS.paramsRequired('Model ID');
      }
      var url = '' + this._config.basePath + MODELS_PATH;
      var data = { model: modelObj };
      data['model']['output_info'] = {
        'data': {
          concepts: concepts
        },
        'output_config': {
          'concepts_mutually_exclusive': !!options.conceptsMutuallyExclusive,
          'closed_environment': !!options.closedEnvironment
        }
      };

      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.post(url, data, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new Model(_this10._config, response.data.model));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }

    /**
     * Returns a model specified by ID
     * @param {String}     id          The model's id
     * @return {Promise(Model, error)} A Promise that is fulfilled with an instance of Model or rejected with an error
     */

  }, {
    key: 'get',
    value: function get(id) {
      var _this11 = this;

      var url = '' + this._config.basePath + replaceVars(MODEL_PATH, [id]);
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.get(url, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new Model(_this11._config, response.data.model));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }

    /**
     * Update a model's or a list of models' output config or concepts
     * @param {object|object[]}      models                                 Can be a single model object or list of model objects with the following attrs:
     *   @param {string}               models.id                                    The id of the model to apply changes to (Required)
     *   @param {string}               models.name                                  The new name of the model to update with
     *   @param {boolean}              models.conceptsMutuallyExclusive             Do you expect to see more than one of the concepts in this model in the SAME image? Set to false (default) if so. Otherwise, set to true.
     *   @param {boolean}              models.closedEnvironment                     Do you expect to run the trained model on images that do not contain ANY of the concepts in the model? Set to false (default) if so. Otherwise, set to true.
     *   @param {object[]}             models.concepts                              An array of concept objects or string
     *     @param {object|string}        models.concepts[].concept                    If string is given, this is interpreted as concept id. Otherwise, if object is given, client expects the following attributes
     *       @param {string}             models.concepts[].concept.id                   The id of the concept to attach to the model
     *   @param {object[]}             models.action                                The action to perform on the given concepts. Possible values are 'merge', 'remove', or 'overwrite'. Default: 'merge'
     * @return {Promise(Models, error)} A Promise that is fulfilled with an instance of Models or rejected with an error
     */

  }, {
    key: 'update',
    value: function update(models) {
      var _this12 = this;

      var url = '' + this._config.basePath + MODELS_PATH;
      var modelsList = Array.isArray(models) ? models : [models];
      var data = { models: modelsList.map(formatModel) };
      data['action'] = models.action || 'merge';
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.patch(url, data, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new Models(_this12._config, response.data.models));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }

    /**
     * Update model by merging concepts
     * @param {object|object[]}      model                                 Can be a single model object or list of model objects with the following attrs:
     *   @param {string}               model.id                                    The id of the model to apply changes to (Required)
     *   @param {object[]}             model.concepts                              An array of concept objects or string
     *     @param {object|string}        model.concepts[].concept                    If string is given, this is interpreted as concept id. Otherwise, if object is given, client expects the following attributes
     *       @param {string}             model.concepts[].concept.id                   The id of the concept to attach to the model
     */

  }, {
    key: 'mergeConcepts',
    value: function mergeConcepts() {
      var model = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      model.action = 'merge';
      return this.update(model);
    }

    /**
     * Update model by removing concepts
     * @param {object|object[]}      model                                 Can be a single model object or list of model objects with the following attrs:
     *   @param {string}               model.id                                    The id of the model to apply changes to (Required)
     *   @param {object[]}             model.concepts                              An array of concept objects or string
     *     @param {object|string}        model.concepts[].concept                    If string is given, this is interpreted as concept id. Otherwise, if object is given, client expects the following attributes
     *       @param {string}             model.concepts[].concept.id                   The id of the concept to attach to the model
     */

  }, {
    key: 'deleteConcepts',
    value: function deleteConcepts() {
      var model = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      model.action = 'remove';
      return this.update(model);
    }

    /**
     * Update model by overwriting concepts
     * @param {object|object[]}      model                                 Can be a single model object or list of model objects with the following attrs:
     *   @param {string}               model.id                                    The id of the model to apply changes to (Required)
     *   @param {object[]}             model.concepts                              An array of concept objects or string
     *     @param {object|string}        model.concepts[].concept                    If string is given, this is interpreted as concept id. Otherwise, if object is given, client expects the following attributes
     *       @param {string}             model.concepts[].concept.id                   The id of the concept to attach to the model
     */

  }, {
    key: 'overwriteConcepts',
    value: function overwriteConcepts() {
      var model = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      model.action = 'overwrite';
      return this.update(model);
    }

    /**
     * Deletes all models (if no ids and versionId given) or a model (if given id) or a model version (if given id and verion id)
     * @param {String|String[]}      ids         Can be a single string or an array of strings representing the model ids
     * @param {String}               versionId   The model's version id
     * @return {Promise(response, error)} A Promise that is fulfilled with the API response or rejected with an error
     */

  }, {
    key: 'delete',
    value: function _delete(ids) {
      var versionId = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

      var request = void 0,
          url = void 0,
          data = void 0;
      var id = ids;

      if (checkType(/String/, ids) || checkType(/Array/, ids) && ids.length === 1) {
        if (versionId) {
          url = '' + this._config.basePath + replaceVars(MODEL_VERSION_PATH, [id, versionId]);
        } else {
          url = '' + this._config.basePath + replaceVars(MODEL_PATH, [id]);
        }
        request = wrapToken(this._config, function (headers) {
          return new Promise(function (resolve, reject) {
            axios.delete(url, { headers: headers }).then(function (response) {
              var data = clone(response.data);
              data.rawData = clone(response.data);
              resolve(data);
            }, reject);
          });
        });
      } else {
        if (!ids && !versionId) {
          url = '' + this._config.basePath + MODELS_PATH;
          data = { 'delete_all': true };
        } else if (!versionId && ids.length > 1) {
          url = '' + this._config.basePath + MODELS_PATH;
          data = { ids: ids };
        } else {
          throw ERRORS.INVALID_DELETE_ARGS;
        }
        request = wrapToken(this._config, function (headers) {
          return new Promise(function (resolve, reject) {
            axios({
              method: 'delete',
              url: url,
              data: data,
              headers: headers
            }).then(function (response) {
              var data = clone(response.data);
              data.rawData = clone(response.data);
              resolve(data);
            }, reject);
          });
        });
      }

      return request;
    }

    /**
     * Search for models by name or type
     * @param {String}     name        The model name
     * @param {String}     type        This can be "concept", "color", "embed", "facedetect", "cluster" or "blur"
     * @return {Promise(models, error)} A Promise that is fulfilled with an instance of Models or rejected with an error
     */

  }, {
    key: 'search',
    value: function search(name) {
      var _this13 = this;

      var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

      var url = '' + this._config.basePath + MODEL_SEARCH_PATH;
      return wrapToken(this._config, function (headers) {
        var params = {
          'model_query': {
            name: name,
            type: type
          }
        };
        return new Promise(function (resolve, reject) {
          axios.post(url, params, { headers: headers }).then(function (response) {
            if (isSuccess(response)) {
              resolve(new Models(_this13._config, response.data.models));
            } else {
              reject(response);
            }
          }, reject);
        });
      });
    }
  }]);

  return Models;
}();

module.exports = Models;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIk1vZGVscy5qcyJdLCJuYW1lcyI6WyJheGlvcyIsInJlcXVpcmUiLCJQcm9taXNlIiwiTW9kZWwiLCJDb25jZXB0cyIsIkFQSSIsIkVSUk9SUyIsInJlcGxhY2VWYXJzIiwiaXNTdWNjZXNzIiwiY2hlY2tUeXBlIiwiY2xvbmUiLCJ3cmFwVG9rZW4iLCJmb3JtYXRNb2RlbCIsIk1PREVMU19QQVRIIiwiTU9ERUxfUEFUSCIsIk1PREVMX1NFQVJDSF9QQVRIIiwiTU9ERUxfVkVSU0lPTl9QQVRIIiwiTW9kZWxzIiwiX2NvbmZpZyIsInJhd0RhdGEiLCJmb3JFYWNoIiwibW9kZWxEYXRhIiwiaW5kZXgiLCJsZW5ndGgiLCJtb2RlbCIsImRhdGEiLCJmbiIsImlkIiwicmVzb2x2ZSIsInJlamVjdCIsInNlYXJjaCIsIm5hbWUiLCJ0eXBlIiwidGhlbiIsIm1vZGVscyIsInZlcnNpb24iLCJmaWx0ZXIiLCJtb2RlbFZlcnNpb24iLCJjYXRjaCIsImlucHV0cyIsImNvbmZpZyIsImNvbnNvbGUiLCJ3YXJuIiwidmlkZW8iLCJsYW5ndWFnZSIsImluaXRNb2RlbCIsIm1vZGVsT2JqIiwicHJlZGljdCIsInN5bmMiLCJ0cmFpbiIsImlucHV0IiwiZmVlZGJhY2siLCJkIiwiZSIsInZlcnNpb25JZCIsImdldFZlcnNpb24iLCJvcHRpb25zIiwicGFnZSIsInBlclBhZ2UiLCJnZXRWZXJzaW9ucyIsImdldE91dHB1dEluZm8iLCJ1cmwiLCJiYXNlUGF0aCIsImhlYWRlcnMiLCJnZXQiLCJwYXJhbXMiLCJyZXNwb25zZSIsImNvbmNlcHRzRGF0YSIsImNvbmNlcHRzIiwidG9PYmplY3QiLCJtYXAiLCJjb25jZXB0IiwidmFsIiwidW5kZWZpbmVkIiwicGFyYW1zUmVxdWlyZWQiLCJjb25jZXB0c011dHVhbGx5RXhjbHVzaXZlIiwiY2xvc2VkRW52aXJvbm1lbnQiLCJwb3N0IiwibW9kZWxzTGlzdCIsIkFycmF5IiwiaXNBcnJheSIsImFjdGlvbiIsInBhdGNoIiwidXBkYXRlIiwiaWRzIiwicmVxdWVzdCIsImRlbGV0ZSIsIklOVkFMSURfREVMRVRFX0FSR1MiLCJtZXRob2QiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFVBQVVELFFBQVEsU0FBUixDQUFkO0FBQ0EsSUFBSUUsUUFBUUYsUUFBUSxTQUFSLENBQVo7QUFDQSxJQUFJRyxXQUFXSCxRQUFRLFlBQVIsQ0FBZjs7ZUFDaUNBLFFBQVEsYUFBUixDO0lBQTVCSSxHLFlBQUFBLEc7SUFBS0MsTSxZQUFBQSxNO0lBQVFDLFcsWUFBQUEsVzs7Z0JBQ2tCTixRQUFRLFdBQVIsQztJQUEvQk8sUyxhQUFBQSxTO0lBQVdDLFMsYUFBQUEsUztJQUFXQyxLLGFBQUFBLEs7O2dCQUNJVCxRQUFRLFNBQVIsQztJQUExQlUsUyxhQUFBQSxTO0lBQVdDLFcsYUFBQUEsVzs7SUFDWEMsVyxHQUFrRVIsRyxDQUFsRVEsVztJQUFhQyxVLEdBQXFEVCxHLENBQXJEUyxVO0lBQVlDLGlCLEdBQXlDVixHLENBQXpDVSxpQjtJQUFtQkMsa0IsR0FBc0JYLEcsQ0FBdEJXLGtCOztBQUVqRDs7Ozs7SUFJTUMsTTtBQUNKLGtCQUFZQyxPQUFaLEVBQW1DO0FBQUE7O0FBQUEsUUFBZEMsT0FBYyx1RUFBSixFQUFJOztBQUFBOztBQUNqQyxTQUFLRCxPQUFMLEdBQWVBLE9BQWY7QUFDQSxTQUFLQyxPQUFMLEdBQWVBLE9BQWY7QUFDQUEsWUFBUUMsT0FBUixDQUFnQixVQUFDQyxTQUFELEVBQVlDLEtBQVosRUFBc0I7QUFDcEMsWUFBS0EsS0FBTCxJQUFjLElBQUluQixLQUFKLENBQVUsTUFBS2UsT0FBZixFQUF3QkcsU0FBeEIsQ0FBZDtBQUNELEtBRkQ7QUFHQSxTQUFLRSxNQUFMLEdBQWNKLFFBQVFJLE1BQXRCO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7OEJBU1VDLEssRUFBTztBQUFBOztBQUNmLFVBQUlDLE9BQU8sRUFBWDtBQUNBLFVB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WUFBSUUsU0FBUztBQUNYLHlCQUFlO0FBQ2JsQyxzQkFEYTtBQUViQztBQUZhO0FBREosU0FBYjtBQU1BLGVBQU8sSUFBSTlCLE9BQUosQ0FBWSxVQUFDMEIsT0FBRCxFQUFVQyxNQUFWLEVBQXFCO0FBQ3RDN0IsZ0JBQU02RSxJQUFOLENBQVdoQixHQUFYLEVBQWdCSSxNQUFoQixFQUF3QixFQUFDRixnQkFBRCxFQUF4QixFQUFtQzlCLElBQW5DLENBQXdDLFVBQUNpQyxRQUFELEVBQWM7QUFDcEQsZ0JBQUkxRCxVQUFVMEQsUUFBVixDQUFKLEVBQXlCO0FBQ3ZCdEMsc0JBQVEsSUFBSVgsTUFBSixDQUFXLFFBQUtDLE9BQWhCLEVBQXlCZ0QsU0FBU3pDLElBQVQsQ0FBY1MsTUFBdkMsQ0FBUjtBQUNELGFBRkQsTUFFTztBQUNMTCxxQkFBT3FDLFFBQVA7QUFDRDtBQUNGLFdBTkQsRUFNR3JDLE1BTkg7QUFPRCxTQVJNLENBQVA7QUFTRCxPQWhCTSxDQUFQO0FBaUJEOzs7Ozs7QUFHSDRELE9BQU9DLE9BQVAsR0FBaUJ6RSxNQUFqQiIsImZpbGUiOiJNb2RlbHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgYXhpb3MgPSByZXF1aXJlKCdheGlvcycpO1xubGV0IFByb21pc2UgPSByZXF1aXJlKCdwcm9taXNlJyk7XG5sZXQgTW9kZWwgPSByZXF1aXJlKCcuL01vZGVsJyk7XG5sZXQgQ29uY2VwdHMgPSByZXF1aXJlKCcuL0NvbmNlcHRzJyk7XG5sZXQge0FQSSwgRVJST1JTLCByZXBsYWNlVmFyc30gPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xubGV0IHtpc1N1Y2Nlc3MsIGNoZWNrVHlwZSwgY2xvbmV9ID0gcmVxdWlyZSgnLi9oZWxwZXJzJyk7XG5sZXQge3dyYXBUb2tlbiwgZm9ybWF0TW9kZWx9ID0gcmVxdWlyZSgnLi91dGlscycpO1xubGV0IHtNT0RFTFNfUEFUSCwgTU9ERUxfUEFUSCwgTU9ERUxfU0VBUkNIX1BBVEgsIE1PREVMX1ZFUlNJT05fUEFUSH0gPSBBUEk7XG5cbi8qKlxuICogY2xhc3MgcmVwcmVzZW50aW5nIGEgY29sbGVjdGlvbiBvZiBtb2RlbHNcbiAqIEBjbGFzc1xuICovXG5jbGFzcyBNb2RlbHMge1xuICBjb25zdHJ1Y3RvcihfY29uZmlnLCByYXdEYXRhID0gW10pIHtcbiAgICB0aGlzLl9jb25maWcgPSBfY29uZmlnO1xuICAgIHRoaXMucmF3RGF0YSA9IHJhd0RhdGE7XG4gICAgcmF3RGF0YS5mb3JFYWNoKChtb2RlbERhdGEsIGluZGV4KSA9PiB7XG4gICAgICB0aGlzW2luZGV4XSA9IG5ldyBNb2RlbCh0aGlzLl9jb25maWcsIG1vZGVsRGF0YSk7XG4gICAgfSk7XG4gICAgdGhpcy5sZW5ndGggPSByYXdEYXRhLmxlbmd0aDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgTW9kZWwgaW5zdGFuY2UgZ2l2ZW4gbW9kZWwgaWQgb3IgbmFtZS4gSXQgd2lsbCBjYWxsIHNlYXJjaCBpZiBuYW1lIGlzIGdpdmVuLlxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9ICAgIG1vZGVsICAgICAgIElmIHN0cmluZywgaXQgaXMgYXNzdW1lZCB0byBiZSBtb2RlbCBpZC4gT3RoZXJ3aXNlLCBpZiBvYmplY3QgaXMgZ2l2ZW4sIGl0IGNhbiBoYXZlIGFueSBvZiB0aGUgZm9sbG93aW5nIGtleXM6XG4gICAqICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICBtb2RlbC5pZCAgICAgICAgICBNb2RlbCBpZFxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgbW9kZWwubmFtZSAgICAgICAgTW9kZWwgbmFtZVxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgbW9kZWwudmVyc2lvbiAgICAgTW9kZWwgdmVyc2lvblxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgbW9kZWwudHlwZSAgICAgICAgVGhpcyBjYW4gYmUgXCJjb25jZXB0XCIsIFwiY29sb3JcIiwgXCJlbWJlZFwiLCBcImZhY2VkZXRlY3RcIiwgXCJjbHVzdGVyXCIgb3IgXCJibHVyXCJcbiAgICogQHJldHVybiB7UHJvbWlzZShNb2RlbCwgZXJyb3IpfSBBIFByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2l0aCBhIE1vZGVsIGluc3RhbmNlIG9yIHJlamVjdGVkIHdpdGggYW4gZXJyb3JcbiAgICovXG4gIGluaXRNb2RlbChtb2RlbCkge1xuICAgIGxldCBkYXRhID0ge307XG4gICAgbGV0IGZuO1xuICAgIGlmIChjaGVja1R5cGUoL1N0cmluZy8sIG1vZGVsKSkge1xuICAgICAgZGF0YS5pZCA9IG1vZGVsO1xuICAgIH0gZWxzZSB7XG4gICAgICBkYXRhID0gbW9kZWw7XG4gICAgfVxuICAgIGlmIChkYXRhLmlkKSB7XG4gICAgICBmbiA9IChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgcmVzb2x2ZShuZXcgTW9kZWwodGhpcy5fY29uZmlnLCBkYXRhKSk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBmbiA9IChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgdGhpcy5zZWFyY2goZGF0YS5uYW1lLCBkYXRhLnR5cGUpLnRoZW4oKG1vZGVscykgPT4ge1xuICAgICAgICAgIGlmIChkYXRhLnZlcnNpb24pIHtcbiAgICAgICAgICAgIHJlc29sdmUobW9kZWxzLnJhd0RhdGEuZmlsdGVyKChtb2RlbCkgPT4gbW9kZWwubW9kZWxWZXJzaW9uLmlkID09PSBkYXRhLnZlcnNpb24pKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzb2x2ZShtb2RlbHNbMF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgcmVqZWN0KS5jYXRjaChyZWplY3QpO1xuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZuKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxscyBwcmVkaWN0IGdpdmVuIG1vZGVsIGluZm8gYW5kIGlucHV0cyB0byBwcmVkaWN0IG9uXG4gICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gICAgICAgICAgICBtb2RlbCAgICAgICBJZiBzdHJpbmcsIGl0IGlzIGFzc3VtZWQgdG8gYmUgbW9kZWwgaWQuIE90aGVyd2lzZSwgaWYgb2JqZWN0IGlzIGdpdmVuLCBpdCBjYW4gaGF2ZSBhbnkgb2YgdGhlIGZvbGxvd2luZyBrZXlzOlxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICAgICAgICBtb2RlbC5pZCAgICAgICAgICBNb2RlbCBpZFxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICAgICAgICBtb2RlbC5uYW1lICAgICAgICBNb2RlbCBuYW1lXG4gICAqICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICAgICAgICAgIG1vZGVsLnZlcnNpb24gICAgIE1vZGVsIHZlcnNpb25cbiAgICogICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICAgICAgbW9kZWwubGFuZ3VhZ2UgICAgTW9kZWwgbGFuZ3VhZ2UgKG9ubHkgZm9yIENsYXJpZmFpJ3MgcHVibGljIG1vZGVscylcbiAgICogICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICAgICAgbW9kZWwudHlwZSAgICAgICAgVGhpcyBjYW4gYmUgXCJjb25jZXB0XCIsIFwiY29sb3JcIiwgXCJlbWJlZFwiLCBcImZhY2VkZXRlY3RcIiwgXCJjbHVzdGVyXCIgb3IgXCJibHVyXCJcbiAgICogQHBhcmFtIHtvYmplY3RbXXxvYmplY3R8c3RyaW5nfSAgIGlucHV0cyAgICBBbiBhcnJheSBvZiBvYmplY3RzL29iamVjdC9zdHJpbmcgcG9pbnRpbmcgdG8gYW4gaW1hZ2UgcmVzb3VyY2UuIEEgc3RyaW5nIGNhbiBlaXRoZXIgYmUgYSB1cmwgb3IgYmFzZTY0IGltYWdlIGJ5dGVzLiBPYmplY3Qga2V5cyBleHBsYWluZWQgYmVsb3c6XG4gICAqICAgIEBwYXJhbSB7b2JqZWN0fSAgICAgICAgICAgICAgICAgIGlucHV0c1tdLmltYWdlICAgICBPYmplY3Qgd2l0aCBrZXlzIGV4cGxhaW5lZCBiZWxvdzpcbiAgICogICAgICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICAgICAgICBpbnB1dHNbXS5pbWFnZS4odXJsfGJhc2U2NCkgIENhbiBiZSBhIHB1YmxpY2x5IGFjY2Vzc2libHkgdXJsIG9yIGJhc2U2NCBzdHJpbmcgcmVwcmVzZW50aW5nIGltYWdlIGJ5dGVzIChyZXF1aXJlZClcbiAgICogQHBhcmFtIHtib29sZWFufSBpc1ZpZGVvICBpbmRpY2F0ZXMgaWYgdGhlIGlucHV0IHNob3VsZCBiZSBwcm9jZXNzZWQgYXMgYSB2aWRlbyAoZGVmYXVsdCBmYWxzZSlcbiAgICogQHJldHVybiB7UHJvbWlzZShyZXNwb25zZSwgZXJyb3IpfSBBIFByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2l0aCB0aGUgQVBJIHJlc3BvbnNlIG9yIHJlamVjdGVkIHdpdGggYW4gZXJyb3JcbiAgICovXG4gIHByZWRpY3QobW9kZWwsIGlucHV0cywgY29uZmlnID0ge30pIHtcbiAgICBpZiAoY2hlY2tUeXBlKC9Cb29sZWFuLywgY29uZmlnKSkge1xuICAgICAgY29uc29sZS53YXJuKCdcImlzVmlkZW9cIiBhcmd1bWVudCBpcyBkZXByZWNhdGVkLCBjb25zaWRlciB1c2luZyB0aGUgY29uZmlndXJhdGlvbiBvYmplY3QgaW5zdGVhZCcpO1xuICAgICAgY29uZmlnID0ge1xuICAgICAgICB2aWRlbzogY29uZmlnXG4gICAgICB9O1xuICAgIH1cbiAgICBpZiAobW9kZWwubGFuZ3VhZ2UpIHtcbiAgICAgIGNvbmZpZy5sYW5ndWFnZSA9IG1vZGVsLmxhbmd1YWdlO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5pbml0TW9kZWwobW9kZWwpLnRoZW4oKG1vZGVsT2JqKSA9PiB7XG4gICAgICAgIG1vZGVsT2JqLnByZWRpY3QoaW5wdXRzLCBjb25maWcpXG4gICAgICAgICAgLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KVxuICAgICAgICAgIC5jYXRjaChyZWplY3QpO1xuICAgICAgfSwgcmVqZWN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxscyB0cmFpbiBvbiBhIG1vZGVsIGFuZCBjcmVhdGVzIGEgbmV3IG1vZGVsIHZlcnNpb24gZ2l2ZW4gbW9kZWwgaW5mb1xuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9ICAgICAgICAgICAgbW9kZWwgICAgICAgSWYgc3RyaW5nLCBpdCBpcyBhc3N1bWVkIHRvIGJlIG1vZGVsIGlkLiBPdGhlcndpc2UsIGlmIG9iamVjdCBpcyBnaXZlbiwgaXQgY2FuIGhhdmUgYW55IG9mIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgICogICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICAgICAgbW9kZWwuaWQgICAgICAgICAgTW9kZWwgaWRcbiAgICogICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICAgICAgbW9kZWwubmFtZSAgICAgICAgTW9kZWwgbmFtZVxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICAgICAgICBtb2RlbC52ZXJzaW9uICAgICBNb2RlbCB2ZXJzaW9uXG4gICAqICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICAgICAgICAgIG1vZGVsLnR5cGUgICAgICAgIFRoaXMgY2FuIGJlIFwiY29uY2VwdFwiLCBcImNvbG9yXCIsIFwiZW1iZWRcIiwgXCJmYWNlZGV0ZWN0XCIsIFwiY2x1c3RlclwiIG9yIFwiYmx1clwiXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gICAgICAgICAgICAgICAgICBzeW5jICAgICAgICBJZiB0cnVlLCB0aGlzIHJldHVybnMgYWZ0ZXIgbW9kZWwgaGFzIGNvbXBsZXRlbHkgdHJhaW5lZC4gSWYgZmFsc2UsIHRoaXMgaW1tZWRpYXRlbHkgcmV0dXJucyBkZWZhdWx0IGFwaSByZXNwb25zZS5cbiAgICogQHJldHVybiB7UHJvbWlzZShNb2RlbCwgZXJyb3IpfSBBIFByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2l0aCBhIE1vZGVsIGluc3RhbmNlIG9yIHJlamVjdGVkIHdpdGggYW4gZXJyb3JcbiAgICovXG4gIHRyYWluKG1vZGVsLCBzeW5jID0gZmFsc2UpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5pbml0TW9kZWwobW9kZWwpLnRoZW4oKG1vZGVsKSA9PiB7XG4gICAgICAgIG1vZGVsLnRyYWluKHN5bmMpXG4gICAgICAgICAgLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KVxuICAgICAgICAgIC5jYXRjaChyZWplY3QpO1xuICAgICAgfSwgcmVqZWN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9ICAgICAgICAgICAgbW9kZWwgICAgICAgSWYgc3RyaW5nLCBpdCBpcyBhc3N1bWVkIHRvIGJlIG1vZGVsIGlkLiBPdGhlcndpc2UsIGlmIG9iamVjdCBpcyBnaXZlbiwgaXQgY2FuIGhhdmUgYW55IG9mIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgICogICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICAgICAgbW9kZWwuaWQgICAgICAgICAgTW9kZWwgaWRcbiAgICogICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICAgICAgbW9kZWwubmFtZSAgICAgICAgTW9kZWwgbmFtZVxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICAgICAgICBtb2RlbC52ZXJzaW9uICAgICBNb2RlbCB2ZXJzaW9uXG4gICAqICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICAgICAgICAgIG1vZGVsLnR5cGUgICAgICAgIFRoaXMgY2FuIGJlIFwiY29uY2VwdFwiLCBcImNvbG9yXCIsIFwiZW1iZWRcIiwgXCJmYWNlZGV0ZWN0XCIsIFwiY2x1c3RlclwiIG9yIFwiYmx1clwiXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpbnB1dCBBIHN0cmluZyBwb2ludGluZyB0byBhbiBpbWFnZSByZXNvdXJjZS4gQSBzdHJpbmcgbXVzdCBiZSBhIHVybFxuICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIEEgY29uZmlndXJhdGlvbiBvYmplY3QgY29uc2lzdGluZyBvZiB0aGUgZm9sbG93aW5nIHJlcXVpcmVkIGtleXNcbiAgICogICBAcGFyYW0ge3N0cmluZ30gY29uZmlnLmlkIFRoZSBpZCBvZiB0aGUgZmVlZGJhY2sgcmVxdWVzdFxuICAgKiAgIEBwYXJhbSB7b2JqZWN0fSBjb25maWcuZGF0YSBUaGUgZmVlZGJhY2sgZGF0YSB0byBiZSBzZW50XG4gICAqICAgQHBhcmFtIHtvYmplY3R9IGNvbmZpZy5pbmZvIE1ldGEgZGF0YSByZWxhdGVkIHRvIHRoZSBmZWVkYmFjayByZXF1ZXN0XG4gICAqL1xuICBmZWVkYmFjayhtb2RlbCwgaW5wdXQsIGNvbmZpZykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLmluaXRNb2RlbChtb2RlbClcbiAgICAgICAgLnRoZW4obW9kZWwgPT4ge1xuICAgICAgICAgIHJldHVybiBtb2RlbC5mZWVkYmFjayhpbnB1dCwgY29uZmlnKTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oZCA9PiByZXNvbHZlKGQpKVxuICAgICAgICAuY2F0Y2goZSA9PiByZWplY3QoZSkpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSB2ZXJzaW9uIG9mIHRoZSBtb2RlbCBzcGVjaWZpZWQgYnkgaXRzIGlkXG4gICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gICAgICAgICAgICBtb2RlbCAgICAgICBJZiBzdHJpbmcsIGl0IGlzIGFzc3VtZWQgdG8gYmUgbW9kZWwgaWQuIE90aGVyd2lzZSwgaWYgb2JqZWN0IGlzIGdpdmVuLCBpdCBjYW4gaGF2ZSBhbnkgb2YgdGhlIGZvbGxvd2luZyBrZXlzOlxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICAgICAgICBtb2RlbC5pZCAgICAgICAgICBNb2RlbCBpZFxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICAgICAgICBtb2RlbC5uYW1lICAgICAgICBNb2RlbCBuYW1lXG4gICAqICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICAgICAgICAgIG1vZGVsLnZlcnNpb24gICAgIE1vZGVsIHZlcnNpb25cbiAgICogICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICAgICAgbW9kZWwudHlwZSAgICAgICAgVGhpcyBjYW4gYmUgXCJjb25jZXB0XCIsIFwiY29sb3JcIiwgXCJlbWJlZFwiLCBcImZhY2VkZXRlY3RcIiwgXCJjbHVzdGVyXCIgb3IgXCJibHVyXCJcbiAgICogQHBhcmFtIHtzdHJpbmd9ICAgICB2ZXJzaW9uSWQgICBUaGUgbW9kZWwncyBpZFxuICAgKiBAcmV0dXJuIHtQcm9taXNlKHJlc3BvbnNlLCBlcnJvcil9IEEgUHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aXRoIHRoZSBBUEkgcmVzcG9uc2Ugb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgZ2V0VmVyc2lvbihtb2RlbCwgdmVyc2lvbklkKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMuaW5pdE1vZGVsKG1vZGVsKS50aGVuKChtb2RlbCkgPT4ge1xuICAgICAgICBtb2RlbC5nZXRWZXJzaW9uKHZlcnNpb25JZClcbiAgICAgICAgICAudGhlbihyZXNvbHZlLCByZWplY3QpXG4gICAgICAgICAgLmNhdGNoKHJlamVjdCk7XG4gICAgICB9LCByZWplY3QpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBsaXN0IG9mIHZlcnNpb25zIG9mIHRoZSBtb2RlbFxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9ICAgICAgICAgICAgbW9kZWwgICAgICAgSWYgc3RyaW5nLCBpdCBpcyBhc3N1bWVkIHRvIGJlIG1vZGVsIGlkLiBPdGhlcndpc2UsIGlmIG9iamVjdCBpcyBnaXZlbiwgaXQgY2FuIGhhdmUgYW55IG9mIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgICogICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICAgICAgbW9kZWwuaWQgICAgICAgICAgTW9kZWwgaWRcbiAgICogICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICAgICAgbW9kZWwubmFtZSAgICAgICAgTW9kZWwgbmFtZVxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICAgICAgICBtb2RlbC52ZXJzaW9uICAgICBNb2RlbCB2ZXJzaW9uXG4gICAqICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICAgICAgICAgIG1vZGVsLnR5cGUgICAgICAgIFRoaXMgY2FuIGJlIFwiY29uY2VwdFwiLCBcImNvbG9yXCIsIFwiZW1iZWRcIiwgXCJmYWNlZGV0ZWN0XCIsIFwiY2x1c3RlclwiIG9yIFwiYmx1clwiXG4gICAqIEBwYXJhbSB7b2JqZWN0fSAgICAgICAgICAgICAgICAgICBvcHRpb25zICAgICBPYmplY3Qgd2l0aCBrZXlzIGV4cGxhaW5lZCBiZWxvdzogKG9wdGlvbmFsKVxuICAgKiAgIEBwYXJhbSB7bnVtYmVyfSAgICAgICAgICAgICAgICAgICBvcHRpb25zLnBhZ2UgICAgICAgIFRoZSBwYWdlIG51bWJlciAob3B0aW9uYWwsIGRlZmF1bHQ6IDEpXG4gICAqICAgQHBhcmFtIHtudW1iZXJ9ICAgICAgICAgICAgICAgICAgIG9wdGlvbnMucGVyUGFnZSAgICAgTnVtYmVyIG9mIGltYWdlcyB0byByZXR1cm4gcGVyIHBhZ2UgKG9wdGlvbmFsLCBkZWZhdWx0OiAyMClcbiAgICogQHJldHVybiB7UHJvbWlzZShyZXNwb25zZSwgZXJyb3IpfSBBIFByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2l0aCB0aGUgQVBJIHJlc3BvbnNlIG9yIHJlamVjdGVkIHdpdGggYW4gZXJyb3JcbiAgICovXG4gIGdldFZlcnNpb25zKG1vZGVsLCBvcHRpb25zID0ge3BhZ2U6IDEsIHBlclBhZ2U6IDIwfSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLmluaXRNb2RlbChtb2RlbCkudGhlbigobW9kZWwpID0+IHtcbiAgICAgICAgbW9kZWwuZ2V0VmVyc2lvbnMoKVxuICAgICAgICAgIC50aGVuKHJlc29sdmUsIHJlamVjdClcbiAgICAgICAgICAuY2F0Y2gocmVqZWN0KTtcbiAgICAgIH0sIHJlamVjdCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbGwgdGhlIG1vZGVsJ3Mgb3V0cHV0IGluZm9cbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSAgICAgICAgICAgIG1vZGVsICAgICAgIElmIHN0cmluZywgaXQgaXMgYXNzdW1lZCB0byBiZSBtb2RlbCBpZC4gT3RoZXJ3aXNlLCBpZiBvYmplY3QgaXMgZ2l2ZW4sIGl0IGNhbiBoYXZlIGFueSBvZiB0aGUgZm9sbG93aW5nIGtleXM6XG4gICAqICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICAgICAgICAgIG1vZGVsLmlkICAgICAgICAgIE1vZGVsIGlkXG4gICAqICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICAgICAgICAgIG1vZGVsLm5hbWUgICAgICAgIE1vZGVsIG5hbWVcbiAgICogICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICAgICAgbW9kZWwudmVyc2lvbiAgICAgTW9kZWwgdmVyc2lvblxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICAgICAgICBtb2RlbC50eXBlICAgICAgICBUaGlzIGNhbiBiZSBcImNvbmNlcHRcIiwgXCJjb2xvclwiLCBcImVtYmVkXCIsIFwiZmFjZWRldGVjdFwiLCBcImNsdXN0ZXJcIiBvciBcImJsdXJcIlxuICAgKiBAcmV0dXJuIHtQcm9taXNlKE1vZGVsLCBlcnJvcil9IEEgUHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aXRoIGEgTW9kZWwgaW5zdGFuY2Ugb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgZ2V0T3V0cHV0SW5mbyhtb2RlbCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLmluaXRNb2RlbChtb2RlbCkudGhlbigobW9kZWwpID0+IHtcbiAgICAgICAgbW9kZWwuZ2V0T3V0cHV0SW5mbygpXG4gICAgICAgICAgLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KVxuICAgICAgICAgIC5jYXRjaChyZWplY3QpO1xuICAgICAgfSwgcmVqZWN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFsbCB0aGUgbW9kZWxzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAgICAgb3B0aW9ucyAgICAgT2JqZWN0IHdpdGgga2V5cyBleHBsYWluZWQgYmVsb3c6IChvcHRpb25hbClcbiAgICogICBAcGFyYW0ge051bWJlcn0gICAgIG9wdGlvbnMucGFnZSAgICAgICAgVGhlIHBhZ2UgbnVtYmVyIChvcHRpb25hbCwgZGVmYXVsdDogMSlcbiAgICogICBAcGFyYW0ge051bWJlcn0gICAgIG9wdGlvbnMucGVyUGFnZSAgICAgTnVtYmVyIG9mIGltYWdlcyB0byByZXR1cm4gcGVyIHBhZ2UgKG9wdGlvbmFsLCBkZWZhdWx0OiAyMClcbiAgICogQHJldHVybiB7UHJvbWlzZShNb2RlbHMsIGVycm9yKX0gQSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdpdGggYW4gaW5zdGFuY2Ugb2YgTW9kZWxzIG9yIHJlamVjdGVkIHdpdGggYW4gZXJyb3JcbiAgICovXG4gIGxpc3Qob3B0aW9ucyA9IHtwYWdlOiAxLCBwZXJQYWdlOiAyMH0pIHtcbiAgICBsZXQgdXJsID0gYCR7dGhpcy5fY29uZmlnLmJhc2VQYXRofSR7TU9ERUxTX1BBVEh9YDtcbiAgICByZXR1cm4gd3JhcFRva2VuKHRoaXMuX2NvbmZpZywgKGhlYWRlcnMpID0+IHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGF4aW9zLmdldCh1cmwsIHtcbiAgICAgICAgICBwYXJhbXM6IHsncGVyX3BhZ2UnOiBvcHRpb25zLnBlclBhZ2UsICdwYWdlJzogb3B0aW9ucy5wYWdlfSxcbiAgICAgICAgICBoZWFkZXJzXG4gICAgICAgIH0pLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgaWYgKGlzU3VjY2VzcyhyZXNwb25zZSkpIHtcbiAgICAgICAgICAgIHJlc29sdmUobmV3IE1vZGVscyh0aGlzLl9jb25maWcsIHJlc3BvbnNlLmRhdGEubW9kZWxzKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCByZWplY3QpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbW9kZWxcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSAgICAgICAgICAgICAgICAgIG1vZGVsICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIElmIHN0cmluZywgaXQgaXMgYXNzdW1lZCB0byBiZSB0aGUgbW9kZWwgaWQuIE90aGVyd2lzZSwgaWYgb2JqZWN0IGlzIGdpdmVuLCBpdCBjYW4gaGF2ZSBhbnkgb2YgdGhlIGZvbGxvd2luZyBrZXlzOlxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICAgICAgICAgICAgICBtb2RlbC5pZCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNb2RlbCBpZFxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICAgICAgICAgICAgICBtb2RlbC5uYW1lICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNb2RlbCBuYW1lXG4gICAqIEBwYXJhbSB7b2JqZWN0W118c3RyaW5nW118Q29uY2VwdHNbXX0gICBjb25jZXB0c0RhdGEgICAgICAgICAgICAgICAgICAgICAgICAgICBMaXN0IG9mIG9iamVjdHMgd2l0aCBpZHMsIGNvbmNlcHQgaWQgc3RyaW5ncyBvciBhbiBpbnN0YW5jZSBvZiBDb25jZXB0cyBvYmplY3RcbiAgICogQHBhcmFtIHtPYmplY3R9ICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdCB3aXRoIGtleXMgZXhwbGFpbmVkIGJlbG93OlxuICAgKiAgIEBwYXJhbSB7Ym9vbGVhbn0gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmNvbmNlcHRzTXV0dWFsbHlFeGNsdXNpdmUgICAgICBEbyB5b3UgZXhwZWN0IHRvIHNlZSBtb3JlIHRoYW4gb25lIG9mIHRoZSBjb25jZXB0cyBpbiB0aGlzIG1vZGVsIGluIHRoZSBTQU1FIGltYWdlPyBTZXQgdG8gZmFsc2UgKGRlZmF1bHQpIGlmIHNvLiBPdGhlcndpc2UsIHNldCB0byB0cnVlLlxuICAgKiAgIEBwYXJhbSB7Ym9vbGVhbn0gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmNsb3NlZEVudmlyb25tZW50ICAgICAgICAgICAgICBEbyB5b3UgZXhwZWN0IHRvIHJ1biB0aGUgdHJhaW5lZCBtb2RlbCBvbiBpbWFnZXMgdGhhdCBkbyBub3QgY29udGFpbiBBTlkgb2YgdGhlIGNvbmNlcHRzIGluIHRoZSBtb2RlbD8gU2V0IHRvIGZhbHNlIChkZWZhdWx0KSBpZiBzby4gT3RoZXJ3aXNlLCBzZXQgdG8gdHJ1ZS5cbiAgICogQHJldHVybiB7UHJvbWlzZShNb2RlbCwgZXJyb3IpfSBBIFByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2l0aCBhbiBpbnN0YW5jZSBvZiBNb2RlbCBvciByZWplY3RlZCB3aXRoIGFuIGVycm9yXG4gICAqL1xuICBjcmVhdGUobW9kZWwsIGNvbmNlcHRzRGF0YSA9IFtdLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgY29uY2VwdHMgPSBjb25jZXB0c0RhdGEgaW5zdGFuY2VvZiBDb25jZXB0cyA/XG4gICAgICBjb25jZXB0c0RhdGEudG9PYmplY3QoJ2lkJykgOlxuICAgICAgY29uY2VwdHNEYXRhLm1hcCgoY29uY2VwdCkgPT4ge1xuICAgICAgICBsZXQgdmFsID0gY29uY2VwdDtcbiAgICAgICAgaWYgKGNoZWNrVHlwZSgvU3RyaW5nLywgY29uY2VwdCkpIHtcbiAgICAgICAgICB2YWwgPSB7J2lkJzogY29uY2VwdH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbDtcbiAgICAgIH0pO1xuICAgIGxldCBtb2RlbE9iaiA9IG1vZGVsO1xuICAgIGlmIChjaGVja1R5cGUoL1N0cmluZy8sIG1vZGVsKSkge1xuICAgICAgbW9kZWxPYmogPSB7aWQ6IG1vZGVsLCBuYW1lOiBtb2RlbH07XG4gICAgfVxuICAgIGlmIChtb2RlbE9iai5pZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBFUlJPUlMucGFyYW1zUmVxdWlyZWQoJ01vZGVsIElEJyk7XG4gICAgfVxuICAgIGxldCB1cmwgPSBgJHt0aGlzLl9jb25maWcuYmFzZVBhdGh9JHtNT0RFTFNfUEFUSH1gO1xuICAgIGxldCBkYXRhID0ge21vZGVsOiBtb2RlbE9ian07XG4gICAgZGF0YVsnbW9kZWwnXVsnb3V0cHV0X2luZm8nXSA9IHtcbiAgICAgICdkYXRhJzoge1xuICAgICAgICBjb25jZXB0c1xuICAgICAgfSxcbiAgICAgICdvdXRwdXRfY29uZmlnJzoge1xuICAgICAgICAnY29uY2VwdHNfbXV0dWFsbHlfZXhjbHVzaXZlJzogISFvcHRpb25zLmNvbmNlcHRzTXV0dWFsbHlFeGNsdXNpdmUsXG4gICAgICAgICdjbG9zZWRfZW52aXJvbm1lbnQnOiAhIW9wdGlvbnMuY2xvc2VkRW52aXJvbm1lbnRcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIHdyYXBUb2tlbih0aGlzLl9jb25maWcsIChoZWFkZXJzKSA9PiB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBheGlvcy5wb3N0KHVybCwgZGF0YSwge2hlYWRlcnN9KS50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgIGlmIChpc1N1Y2Nlc3MocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICByZXNvbHZlKG5ldyBNb2RlbCh0aGlzLl9jb25maWcsIHJlc3BvbnNlLmRhdGEubW9kZWwpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KHJlc3BvbnNlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIHJlamVjdCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgbW9kZWwgc3BlY2lmaWVkIGJ5IElEXG4gICAqIEBwYXJhbSB7U3RyaW5nfSAgICAgaWQgICAgICAgICAgVGhlIG1vZGVsJ3MgaWRcbiAgICogQHJldHVybiB7UHJvbWlzZShNb2RlbCwgZXJyb3IpfSBBIFByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2l0aCBhbiBpbnN0YW5jZSBvZiBNb2RlbCBvciByZWplY3RlZCB3aXRoIGFuIGVycm9yXG4gICAqL1xuICBnZXQoaWQpIHtcbiAgICBsZXQgdXJsID0gYCR7dGhpcy5fY29uZmlnLmJhc2VQYXRofSR7cmVwbGFjZVZhcnMoTU9ERUxfUEFUSCwgW2lkXSl9YDtcbiAgICByZXR1cm4gd3JhcFRva2VuKHRoaXMuX2NvbmZpZywgKGhlYWRlcnMpID0+IHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGF4aW9zLmdldCh1cmwsIHtoZWFkZXJzfSkudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICBpZiAoaXNTdWNjZXNzKHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgcmVzb2x2ZShuZXcgTW9kZWwodGhpcy5fY29uZmlnLCByZXNwb25zZS5kYXRhLm1vZGVsKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCByZWplY3QpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIGEgbW9kZWwncyBvciBhIGxpc3Qgb2YgbW9kZWxzJyBvdXRwdXQgY29uZmlnIG9yIGNvbmNlcHRzXG4gICAqIEBwYXJhbSB7b2JqZWN0fG9iamVjdFtdfSAgICAgIG1vZGVscyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENhbiBiZSBhIHNpbmdsZSBtb2RlbCBvYmplY3Qgb3IgbGlzdCBvZiBtb2RlbCBvYmplY3RzIHdpdGggdGhlIGZvbGxvd2luZyBhdHRyczpcbiAgICogICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICBtb2RlbHMuaWQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBUaGUgaWQgb2YgdGhlIG1vZGVsIHRvIGFwcGx5IGNoYW5nZXMgdG8gKFJlcXVpcmVkKVxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICAgIG1vZGVscy5uYW1lICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRoZSBuZXcgbmFtZSBvZiB0aGUgbW9kZWwgdG8gdXBkYXRlIHdpdGhcbiAgICogICBAcGFyYW0ge2Jvb2xlYW59ICAgICAgICAgICAgICBtb2RlbHMuY29uY2VwdHNNdXR1YWxseUV4Y2x1c2l2ZSAgICAgICAgICAgICBEbyB5b3UgZXhwZWN0IHRvIHNlZSBtb3JlIHRoYW4gb25lIG9mIHRoZSBjb25jZXB0cyBpbiB0aGlzIG1vZGVsIGluIHRoZSBTQU1FIGltYWdlPyBTZXQgdG8gZmFsc2UgKGRlZmF1bHQpIGlmIHNvLiBPdGhlcndpc2UsIHNldCB0byB0cnVlLlxuICAgKiAgIEBwYXJhbSB7Ym9vbGVhbn0gICAgICAgICAgICAgIG1vZGVscy5jbG9zZWRFbnZpcm9ubWVudCAgICAgICAgICAgICAgICAgICAgIERvIHlvdSBleHBlY3QgdG8gcnVuIHRoZSB0cmFpbmVkIG1vZGVsIG9uIGltYWdlcyB0aGF0IGRvIG5vdCBjb250YWluIEFOWSBvZiB0aGUgY29uY2VwdHMgaW4gdGhlIG1vZGVsPyBTZXQgdG8gZmFsc2UgKGRlZmF1bHQpIGlmIHNvLiBPdGhlcndpc2UsIHNldCB0byB0cnVlLlxuICAgKiAgIEBwYXJhbSB7b2JqZWN0W119ICAgICAgICAgICAgIG1vZGVscy5jb25jZXB0cyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEFuIGFycmF5IG9mIGNvbmNlcHQgb2JqZWN0cyBvciBzdHJpbmdcbiAgICogICAgIEBwYXJhbSB7b2JqZWN0fHN0cmluZ30gICAgICAgIG1vZGVscy5jb25jZXB0c1tdLmNvbmNlcHQgICAgICAgICAgICAgICAgICAgIElmIHN0cmluZyBpcyBnaXZlbiwgdGhpcyBpcyBpbnRlcnByZXRlZCBhcyBjb25jZXB0IGlkLiBPdGhlcndpc2UsIGlmIG9iamVjdCBpcyBnaXZlbiwgY2xpZW50IGV4cGVjdHMgdGhlIGZvbGxvd2luZyBhdHRyaWJ1dGVzXG4gICAqICAgICAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICBtb2RlbHMuY29uY2VwdHNbXS5jb25jZXB0LmlkICAgICAgICAgICAgICAgICAgIFRoZSBpZCBvZiB0aGUgY29uY2VwdCB0byBhdHRhY2ggdG8gdGhlIG1vZGVsXG4gICAqICAgQHBhcmFtIHtvYmplY3RbXX0gICAgICAgICAgICAgbW9kZWxzLmFjdGlvbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVGhlIGFjdGlvbiB0byBwZXJmb3JtIG9uIHRoZSBnaXZlbiBjb25jZXB0cy4gUG9zc2libGUgdmFsdWVzIGFyZSAnbWVyZ2UnLCAncmVtb3ZlJywgb3IgJ292ZXJ3cml0ZScuIERlZmF1bHQ6ICdtZXJnZSdcbiAgICogQHJldHVybiB7UHJvbWlzZShNb2RlbHMsIGVycm9yKX0gQSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdpdGggYW4gaW5zdGFuY2Ugb2YgTW9kZWxzIG9yIHJlamVjdGVkIHdpdGggYW4gZXJyb3JcbiAgICovXG4gIHVwZGF0ZShtb2RlbHMpIHtcbiAgICBsZXQgdXJsID0gYCR7dGhpcy5fY29uZmlnLmJhc2VQYXRofSR7TU9ERUxTX1BBVEh9YDtcbiAgICBsZXQgbW9kZWxzTGlzdCA9IEFycmF5LmlzQXJyYXkobW9kZWxzKSA/IG1vZGVscyA6IFttb2RlbHNdO1xuICAgIGxldCBkYXRhID0ge21vZGVsczogbW9kZWxzTGlzdC5tYXAoZm9ybWF0TW9kZWwpfTtcbiAgICBkYXRhWydhY3Rpb24nXSA9IG1vZGVscy5hY3Rpb24gfHwgJ21lcmdlJztcbiAgICByZXR1cm4gd3JhcFRva2VuKHRoaXMuX2NvbmZpZywgKGhlYWRlcnMpID0+IHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGF4aW9zLnBhdGNoKHVybCwgZGF0YSwge2hlYWRlcnN9KS50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgIGlmIChpc1N1Y2Nlc3MocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICByZXNvbHZlKG5ldyBNb2RlbHModGhpcy5fY29uZmlnLCByZXNwb25zZS5kYXRhLm1vZGVscykpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSBtb2RlbCBieSBtZXJnaW5nIGNvbmNlcHRzXG4gICAqIEBwYXJhbSB7b2JqZWN0fG9iamVjdFtdfSAgICAgIG1vZGVsICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ2FuIGJlIGEgc2luZ2xlIG1vZGVsIG9iamVjdCBvciBsaXN0IG9mIG1vZGVsIG9iamVjdHMgd2l0aCB0aGUgZm9sbG93aW5nIGF0dHJzOlxuICAgKiAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICAgIG1vZGVsLmlkICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVGhlIGlkIG9mIHRoZSBtb2RlbCB0byBhcHBseSBjaGFuZ2VzIHRvIChSZXF1aXJlZClcbiAgICogICBAcGFyYW0ge29iamVjdFtdfSAgICAgICAgICAgICBtb2RlbC5jb25jZXB0cyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEFuIGFycmF5IG9mIGNvbmNlcHQgb2JqZWN0cyBvciBzdHJpbmdcbiAgICogICAgIEBwYXJhbSB7b2JqZWN0fHN0cmluZ30gICAgICAgIG1vZGVsLmNvbmNlcHRzW10uY29uY2VwdCAgICAgICAgICAgICAgICAgICAgSWYgc3RyaW5nIGlzIGdpdmVuLCB0aGlzIGlzIGludGVycHJldGVkIGFzIGNvbmNlcHQgaWQuIE90aGVyd2lzZSwgaWYgb2JqZWN0IGlzIGdpdmVuLCBjbGllbnQgZXhwZWN0cyB0aGUgZm9sbG93aW5nIGF0dHJpYnV0ZXNcbiAgICogICAgICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICAgIG1vZGVsLmNvbmNlcHRzW10uY29uY2VwdC5pZCAgICAgICAgICAgICAgICAgICBUaGUgaWQgb2YgdGhlIGNvbmNlcHQgdG8gYXR0YWNoIHRvIHRoZSBtb2RlbFxuICAgKi9cbiAgbWVyZ2VDb25jZXB0cyhtb2RlbCA9IHt9KSB7XG4gICAgbW9kZWwuYWN0aW9uID0gJ21lcmdlJztcbiAgICByZXR1cm4gdGhpcy51cGRhdGUobW9kZWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSBtb2RlbCBieSByZW1vdmluZyBjb25jZXB0c1xuICAgKiBAcGFyYW0ge29iamVjdHxvYmplY3RbXX0gICAgICBtb2RlbCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENhbiBiZSBhIHNpbmdsZSBtb2RlbCBvYmplY3Qgb3IgbGlzdCBvZiBtb2RlbCBvYmplY3RzIHdpdGggdGhlIGZvbGxvd2luZyBhdHRyczpcbiAgICogICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICBtb2RlbC5pZCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRoZSBpZCBvZiB0aGUgbW9kZWwgdG8gYXBwbHkgY2hhbmdlcyB0byAoUmVxdWlyZWQpXG4gICAqICAgQHBhcmFtIHtvYmplY3RbXX0gICAgICAgICAgICAgbW9kZWwuY29uY2VwdHMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBBbiBhcnJheSBvZiBjb25jZXB0IG9iamVjdHMgb3Igc3RyaW5nXG4gICAqICAgICBAcGFyYW0ge29iamVjdHxzdHJpbmd9ICAgICAgICBtb2RlbC5jb25jZXB0c1tdLmNvbmNlcHQgICAgICAgICAgICAgICAgICAgIElmIHN0cmluZyBpcyBnaXZlbiwgdGhpcyBpcyBpbnRlcnByZXRlZCBhcyBjb25jZXB0IGlkLiBPdGhlcndpc2UsIGlmIG9iamVjdCBpcyBnaXZlbiwgY2xpZW50IGV4cGVjdHMgdGhlIGZvbGxvd2luZyBhdHRyaWJ1dGVzXG4gICAqICAgICAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICBtb2RlbC5jb25jZXB0c1tdLmNvbmNlcHQuaWQgICAgICAgICAgICAgICAgICAgVGhlIGlkIG9mIHRoZSBjb25jZXB0IHRvIGF0dGFjaCB0byB0aGUgbW9kZWxcbiAgICovXG4gIGRlbGV0ZUNvbmNlcHRzKG1vZGVsID0ge30pIHtcbiAgICBtb2RlbC5hY3Rpb24gPSAncmVtb3ZlJztcbiAgICByZXR1cm4gdGhpcy51cGRhdGUobW9kZWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSBtb2RlbCBieSBvdmVyd3JpdGluZyBjb25jZXB0c1xuICAgKiBAcGFyYW0ge29iamVjdHxvYmplY3RbXX0gICAgICBtb2RlbCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENhbiBiZSBhIHNpbmdsZSBtb2RlbCBvYmplY3Qgb3IgbGlzdCBvZiBtb2RlbCBvYmplY3RzIHdpdGggdGhlIGZvbGxvd2luZyBhdHRyczpcbiAgICogICBAcGFyYW0ge3N0cmluZ30gICAgICAgICAgICAgICBtb2RlbC5pZCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRoZSBpZCBvZiB0aGUgbW9kZWwgdG8gYXBwbHkgY2hhbmdlcyB0byAoUmVxdWlyZWQpXG4gICAqICAgQHBhcmFtIHtvYmplY3RbXX0gICAgICAgICAgICAgbW9kZWwuY29uY2VwdHMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBBbiBhcnJheSBvZiBjb25jZXB0IG9iamVjdHMgb3Igc3RyaW5nXG4gICAqICAgICBAcGFyYW0ge29iamVjdHxzdHJpbmd9ICAgICAgICBtb2RlbC5jb25jZXB0c1tdLmNvbmNlcHQgICAgICAgICAgICAgICAgICAgIElmIHN0cmluZyBpcyBnaXZlbiwgdGhpcyBpcyBpbnRlcnByZXRlZCBhcyBjb25jZXB0IGlkLiBPdGhlcndpc2UsIGlmIG9iamVjdCBpcyBnaXZlbiwgY2xpZW50IGV4cGVjdHMgdGhlIGZvbGxvd2luZyBhdHRyaWJ1dGVzXG4gICAqICAgICAgIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgICBtb2RlbC5jb25jZXB0c1tdLmNvbmNlcHQuaWQgICAgICAgICAgICAgICAgICAgVGhlIGlkIG9mIHRoZSBjb25jZXB0IHRvIGF0dGFjaCB0byB0aGUgbW9kZWxcbiAgICovXG4gIG92ZXJ3cml0ZUNvbmNlcHRzKG1vZGVsID0ge30pIHtcbiAgICBtb2RlbC5hY3Rpb24gPSAnb3ZlcndyaXRlJztcbiAgICByZXR1cm4gdGhpcy51cGRhdGUobW9kZWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZXMgYWxsIG1vZGVscyAoaWYgbm8gaWRzIGFuZCB2ZXJzaW9uSWQgZ2l2ZW4pIG9yIGEgbW9kZWwgKGlmIGdpdmVuIGlkKSBvciBhIG1vZGVsIHZlcnNpb24gKGlmIGdpdmVuIGlkIGFuZCB2ZXJpb24gaWQpXG4gICAqIEBwYXJhbSB7U3RyaW5nfFN0cmluZ1tdfSAgICAgIGlkcyAgICAgICAgIENhbiBiZSBhIHNpbmdsZSBzdHJpbmcgb3IgYW4gYXJyYXkgb2Ygc3RyaW5ncyByZXByZXNlbnRpbmcgdGhlIG1vZGVsIGlkc1xuICAgKiBAcGFyYW0ge1N0cmluZ30gICAgICAgICAgICAgICB2ZXJzaW9uSWQgICBUaGUgbW9kZWwncyB2ZXJzaW9uIGlkXG4gICAqIEByZXR1cm4ge1Byb21pc2UocmVzcG9uc2UsIGVycm9yKX0gQSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdpdGggdGhlIEFQSSByZXNwb25zZSBvciByZWplY3RlZCB3aXRoIGFuIGVycm9yXG4gICAqL1xuICBkZWxldGUoaWRzLCB2ZXJzaW9uSWQgPSBudWxsKSB7XG4gICAgbGV0IHJlcXVlc3QsIHVybCwgZGF0YTtcbiAgICBsZXQgaWQgPSBpZHM7XG5cbiAgICBpZiAoY2hlY2tUeXBlKC9TdHJpbmcvLCBpZHMpIHx8IChjaGVja1R5cGUoL0FycmF5LywgaWRzKSAmJiBpZHMubGVuZ3RoID09PSAxICkpIHtcbiAgICAgIGlmICh2ZXJzaW9uSWQpIHtcbiAgICAgICAgdXJsID0gYCR7dGhpcy5fY29uZmlnLmJhc2VQYXRofSR7cmVwbGFjZVZhcnMoTU9ERUxfVkVSU0lPTl9QQVRILCBbaWQsIHZlcnNpb25JZF0pfWA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1cmwgPSBgJHt0aGlzLl9jb25maWcuYmFzZVBhdGh9JHtyZXBsYWNlVmFycyhNT0RFTF9QQVRILCBbaWRdKX1gO1xuICAgICAgfVxuICAgICAgcmVxdWVzdCA9IHdyYXBUb2tlbih0aGlzLl9jb25maWcsIChoZWFkZXJzKSA9PiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgYXhpb3MuZGVsZXRlKHVybCwge2hlYWRlcnN9KS50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGRhdGEgPSBjbG9uZShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIGRhdGEucmF3RGF0YSA9IGNsb25lKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgICB9LCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWlkcyAmJiAhdmVyc2lvbklkKSB7XG4gICAgICAgIHVybCA9IGAke3RoaXMuX2NvbmZpZy5iYXNlUGF0aH0ke01PREVMU19QQVRIfWA7XG4gICAgICAgIGRhdGEgPSB7J2RlbGV0ZV9hbGwnOiB0cnVlfTtcbiAgICAgIH0gZWxzZSBpZiAoIXZlcnNpb25JZCAmJiBpZHMubGVuZ3RoID4gMSkge1xuICAgICAgICB1cmwgPSBgJHt0aGlzLl9jb25maWcuYmFzZVBhdGh9JHtNT0RFTFNfUEFUSH1gO1xuICAgICAgICBkYXRhID0ge2lkc307XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBFUlJPUlMuSU5WQUxJRF9ERUxFVEVfQVJHUztcbiAgICAgIH1cbiAgICAgIHJlcXVlc3QgPSB3cmFwVG9rZW4odGhpcy5fY29uZmlnLCAoaGVhZGVycykgPT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgIGF4aW9zKHtcbiAgICAgICAgICAgIG1ldGhvZDogJ2RlbGV0ZScsXG4gICAgICAgICAgICB1cmwsXG4gICAgICAgICAgICBkYXRhLFxuICAgICAgICAgICAgaGVhZGVyc1xuICAgICAgICAgIH0pLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBsZXQgZGF0YSA9IGNsb25lKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgZGF0YS5yYXdEYXRhID0gY2xvbmUocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcXVlc3Q7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIGZvciBtb2RlbHMgYnkgbmFtZSBvciB0eXBlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSAgICAgbmFtZSAgICAgICAgVGhlIG1vZGVsIG5hbWVcbiAgICogQHBhcmFtIHtTdHJpbmd9ICAgICB0eXBlICAgICAgICBUaGlzIGNhbiBiZSBcImNvbmNlcHRcIiwgXCJjb2xvclwiLCBcImVtYmVkXCIsIFwiZmFjZWRldGVjdFwiLCBcImNsdXN0ZXJcIiBvciBcImJsdXJcIlxuICAgKiBAcmV0dXJuIHtQcm9taXNlKG1vZGVscywgZXJyb3IpfSBBIFByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2l0aCBhbiBpbnN0YW5jZSBvZiBNb2RlbHMgb3IgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvclxuICAgKi9cbiAgc2VhcmNoKG5hbWUsIHR5cGUgPSBudWxsKSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuX2NvbmZpZy5iYXNlUGF0aH0ke01PREVMX1NFQVJDSF9QQVRIfWA7XG4gICAgcmV0dXJuIHdyYXBUb2tlbih0aGlzLl9jb25maWcsIChoZWFkZXJzKSA9PiB7XG4gICAgICBsZXQgcGFyYW1zID0ge1xuICAgICAgICAnbW9kZWxfcXVlcnknOiB7XG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICB0eXBlXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBheGlvcy5wb3N0KHVybCwgcGFyYW1zLCB7aGVhZGVyc30pLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgaWYgKGlzU3VjY2VzcyhyZXNwb25zZSkpIHtcbiAgICAgICAgICAgIHJlc29sdmUobmV3IE1vZGVscyh0aGlzLl9jb25maWcsIHJlc3BvbnNlLmRhdGEubW9kZWxzKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCByZWplY3QpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNb2RlbHM7XG4iXX0=
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/Models.js","/")
},{"./Concepts":39,"./Model":42,"./constants":46,"./helpers":48,"./utils":49,"axios":4,"buffer":23,"pBGvAp":27,"promise":28}],45:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var axios = require('axios');

var _require = require('./constants'),
    API = _require.API,
    replaceVars = _require.replaceVars;

var WORKFLOWS_PATH = API.WORKFLOWS_PATH,
    WORKFLOW_PATH = API.WORKFLOW_PATH,
    WORKFLOW_RESULTS_PATH = API.WORKFLOW_RESULTS_PATH;

var _require2 = require('./utils'),
    wrapToken = _require2.wrapToken,
    formatInput = _require2.formatInput;

var _require3 = require('./helpers'),
    checkType = _require3.checkType;

/**
 * class representing a workflow
 * @class
 */


var Workflow = function () {
  function Workflow(_config) {
    var rawData = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

    _classCallCheck(this, Workflow);

    this._config = _config;
    this.rawData = rawData;
  }

  _createClass(Workflow, [{
    key: 'create',
    value: function create(workflowId, config) {
      var url = '' + this._config.basePath + WORKFLOWS_PATH;
      var modelId = config.modelId;
      var modelVersionId = config.modelVersionId;
      var body = {
        workflows: [{
          id: workflowId,
          nodes: [{
            id: 'concepts',
            model: {
              id: modelId,
              model_version: {
                id: modelVersionId
              }
            }
          }]
        }]
      };

      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.post(url, body, {
            headers: headers
          }).then(function (response) {
            var workflowId = response.data.workflows[0].id;
            resolve(workflowId);
          }, reject);
        });
      });
    }
  }, {
    key: 'delete',
    value: function _delete(workflowId, config) {
      var url = '' + this._config.basePath + replaceVars(WORKFLOW_PATH, [workflowId]);
      return wrapToken(this._config, function (headers) {
        return new Promise(function (resolve, reject) {
          axios.delete(url, {
            headers: headers
          }).then(function (response) {
            var data = response.data;
            resolve(data);
          }, reject);
        });
      });
    }

    /**
     * Returns workflow output according to inputs
     * @param {string}                   workflowId    Workflow id
     * @param {object[]|object|string}   inputs    An array of objects/object/string pointing to an image resource. A string can either be a url or base64 image bytes. Object keys explained below:
     *    @param {object}                  inputs[].image     Object with keys explained below:
     *       @param {string}                 inputs[].image.(url|base64)  Can be a publicly accessibly url or base64 string representing image bytes (required)
     */

  }, {
    key: 'predict',
    value: function predict(workflowId, inputs) {
      var url = '' + this._config.basePath + replaceVars(WORKFLOW_RESULTS_PATH, [workflowId]);
      if (checkType(/(Object|String)/, inputs)) {
        inputs = [inputs];
      }
      return wrapToken(this._config, function (headers) {
        var params = {
          inputs: inputs.map(formatInput)
        };
        return new Promise(function (resolve, reject) {
          axios.post(url, params, {
            headers: headers
          }).then(function (response) {
            var data = response.data;
            resolve(data);
          }, reject);
        });
      });
    }
  }]);

  return Workflow;
}();

module.exports = Workflow;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIldvcmtmbG93LmpzIl0sIm5hbWVzIjpbImF4aW9zIiwicmVxdWlyZSIsIkFQSSIsInJlcGxhY2VWYXJzIiwiV09SS0ZMT1dTX1BBVEgiLCJXT1JLRkxPV19QQVRIIiwiV09SS0ZMT1dfUkVTVUxUU19QQVRIIiwid3JhcFRva2VuIiwiZm9ybWF0SW5wdXQiLCJjaGVja1R5cGUiLCJXb3JrZmxvdyIsIl9jb25maWciLCJyYXdEYXRhIiwid29ya2Zsb3dJZCIsImNvbmZpZyIsInVybCIsImJhc2VQYXRoIiwibW9kZWxJZCIsIm1vZGVsVmVyc2lvbklkIiwiYm9keSIsIndvcmtmbG93cyIsImlkIiwibm9kZXMiLCJtb2RlbCIsIm1vZGVsX3ZlcnNpb24iLCJoZWFkZXJzIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJwb3N0IiwidGhlbiIsInJlc3BvbnNlIiwiZGF0YSIsImRlbGV0ZSIsImlucHV0cyIsInBhcmFtcyIsIm1hcCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaOztlQUN5QkEsUUFBUSxhQUFSLEM7SUFBcEJDLEcsWUFBQUEsRztJQUFLQyxXLFlBQUFBLFc7O0lBQ0xDLGMsR0FBd0RGLEcsQ0FBeERFLGM7SUFBZ0JDLGEsR0FBd0NILEcsQ0FBeENHLGE7SUFBZUMscUIsR0FBeUJKLEcsQ0FBekJJLHFCOztnQkFDTEwsUUFBUSxTQUFSLEM7SUFBMUJNLFMsYUFBQUEsUztJQUFXQyxXLGFBQUFBLFc7O2dCQUNFUCxRQUFRLFdBQVIsQztJQUFiUSxTLGFBQUFBLFM7O0FBRUw7Ozs7OztJQUlNQyxRO0FBQ0osb0JBQVlDLE9BQVosRUFBaUM7QUFBQSxRQUFaQyxPQUFZLHVFQUFKLEVBQUk7O0FBQUE7O0FBQy9CLFNBQUtELE9BQUwsR0FBZUEsT0FBZjtBQUNBLFNBQUtDLE9BQUwsR0FBZUEsT0FBZjtBQUNEOzs7OzJCQUVNQyxVLEVBQVlDLE0sRUFBUTtBQUN6QixVQUFNQyxXQUFTLEtBQUtKLE9BQUwsQ0FBYUssUUFBdEIsR0FBaUNaLGNBQXZDO0FBQ0EsVUFBTWEsVUFBVUgsT0FBT0csT0FBdkI7QUFDQSxVQUFNQyxpQkFBaUJKLE9BQU9JLGNBQTlCO0FBQ0EsVUFBTUMsT0FBTztBQUNYQyxtQkFBVyxDQUFDO0FBQ1ZDLGNBQUlSLFVBRE07QUFFVlMsaUJBQU8sQ0FBQztBQUNORCxnQkFBSSxVQURFO0FBRU5FLG1CQUFPO0FBQ0xGLGtCQUFJSixPQURDO0FBRUxPLDZCQUFlO0FBQ2JILG9CQUFJSDtBQURTO0FBRlY7QUFGRCxXQUFEO0FBRkcsU0FBRDtBQURBLE9BQWI7O0FBZUEsYUFBT1gsVUFBVSxLQUFLSSxPQUFmLEVBQXdCLFVBQUNjLE9BQUQsRUFBYTtBQUMxQyxlQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVVDLE1BQVYsRUFBcUI7QUFDdEM1QixnQkFBTTZCLElBQU4sQ0FBV2QsR0FBWCxFQUFnQkksSUFBaEIsRUFBc0I7QUFDcEJNO0FBRG9CLFdBQXRCLEVBRUdLLElBRkgsQ0FFUSxvQkFBWTtBQUNsQixnQkFBTWpCLGFBQWFrQixTQUFTQyxJQUFULENBQWNaLFNBQWQsQ0FBd0IsQ0FBeEIsRUFBMkJDLEVBQTlDO0FBQ0FNLG9CQUFRZCxVQUFSO0FBQ0QsV0FMRCxFQUtHZSxNQUxIO0FBTUQsU0FQTSxDQUFQO0FBUUQsT0FUTSxDQUFQO0FBVUQ7Ozs0QkFFTWYsVSxFQUFZQyxNLEVBQVE7QUFDekIsVUFBTUMsV0FBUyxLQUFLSixPQUFMLENBQWFLLFFBQXRCLEdBQWlDYixZQUFZRSxhQUFaLEVBQTJCLENBQUNRLFVBQUQsQ0FBM0IsQ0FBdkM7QUFDQSxhQUFPTixVQUFVLEtBQUtJLE9BQWYsRUFBd0IsVUFBQ2MsT0FBRCxFQUFhO0FBQzFDLGVBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjtBQUN0QzVCLGdCQUFNaUMsTUFBTixDQUFhbEIsR0FBYixFQUFrQjtBQUNoQlU7QUFEZ0IsV0FBbEIsRUFFR0ssSUFGSCxDQUVRLG9CQUFZO0FBQ2xCLGdCQUFNRSxPQUFPRCxTQUFTQyxJQUF0QjtBQUNBTCxvQkFBUUssSUFBUjtBQUNELFdBTEQsRUFLR0osTUFMSDtBQU1ELFNBUE0sQ0FBUDtBQVFELE9BVE0sQ0FBUDtBQVVEOztBQUVEOzs7Ozs7Ozs7OzRCQU9RZixVLEVBQVlxQixNLEVBQVE7QUFDMUIsVUFBTW5CLFdBQVMsS0FBS0osT0FBTCxDQUFhSyxRQUF0QixHQUFpQ2IsWUFBWUcscUJBQVosRUFBbUMsQ0FBQ08sVUFBRCxDQUFuQyxDQUF2QztBQUNBLFVBQUlKLFVBQVUsaUJBQVYsRUFBNkJ5QixNQUE3QixDQUFKLEVBQTBDO0FBQ3hDQSxpQkFBUyxDQUFDQSxNQUFELENBQVQ7QUFDRDtBQUNELGFBQU8zQixVQUFVLEtBQUtJLE9BQWYsRUFBd0IsVUFBQ2MsT0FBRCxFQUFhO0FBQzFDLFlBQU1VLFNBQVM7QUFDYkQsa0JBQVFBLE9BQU9FLEdBQVAsQ0FBVzVCLFdBQVg7QUFESyxTQUFmO0FBR0EsZUFBTyxJQUFJa0IsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjtBQUN0QzVCLGdCQUFNNkIsSUFBTixDQUFXZCxHQUFYLEVBQWdCb0IsTUFBaEIsRUFBd0I7QUFDdEJWO0FBRHNCLFdBQXhCLEVBRUdLLElBRkgsQ0FFUSxVQUFDQyxRQUFELEVBQWM7QUFDcEIsZ0JBQU1DLE9BQU9ELFNBQVNDLElBQXRCO0FBQ0FMLG9CQUFRSyxJQUFSO0FBQ0QsV0FMRCxFQUtHSixNQUxIO0FBTUQsU0FQTSxDQUFQO0FBUUQsT0FaTSxDQUFQO0FBYUQ7Ozs7OztBQUdIUyxPQUFPQyxPQUFQLEdBQWlCNUIsUUFBakIiLCJmaWxlIjoiV29ya2Zsb3cuanMiLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgYXhpb3MgPSByZXF1aXJlKCdheGlvcycpO1xubGV0IHtBUEksIHJlcGxhY2VWYXJzfSA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5sZXQge1dPUktGTE9XU19QQVRILCBXT1JLRkxPV19QQVRILCBXT1JLRkxPV19SRVNVTFRTX1BBVEh9ID0gQVBJO1xubGV0IHt3cmFwVG9rZW4sIGZvcm1hdElucHV0fSA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbmxldCB7Y2hlY2tUeXBlfSA9IHJlcXVpcmUoJy4vaGVscGVycycpO1xuXG4vKipcbiAqIGNsYXNzIHJlcHJlc2VudGluZyBhIHdvcmtmbG93XG4gKiBAY2xhc3NcbiAqL1xuY2xhc3MgV29ya2Zsb3cge1xuICBjb25zdHJ1Y3RvcihfY29uZmlnLCByYXdEYXRhPVtdKSB7XG4gICAgdGhpcy5fY29uZmlnID0gX2NvbmZpZztcbiAgICB0aGlzLnJhd0RhdGEgPSByYXdEYXRhO1xuICB9XG5cbiAgY3JlYXRlKHdvcmtmbG93SWQsIGNvbmZpZykge1xuICAgIGNvbnN0IHVybCA9IGAke3RoaXMuX2NvbmZpZy5iYXNlUGF0aH0ke1dPUktGTE9XU19QQVRIfWA7XG4gICAgY29uc3QgbW9kZWxJZCA9IGNvbmZpZy5tb2RlbElkO1xuICAgIGNvbnN0IG1vZGVsVmVyc2lvbklkID0gY29uZmlnLm1vZGVsVmVyc2lvbklkO1xuICAgIGNvbnN0IGJvZHkgPSB7XG4gICAgICB3b3JrZmxvd3M6IFt7XG4gICAgICAgIGlkOiB3b3JrZmxvd0lkLFxuICAgICAgICBub2RlczogW3tcbiAgICAgICAgICBpZDogJ2NvbmNlcHRzJyxcbiAgICAgICAgICBtb2RlbDoge1xuICAgICAgICAgICAgaWQ6IG1vZGVsSWQsXG4gICAgICAgICAgICBtb2RlbF92ZXJzaW9uOiB7XG4gICAgICAgICAgICAgIGlkOiBtb2RlbFZlcnNpb25JZFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfV1cbiAgICAgIH1dXG4gICAgfTtcblxuICAgIHJldHVybiB3cmFwVG9rZW4odGhpcy5fY29uZmlnLCAoaGVhZGVycykgPT4ge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgYXhpb3MucG9zdCh1cmwsIGJvZHksIHtcbiAgICAgICAgICBoZWFkZXJzXG4gICAgICAgIH0pLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgIGNvbnN0IHdvcmtmbG93SWQgPSByZXNwb25zZS5kYXRhLndvcmtmbG93c1swXS5pZDtcbiAgICAgICAgICByZXNvbHZlKHdvcmtmbG93SWQpO1xuICAgICAgICB9LCByZWplY3QpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBkZWxldGUod29ya2Zsb3dJZCwgY29uZmlnKSB7XG4gICAgY29uc3QgdXJsID0gYCR7dGhpcy5fY29uZmlnLmJhc2VQYXRofSR7cmVwbGFjZVZhcnMoV09SS0ZMT1dfUEFUSCwgW3dvcmtmbG93SWRdKX1gO1xuICAgIHJldHVybiB3cmFwVG9rZW4odGhpcy5fY29uZmlnLCAoaGVhZGVycykgPT4ge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgYXhpb3MuZGVsZXRlKHVybCwge1xuICAgICAgICAgIGhlYWRlcnNcbiAgICAgICAgfSkudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgd29ya2Zsb3cgb3V0cHV0IGFjY29yZGluZyB0byBpbnB1dHNcbiAgICogQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICAgICAgICAgIHdvcmtmbG93SWQgICAgV29ya2Zsb3cgaWRcbiAgICogQHBhcmFtIHtvYmplY3RbXXxvYmplY3R8c3RyaW5nfSAgIGlucHV0cyAgICBBbiBhcnJheSBvZiBvYmplY3RzL29iamVjdC9zdHJpbmcgcG9pbnRpbmcgdG8gYW4gaW1hZ2UgcmVzb3VyY2UuIEEgc3RyaW5nIGNhbiBlaXRoZXIgYmUgYSB1cmwgb3IgYmFzZTY0IGltYWdlIGJ5dGVzLiBPYmplY3Qga2V5cyBleHBsYWluZWQgYmVsb3c6XG4gICAqICAgIEBwYXJhbSB7b2JqZWN0fSAgICAgICAgICAgICAgICAgIGlucHV0c1tdLmltYWdlICAgICBPYmplY3Qgd2l0aCBrZXlzIGV4cGxhaW5lZCBiZWxvdzpcbiAgICogICAgICAgQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgICAgICAgICBpbnB1dHNbXS5pbWFnZS4odXJsfGJhc2U2NCkgIENhbiBiZSBhIHB1YmxpY2x5IGFjY2Vzc2libHkgdXJsIG9yIGJhc2U2NCBzdHJpbmcgcmVwcmVzZW50aW5nIGltYWdlIGJ5dGVzIChyZXF1aXJlZClcbiAgICovXG4gIHByZWRpY3Qod29ya2Zsb3dJZCwgaW5wdXRzKSB7XG4gICAgY29uc3QgdXJsID0gYCR7dGhpcy5fY29uZmlnLmJhc2VQYXRofSR7cmVwbGFjZVZhcnMoV09SS0ZMT1dfUkVTVUxUU19QQVRILCBbd29ya2Zsb3dJZF0pfWA7XG4gICAgaWYgKGNoZWNrVHlwZSgvKE9iamVjdHxTdHJpbmcpLywgaW5wdXRzKSkge1xuICAgICAgaW5wdXRzID0gW2lucHV0c107XG4gICAgfVxuICAgIHJldHVybiB3cmFwVG9rZW4odGhpcy5fY29uZmlnLCAoaGVhZGVycykgPT4ge1xuICAgICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgICBpbnB1dHM6IGlucHV0cy5tYXAoZm9ybWF0SW5wdXQpXG4gICAgICB9O1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgYXhpb3MucG9zdCh1cmwsIHBhcmFtcywge1xuICAgICAgICAgIGhlYWRlcnNcbiAgICAgICAgfSkudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICB9LCByZWplY3QpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBXb3JrZmxvdzsiXX0=
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/Workflow.js","/")
},{"./constants":46,"./helpers":48,"./utils":49,"axios":4,"buffer":23,"pBGvAp":27}],46:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var MAX_BATCH_SIZE = 128;
var GEO_LIMIT_TYPES = ['withinMiles', 'withinKilometers', 'withinRadians', 'withinDegrees'];
var URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/i;
var SYNC_TIMEOUT = 240000;
var MODEL_QUEUED_FOR_TRAINING = '21103';
var MODEL_TRAINING = '21101';
var POLLTIME = 2000;

module.exports = {
  API: {
    TOKEN_PATH: '/token',
    MODELS_PATH: '/models',
    MODEL_PATH: '/models/$0',
    MODEL_VERSIONS_PATH: '/models/$0/versions',
    MODEL_VERSION_PATH: '/models/$0/versions/$1',
    MODEL_PATCH_PATH: '/models/$0/output_info/data/concepts',
    MODEL_OUTPUT_PATH: '/models/$0/output_info',
    MODEL_SEARCH_PATH: '/models/searches',
    MODEL_FEEDBACK_PATH: '/models/$0/feedback',
    MODEL_VERSION_FEEDBACK_PATH: '/models/$0/versions/$1/feedback',
    PREDICT_PATH: '/models/$0/outputs',
    VERSION_PREDICT_PATH: '/models/$0/versions/$1/outputs',
    CONCEPTS_PATH: '/concepts',
    CONCEPT_PATH: '/concepts/$0',
    CONCEPT_SEARCH_PATH: '/concepts/searches',
    MODEL_INPUTS_PATH: '/models/$0/inputs',
    MODEL_VERSION_INPUTS_PATH: '/models/$0/versions/$1/inputs',
    MODEL_VERSION_METRICS_PATH: '/models/$0/versions/$1/metrics',
    INPUTS_PATH: '/inputs',
    INPUT_PATH: '/inputs/$0',
    INPUTS_STATUS_PATH: '/inputs/status',
    SEARCH_PATH: '/searches',
    WORKFLOWS_PATH: '/workflows',
    WORKFLOW_PATH: '/workflows/$0',
    WORKFLOW_RESULTS_PATH: '/workflows/$0/results'
  },
  ERRORS: {
    paramsRequired: function paramsRequired(param) {
      var paramList = Array.isArray(param) ? param : [param];
      return new Error('The following ' + (paramList.length > 1 ? 'params are' : 'param is') + ' required: ' + paramList.join(', '));
    },
    MAX_INPUTS: new Error('Number of inputs passed exceeded max of ' + MAX_BATCH_SIZE),
    INVALID_GEOLIMIT_TYPE: new Error('Incorrect geo_limit type. Value must be any of the following: ' + GEO_LIMIT_TYPES.join(', ')),
    INVALID_DELETE_ARGS: new Error('Wrong arguments passed. You can only delete all models (provide no arguments), delete select models (provide list of ids),\n    delete a single model (providing a single id) or delete a model version (provide a single id and version id)')
  },
  STATUS: {
    MODEL_QUEUED_FOR_TRAINING: MODEL_QUEUED_FOR_TRAINING,
    MODEL_TRAINING: MODEL_TRAINING
  },
  // var replacement must be given in order
  replaceVars: function replaceVars(path) {
    var vars = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

    var newPath = path;
    vars.forEach(function (val, index) {
      if (index === 0) {
        val = encodeURIComponent(val);
      }
      newPath = newPath.replace(new RegExp('\\$' + index, 'g'), val);
    });
    return newPath;
  },
  getBasePath: function getBasePath() {
    var apiEndpoint = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'https://api.clarifai.com';
    var userId = arguments[1];
    var appId = arguments[2];

    if (!userId || !appId) {
      return apiEndpoint + '/v2';
    }
    return apiEndpoint + '/v2/users/' + userId + '/apps/' + appId;
  },
  GEO_LIMIT_TYPES: GEO_LIMIT_TYPES,
  MAX_BATCH_SIZE: MAX_BATCH_SIZE,
  URL_REGEX: URL_REGEX,
  SYNC_TIMEOUT: SYNC_TIMEOUT,
  POLLTIME: POLLTIME
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbnN0YW50cy5qcyJdLCJuYW1lcyI6WyJNQVhfQkFUQ0hfU0laRSIsIkdFT19MSU1JVF9UWVBFUyIsIlVSTF9SRUdFWCIsIlNZTkNfVElNRU9VVCIsIk1PREVMX1FVRVVFRF9GT1JfVFJBSU5JTkciLCJNT0RFTF9UUkFJTklORyIsIlBPTExUSU1FIiwibW9kdWxlIiwiZXhwb3J0cyIsIkFQSSIsIlRPS0VOX1BBVEgiLCJNT0RFTFNfUEFUSCIsIk1PREVMX1BBVEgiLCJNT0RFTF9WRVJTSU9OU19QQVRIIiwiTU9ERUxfVkVSU0lPTl9QQVRIIiwiTU9ERUxfUEFUQ0hfUEFUSCIsIk1PREVMX09VVFBVVF9QQVRIIiwiTU9ERUxfU0VBUkNIX1BBVEgiLCJNT0RFTF9GRUVEQkFDS19QQVRIIiwiTU9ERUxfVkVSU0lPTl9GRUVEQkFDS19QQVRIIiwiUFJFRElDVF9QQVRIIiwiVkVSU0lPTl9QUkVESUNUX1BBVEgiLCJDT05DRVBUU19QQVRIIiwiQ09OQ0VQVF9QQVRIIiwiQ09OQ0VQVF9TRUFSQ0hfUEFUSCIsIk1PREVMX0lOUFVUU19QQVRIIiwiTU9ERUxfVkVSU0lPTl9JTlBVVFNfUEFUSCIsIk1PREVMX1ZFUlNJT05fTUVUUklDU19QQVRIIiwiSU5QVVRTX1BBVEgiLCJJTlBVVF9QQVRIIiwiSU5QVVRTX1NUQVRVU19QQVRIIiwiU0VBUkNIX1BBVEgiLCJXT1JLRkxPV1NfUEFUSCIsIldPUktGTE9XX1BBVEgiLCJXT1JLRkxPV19SRVNVTFRTX1BBVEgiLCJFUlJPUlMiLCJwYXJhbXNSZXF1aXJlZCIsInBhcmFtIiwicGFyYW1MaXN0IiwiQXJyYXkiLCJpc0FycmF5IiwiRXJyb3IiLCJsZW5ndGgiLCJqb2luIiwiTUFYX0lOUFVUUyIsIklOVkFMSURfR0VPTElNSVRfVFlQRSIsIklOVkFMSURfREVMRVRFX0FSR1MiLCJTVEFUVVMiLCJyZXBsYWNlVmFycyIsInBhdGgiLCJ2YXJzIiwibmV3UGF0aCIsImZvckVhY2giLCJ2YWwiLCJpbmRleCIsImVuY29kZVVSSUNvbXBvbmVudCIsInJlcGxhY2UiLCJSZWdFeHAiLCJnZXRCYXNlUGF0aCIsImFwaUVuZHBvaW50IiwidXNlcklkIiwiYXBwSWQiXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBTUEsaUJBQWlCLEdBQXZCO0FBQ0EsSUFBTUMsa0JBQWtCLENBQUMsYUFBRCxFQUFnQixrQkFBaEIsRUFBb0MsZUFBcEMsRUFBcUQsZUFBckQsQ0FBeEI7QUFDQSxJQUFNQyxZQUFZLDhGQUFsQjtBQUNBLElBQU1DLGVBQWUsTUFBckI7QUFDQSxJQUFNQyw0QkFBNEIsT0FBbEM7QUFDQSxJQUFNQyxpQkFBaUIsT0FBdkI7QUFDQSxJQUFNQyxXQUFXLElBQWpCOztBQUVBQyxPQUFPQyxPQUFQLEdBQWlCO0FBQ2ZDLE9BQUs7QUFDSEMsZ0JBQVksUUFEVDtBQUVIQyxpQkFBYSxTQUZWO0FBR0hDLGdCQUFZLFlBSFQ7QUFJSEMseUJBQXFCLHFCQUpsQjtBQUtIQyx3QkFBb0Isd0JBTGpCO0FBTUhDLHNCQUFrQixzQ0FOZjtBQU9IQyx1QkFBbUIsd0JBUGhCO0FBUUhDLHVCQUFtQixrQkFSaEI7QUFTSEMseUJBQXFCLHFCQVRsQjtBQVVIQyxpQ0FBNkIsaUNBVjFCO0FBV0hDLGtCQUFjLG9CQVhYO0FBWUhDLDBCQUFzQixnQ0FabkI7QUFhSEMsbUJBQWUsV0FiWjtBQWNIQyxrQkFBYyxjQWRYO0FBZUhDLHlCQUFxQixvQkFmbEI7QUFnQkhDLHVCQUFtQixtQkFoQmhCO0FBaUJIQywrQkFBMkIsK0JBakJ4QjtBQWtCSEMsZ0NBQTRCLGdDQWxCekI7QUFtQkhDLGlCQUFhLFNBbkJWO0FBb0JIQyxnQkFBWSxZQXBCVDtBQXFCSEMsd0JBQW9CLGdCQXJCakI7QUFzQkhDLGlCQUFhLFdBdEJWO0FBdUJIQyxvQkFBZ0IsWUF2QmI7QUF3QkhDLG1CQUFlLGVBeEJaO0FBeUJIQywyQkFBdUI7QUF6QnBCLEdBRFU7QUE0QmZDLFVBQVE7QUFDTkMsb0JBQWdCLHdCQUFDQyxLQUFELEVBQVc7QUFDekIsVUFBSUMsWUFBWUMsTUFBTUMsT0FBTixDQUFjSCxLQUFkLElBQXVCQSxLQUF2QixHQUErQixDQUFDQSxLQUFELENBQS9DO0FBQ0EsYUFBTyxJQUFJSSxLQUFKLHFCQUEyQkgsVUFBVUksTUFBVixHQUFtQixDQUFuQixHQUF1QixZQUF2QixHQUFzQyxVQUFqRSxvQkFBeUZKLFVBQVVLLElBQVYsQ0FBZSxJQUFmLENBQXpGLENBQVA7QUFDRCxLQUpLO0FBS05DLGdCQUFZLElBQUlILEtBQUosOENBQXFEekMsY0FBckQsQ0FMTjtBQU1ONkMsMkJBQXVCLElBQUlKLEtBQUosb0VBQTJFeEMsZ0JBQWdCMEMsSUFBaEIsQ0FBcUIsSUFBckIsQ0FBM0UsQ0FOakI7QUFPTkcseUJBQXFCLElBQUlMLEtBQUo7QUFQZixHQTVCTztBQXNDZk0sVUFBUTtBQUNOM0Msd0RBRE07QUFFTkM7QUFGTSxHQXRDTztBQTBDZjtBQUNBMkMsZUFBYSxxQkFBQ0MsSUFBRCxFQUFxQjtBQUFBLFFBQWRDLElBQWMsdUVBQVAsRUFBTzs7QUFDaEMsUUFBSUMsVUFBVUYsSUFBZDtBQUNBQyxTQUFLRSxPQUFMLENBQWEsVUFBQ0MsR0FBRCxFQUFNQyxLQUFOLEVBQWdCO0FBQzNCLFVBQUlBLFVBQVUsQ0FBZCxFQUFpQjtBQUNmRCxjQUFNRSxtQkFBbUJGLEdBQW5CLENBQU47QUFDRDtBQUNERixnQkFBVUEsUUFBUUssT0FBUixDQUFnQixJQUFJQyxNQUFKLFNBQWlCSCxLQUFqQixFQUEwQixHQUExQixDQUFoQixFQUFnREQsR0FBaEQsQ0FBVjtBQUNELEtBTEQ7QUFNQSxXQUFPRixPQUFQO0FBQ0QsR0FwRGM7QUFxRGZPLGVBQWEsdUJBQTZEO0FBQUEsUUFBNURDLFdBQTRELHVFQUE5QywwQkFBOEM7QUFBQSxRQUFsQkMsTUFBa0I7QUFBQSxRQUFWQyxLQUFVOztBQUN4RSxRQUFHLENBQUNELE1BQUQsSUFBVyxDQUFDQyxLQUFmLEVBQXNCO0FBQ3BCLGFBQVVGLFdBQVY7QUFDRDtBQUNELFdBQVVBLFdBQVYsa0JBQWtDQyxNQUFsQyxjQUFpREMsS0FBakQ7QUFDRCxHQTFEYztBQTJEZjVELGtDQTNEZTtBQTREZkQsZ0NBNURlO0FBNkRmRSxzQkE3RGU7QUE4RGZDLDRCQTlEZTtBQStEZkc7QUEvRGUsQ0FBakIiLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgTUFYX0JBVENIX1NJWkUgPSAxMjg7XG5jb25zdCBHRU9fTElNSVRfVFlQRVMgPSBbJ3dpdGhpbk1pbGVzJywgJ3dpdGhpbktpbG9tZXRlcnMnLCAnd2l0aGluUmFkaWFucycsICd3aXRoaW5EZWdyZWVzJ107XG5jb25zdCBVUkxfUkVHRVggPSAvaHR0cHM/OlxcL1xcLyh3d3dcXC4pP1stYS16QS1aMC05QDolLl9cXCt+Iz1dezIsMjU2fVxcLlthLXpdezIsNn1cXGIoWy1hLXpBLVowLTlAOiVfXFwrLn4jPyYvLz1dKikvaTtcbmNvbnN0IFNZTkNfVElNRU9VVCA9IDI0MDAwMDtcbmNvbnN0IE1PREVMX1FVRVVFRF9GT1JfVFJBSU5JTkcgPSAnMjExMDMnO1xuY29uc3QgTU9ERUxfVFJBSU5JTkcgPSAnMjExMDEnO1xuY29uc3QgUE9MTFRJTUUgPSAyMDAwO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgQVBJOiB7XG4gICAgVE9LRU5fUEFUSDogJy90b2tlbicsXG4gICAgTU9ERUxTX1BBVEg6ICcvbW9kZWxzJyxcbiAgICBNT0RFTF9QQVRIOiAnL21vZGVscy8kMCcsXG4gICAgTU9ERUxfVkVSU0lPTlNfUEFUSDogJy9tb2RlbHMvJDAvdmVyc2lvbnMnLFxuICAgIE1PREVMX1ZFUlNJT05fUEFUSDogJy9tb2RlbHMvJDAvdmVyc2lvbnMvJDEnLFxuICAgIE1PREVMX1BBVENIX1BBVEg6ICcvbW9kZWxzLyQwL291dHB1dF9pbmZvL2RhdGEvY29uY2VwdHMnLFxuICAgIE1PREVMX09VVFBVVF9QQVRIOiAnL21vZGVscy8kMC9vdXRwdXRfaW5mbycsXG4gICAgTU9ERUxfU0VBUkNIX1BBVEg6ICcvbW9kZWxzL3NlYXJjaGVzJyxcbiAgICBNT0RFTF9GRUVEQkFDS19QQVRIOiAnL21vZGVscy8kMC9mZWVkYmFjaycsXG4gICAgTU9ERUxfVkVSU0lPTl9GRUVEQkFDS19QQVRIOiAnL21vZGVscy8kMC92ZXJzaW9ucy8kMS9mZWVkYmFjaycsXG4gICAgUFJFRElDVF9QQVRIOiAnL21vZGVscy8kMC9vdXRwdXRzJyxcbiAgICBWRVJTSU9OX1BSRURJQ1RfUEFUSDogJy9tb2RlbHMvJDAvdmVyc2lvbnMvJDEvb3V0cHV0cycsXG4gICAgQ09OQ0VQVFNfUEFUSDogJy9jb25jZXB0cycsXG4gICAgQ09OQ0VQVF9QQVRIOiAnL2NvbmNlcHRzLyQwJyxcbiAgICBDT05DRVBUX1NFQVJDSF9QQVRIOiAnL2NvbmNlcHRzL3NlYXJjaGVzJyxcbiAgICBNT0RFTF9JTlBVVFNfUEFUSDogJy9tb2RlbHMvJDAvaW5wdXRzJyxcbiAgICBNT0RFTF9WRVJTSU9OX0lOUFVUU19QQVRIOiAnL21vZGVscy8kMC92ZXJzaW9ucy8kMS9pbnB1dHMnLFxuICAgIE1PREVMX1ZFUlNJT05fTUVUUklDU19QQVRIOiAnL21vZGVscy8kMC92ZXJzaW9ucy8kMS9tZXRyaWNzJyxcbiAgICBJTlBVVFNfUEFUSDogJy9pbnB1dHMnLFxuICAgIElOUFVUX1BBVEg6ICcvaW5wdXRzLyQwJyxcbiAgICBJTlBVVFNfU1RBVFVTX1BBVEg6ICcvaW5wdXRzL3N0YXR1cycsXG4gICAgU0VBUkNIX1BBVEg6ICcvc2VhcmNoZXMnLFxuICAgIFdPUktGTE9XU19QQVRIOiAnL3dvcmtmbG93cycsXG4gICAgV09SS0ZMT1dfUEFUSDogJy93b3JrZmxvd3MvJDAnLFxuICAgIFdPUktGTE9XX1JFU1VMVFNfUEFUSDogJy93b3JrZmxvd3MvJDAvcmVzdWx0cydcbiAgfSxcbiAgRVJST1JTOiB7XG4gICAgcGFyYW1zUmVxdWlyZWQ6IChwYXJhbSkgPT4ge1xuICAgICAgbGV0IHBhcmFtTGlzdCA9IEFycmF5LmlzQXJyYXkocGFyYW0pID8gcGFyYW0gOiBbcGFyYW1dO1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcihgVGhlIGZvbGxvd2luZyAke3BhcmFtTGlzdC5sZW5ndGggPiAxID8gJ3BhcmFtcyBhcmUnIDogJ3BhcmFtIGlzJ30gcmVxdWlyZWQ6ICR7cGFyYW1MaXN0LmpvaW4oJywgJyl9YCk7XG4gICAgfSxcbiAgICBNQVhfSU5QVVRTOiBuZXcgRXJyb3IoYE51bWJlciBvZiBpbnB1dHMgcGFzc2VkIGV4Y2VlZGVkIG1heCBvZiAke01BWF9CQVRDSF9TSVpFfWApLFxuICAgIElOVkFMSURfR0VPTElNSVRfVFlQRTogbmV3IEVycm9yKGBJbmNvcnJlY3QgZ2VvX2xpbWl0IHR5cGUuIFZhbHVlIG11c3QgYmUgYW55IG9mIHRoZSBmb2xsb3dpbmc6ICR7R0VPX0xJTUlUX1RZUEVTLmpvaW4oJywgJyl9YCksXG4gICAgSU5WQUxJRF9ERUxFVEVfQVJHUzogbmV3IEVycm9yKGBXcm9uZyBhcmd1bWVudHMgcGFzc2VkLiBZb3UgY2FuIG9ubHkgZGVsZXRlIGFsbCBtb2RlbHMgKHByb3ZpZGUgbm8gYXJndW1lbnRzKSwgZGVsZXRlIHNlbGVjdCBtb2RlbHMgKHByb3ZpZGUgbGlzdCBvZiBpZHMpLFxuICAgIGRlbGV0ZSBhIHNpbmdsZSBtb2RlbCAocHJvdmlkaW5nIGEgc2luZ2xlIGlkKSBvciBkZWxldGUgYSBtb2RlbCB2ZXJzaW9uIChwcm92aWRlIGEgc2luZ2xlIGlkIGFuZCB2ZXJzaW9uIGlkKWApXG4gIH0sXG4gIFNUQVRVUzoge1xuICAgIE1PREVMX1FVRVVFRF9GT1JfVFJBSU5JTkcsXG4gICAgTU9ERUxfVFJBSU5JTkdcbiAgfSxcbiAgLy8gdmFyIHJlcGxhY2VtZW50IG11c3QgYmUgZ2l2ZW4gaW4gb3JkZXJcbiAgcmVwbGFjZVZhcnM6IChwYXRoLCB2YXJzID0gW10pID0+IHtcbiAgICBsZXQgbmV3UGF0aCA9IHBhdGg7XG4gICAgdmFycy5mb3JFYWNoKCh2YWwsIGluZGV4KSA9PiB7XG4gICAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgICAgdmFsID0gZW5jb2RlVVJJQ29tcG9uZW50KHZhbCk7XG4gICAgICB9XG4gICAgICBuZXdQYXRoID0gbmV3UGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoYFxcXFwkJHtpbmRleH1gLCAnZycpLCB2YWwpO1xuICAgIH0pO1xuICAgIHJldHVybiBuZXdQYXRoO1xuICB9LFxuICBnZXRCYXNlUGF0aDogKGFwaUVuZHBvaW50ID0gJ2h0dHBzOi8vYXBpLmNsYXJpZmFpLmNvbScsIHVzZXJJZCwgYXBwSWQpID0+IHtcbiAgICBpZighdXNlcklkIHx8ICFhcHBJZCkge1xuICAgICAgcmV0dXJuIGAke2FwaUVuZHBvaW50fS92MmA7XG4gICAgfVxuICAgIHJldHVybiBgJHthcGlFbmRwb2ludH0vdjIvdXNlcnMvJHt1c2VySWR9L2FwcHMvJHthcHBJZH1gO1xuICB9LFxuICBHRU9fTElNSVRfVFlQRVMsXG4gIE1BWF9CQVRDSF9TSVpFLFxuICBVUkxfUkVHRVgsXG4gIFNZTkNfVElNRU9VVCxcbiAgUE9MTFRJTUVcbn07XG4iXX0=
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/constants.js","/")
},{"buffer":23,"pBGvAp":27}],47:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var App = require('./App');

var _require = require('./../package.json'),
    version = _require.version;

module.exports = global.Clarifai = {
  version: version,
  App: App,
  GENERAL_MODEL: 'aaa03c23b3724a16a56b629203edc62c',
  FOOD_MODEL: 'bd367be194cf45149e75f01d59f77ba7',
  TRAVEL_MODEL: 'eee28c313d69466f836ab83287a54ed9',
  NSFW_MODEL: 'e9576d86d2004ed1a38ba0cf39ecb4b1',
  WEDDINGS_MODEL: 'c386b7a870114f4a87477c0824499348',
  WEDDING_MODEL: 'c386b7a870114f4a87477c0824499348',
  COLOR_MODEL: 'eeed0b6733a644cea07cf4c60f87ebb7',
  CLUSTER_MODEL: 'cccbe437d6e54e2bb911c6aa292fb072',
  FACE_DETECT_MODEL: 'a403429f2ddf4b49b307e318f00e528b',
  FOCUS_MODEL: 'c2cf7cecd8a6427da375b9f35fcd2381',
  LOGO_MODEL: 'c443119bf2ed4da98487520d01a0b1e3',
  DEMOGRAPHICS_MODEL: 'c0c0ac362b03416da06ab3fa36fb58e3',
  GENERAL_EMBED_MODEL: 'bbb5f41425b8468d9b7a554ff10f8581',
  FACE_EMBED_MODEL: 'd02b4508df58432fbb84e800597b8959',
  APPAREL_MODEL: 'e0be3b9d6a454f0493ac3a30784001ff',
  MODERATION_MODEL: 'd16f390eb32cad478c7ae150069bd2c6'
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZha2VfOWU0OGMzNmYuanMiXSwibmFtZXMiOlsiQXBwIiwicmVxdWlyZSIsInZlcnNpb24iLCJtb2R1bGUiLCJleHBvcnRzIiwiZ2xvYmFsIiwiQ2xhcmlmYWkiLCJHRU5FUkFMX01PREVMIiwiRk9PRF9NT0RFTCIsIlRSQVZFTF9NT0RFTCIsIk5TRldfTU9ERUwiLCJXRURESU5HU19NT0RFTCIsIldFRERJTkdfTU9ERUwiLCJDT0xPUl9NT0RFTCIsIkNMVVNURVJfTU9ERUwiLCJGQUNFX0RFVEVDVF9NT0RFTCIsIkZPQ1VTX01PREVMIiwiTE9HT19NT0RFTCIsIkRFTU9HUkFQSElDU19NT0RFTCIsIkdFTkVSQUxfRU1CRURfTU9ERUwiLCJGQUNFX0VNQkVEX01PREVMIiwiQVBQQVJFTF9NT0RFTCIsIk1PREVSQVRJT05fTU9ERUwiXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSUEsTUFBTUMsUUFBUSxPQUFSLENBQVY7O2VBQ2dCQSxRQUFRLG1CQUFSLEM7SUFBWEMsTyxZQUFBQSxPOztBQUVMQyxPQUFPQyxPQUFQLEdBQWlCQyxPQUFPQyxRQUFQLEdBQWtCO0FBQ2pDSixrQkFEaUM7QUFFakNGLFVBRmlDO0FBR2pDTyxpQkFBZSxrQ0FIa0I7QUFJakNDLGNBQVksa0NBSnFCO0FBS2pDQyxnQkFBYyxrQ0FMbUI7QUFNakNDLGNBQVksa0NBTnFCO0FBT2pDQyxrQkFBZ0Isa0NBUGlCO0FBUWpDQyxpQkFBZSxrQ0FSa0I7QUFTakNDLGVBQWEsa0NBVG9CO0FBVWpDQyxpQkFBZSxrQ0FWa0I7QUFXakNDLHFCQUFtQixrQ0FYYztBQVlqQ0MsZUFBYSxrQ0Fab0I7QUFhakNDLGNBQVksa0NBYnFCO0FBY2pDQyxzQkFBb0Isa0NBZGE7QUFlakNDLHVCQUFxQixrQ0FmWTtBQWdCakNDLG9CQUFrQixrQ0FoQmU7QUFpQmpDQyxpQkFBZSxrQ0FqQmtCO0FBa0JqQ0Msb0JBQWtCO0FBbEJlLENBQW5DIiwiZmlsZSI6ImZha2VfOWU0OGMzNmYuanMiLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgQXBwID0gcmVxdWlyZSgnLi9BcHAnKTtcbmxldCB7dmVyc2lvbn0gPSByZXF1aXJlKCcuLy4uL3BhY2thZ2UuanNvbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGdsb2JhbC5DbGFyaWZhaSA9IHtcbiAgdmVyc2lvbixcbiAgQXBwLFxuICBHRU5FUkFMX01PREVMOiAnYWFhMDNjMjNiMzcyNGExNmE1NmI2MjkyMDNlZGM2MmMnLFxuICBGT09EX01PREVMOiAnYmQzNjdiZTE5NGNmNDUxNDllNzVmMDFkNTlmNzdiYTcnLFxuICBUUkFWRUxfTU9ERUw6ICdlZWUyOGMzMTNkNjk0NjZmODM2YWI4MzI4N2E1NGVkOScsXG4gIE5TRldfTU9ERUw6ICdlOTU3NmQ4NmQyMDA0ZWQxYTM4YmEwY2YzOWVjYjRiMScsXG4gIFdFRERJTkdTX01PREVMOiAnYzM4NmI3YTg3MDExNGY0YTg3NDc3YzA4MjQ0OTkzNDgnLFxuICBXRURESU5HX01PREVMOiAnYzM4NmI3YTg3MDExNGY0YTg3NDc3YzA4MjQ0OTkzNDgnLFxuICBDT0xPUl9NT0RFTDogJ2VlZWQwYjY3MzNhNjQ0Y2VhMDdjZjRjNjBmODdlYmI3JyxcbiAgQ0xVU1RFUl9NT0RFTDogJ2NjY2JlNDM3ZDZlNTRlMmJiOTExYzZhYTI5MmZiMDcyJyxcbiAgRkFDRV9ERVRFQ1RfTU9ERUw6ICdhNDAzNDI5ZjJkZGY0YjQ5YjMwN2UzMThmMDBlNTI4YicsXG4gIEZPQ1VTX01PREVMOiAnYzJjZjdjZWNkOGE2NDI3ZGEzNzViOWYzNWZjZDIzODEnLFxuICBMT0dPX01PREVMOiAnYzQ0MzExOWJmMmVkNGRhOTg0ODc1MjBkMDFhMGIxZTMnLFxuICBERU1PR1JBUEhJQ1NfTU9ERUw6ICdjMGMwYWMzNjJiMDM0MTZkYTA2YWIzZmEzNmZiNThlMycsXG4gIEdFTkVSQUxfRU1CRURfTU9ERUw6ICdiYmI1ZjQxNDI1Yjg0NjhkOWI3YTU1NGZmMTBmODU4MScsXG4gIEZBQ0VfRU1CRURfTU9ERUw6ICdkMDJiNDUwOGRmNTg0MzJmYmI4NGU4MDA1OTdiODk1OScsXG4gIEFQUEFSRUxfTU9ERUw6ICdlMGJlM2I5ZDZhNDU0ZjA0OTNhYzNhMzA3ODQwMDFmZicsXG4gIE1PREVSQVRJT05fTU9ERUw6ICdkMTZmMzkwZWIzMmNhZDQ3OGM3YWUxNTAwNjliZDJjNidcbn07Il19
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_9e48c36f.js","/")
},{"./../package.json":36,"./App":37,"buffer":23,"pBGvAp":27}],48:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var SUCCESS_CODES = [200, 201];

module.exports = {
  isSuccess: function isSuccess(response) {
    return SUCCESS_CODES.indexOf(response.status) > -1;
  },
  deleteEmpty: function deleteEmpty(obj) {
    var strict = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    Object.keys(obj).forEach(function (key) {
      if (obj[key] === null || obj[key] === undefined || strict === true && (obj[key] === '' || obj[key].length === 0 || Object.keys(obj[key]).length === 0)) {
        delete obj[key];
      }
    });
  },
  clone: function clone(obj) {
    var keys = Object.keys(obj);
    var copy = {};
    keys.forEach(function (k) {
      copy[k] = obj[k];
    });
    return copy;
  },
  checkType: function checkType(regex, val) {
    if (regex instanceof RegExp === false) {
      regex = new RegExp(regex);
    }
    return regex.test(Object.prototype.toString.call(val));
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhlbHBlcnMuanMiXSwibmFtZXMiOlsiU1VDQ0VTU19DT0RFUyIsIm1vZHVsZSIsImV4cG9ydHMiLCJpc1N1Y2Nlc3MiLCJyZXNwb25zZSIsImluZGV4T2YiLCJzdGF0dXMiLCJkZWxldGVFbXB0eSIsIm9iaiIsInN0cmljdCIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwia2V5IiwidW5kZWZpbmVkIiwibGVuZ3RoIiwiY2xvbmUiLCJjb3B5IiwiayIsImNoZWNrVHlwZSIsInJlZ2V4IiwidmFsIiwiUmVnRXhwIiwidGVzdCIsInByb3RvdHlwZSIsInRvU3RyaW5nIiwiY2FsbCJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxJQUFNQSxnQkFBZ0IsQ0FBQyxHQUFELEVBQU0sR0FBTixDQUF0Qjs7QUFFQUMsT0FBT0MsT0FBUCxHQUFpQjtBQUNmQyxhQUFXLG1CQUFDQyxRQUFELEVBQWM7QUFDdkIsV0FBT0osY0FBY0ssT0FBZCxDQUFzQkQsU0FBU0UsTUFBL0IsSUFBeUMsQ0FBQyxDQUFqRDtBQUNELEdBSGM7QUFJZkMsZUFBYSxxQkFBQ0MsR0FBRCxFQUF5QjtBQUFBLFFBQW5CQyxNQUFtQix1RUFBVixLQUFVOztBQUNwQ0MsV0FBT0MsSUFBUCxDQUFZSCxHQUFaLEVBQWlCSSxPQUFqQixDQUF5QixVQUFDQyxHQUFELEVBQVM7QUFDaEMsVUFBSUwsSUFBSUssR0FBSixNQUFhLElBQWIsSUFDRkwsSUFBSUssR0FBSixNQUFhQyxTQURYLElBRUZMLFdBQVcsSUFBWCxLQUNBRCxJQUFJSyxHQUFKLE1BQWEsRUFBYixJQUNBTCxJQUFJSyxHQUFKLEVBQVNFLE1BQVQsS0FBb0IsQ0FEcEIsSUFFQUwsT0FBT0MsSUFBUCxDQUFZSCxJQUFJSyxHQUFKLENBQVosRUFBc0JFLE1BQXRCLEtBQWlDLENBSGpDLENBRkYsRUFLdUM7QUFDckMsZUFBT1AsSUFBSUssR0FBSixDQUFQO0FBQ0Q7QUFDRixLQVREO0FBVUQsR0FmYztBQWdCZkcsU0FBTyxlQUFDUixHQUFELEVBQVM7QUFDZCxRQUFJRyxPQUFPRCxPQUFPQyxJQUFQLENBQVlILEdBQVosQ0FBWDtBQUNBLFFBQUlTLE9BQU8sRUFBWDtBQUNBTixTQUFLQyxPQUFMLENBQWEsVUFBQ00sQ0FBRCxFQUFPO0FBQ2xCRCxXQUFLQyxDQUFMLElBQVVWLElBQUlVLENBQUosQ0FBVjtBQUNELEtBRkQ7QUFHQSxXQUFPRCxJQUFQO0FBQ0QsR0F2QmM7QUF3QmZFLGFBQVcsbUJBQUNDLEtBQUQsRUFBUUMsR0FBUixFQUFnQjtBQUN6QixRQUFLRCxpQkFBaUJFLE1BQWxCLEtBQThCLEtBQWxDLEVBQXlDO0FBQ3ZDRixjQUFRLElBQUlFLE1BQUosQ0FBV0YsS0FBWCxDQUFSO0FBQ0Q7QUFDRCxXQUFPQSxNQUFNRyxJQUFOLENBQVdiLE9BQU9jLFNBQVAsQ0FBaUJDLFFBQWpCLENBQTBCQyxJQUExQixDQUErQkwsR0FBL0IsQ0FBWCxDQUFQO0FBQ0Q7QUE3QmMsQ0FBakIiLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IFNVQ0NFU1NfQ09ERVMgPSBbMjAwLCAyMDFdO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaXNTdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICByZXR1cm4gU1VDQ0VTU19DT0RFUy5pbmRleE9mKHJlc3BvbnNlLnN0YXR1cykgPiAtMTtcbiAgfSxcbiAgZGVsZXRlRW1wdHk6IChvYmosIHN0cmljdCA9IGZhbHNlKSA9PiB7XG4gICAgT2JqZWN0LmtleXMob2JqKS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgIGlmIChvYmpba2V5XSA9PT0gbnVsbCB8fFxuICAgICAgICBvYmpba2V5XSA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIHN0cmljdCA9PT0gdHJ1ZSAmJiAoXG4gICAgICAgIG9ialtrZXldID09PSAnJyB8fFxuICAgICAgICBvYmpba2V5XS5sZW5ndGggPT09IDAgfHxcbiAgICAgICAgT2JqZWN0LmtleXMob2JqW2tleV0pLmxlbmd0aCA9PT0gMCkpIHtcbiAgICAgICAgZGVsZXRlIG9ialtrZXldO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBjbG9uZTogKG9iaikgPT4ge1xuICAgIGxldCBrZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgICBsZXQgY29weSA9IHt9O1xuICAgIGtleXMuZm9yRWFjaCgoaykgPT4ge1xuICAgICAgY29weVtrXSA9IG9ialtrXTtcbiAgICB9KTtcbiAgICByZXR1cm4gY29weTtcbiAgfSxcbiAgY2hlY2tUeXBlOiAocmVnZXgsIHZhbCkgPT4ge1xuICAgIGlmICgocmVnZXggaW5zdGFuY2VvZiBSZWdFeHApID09PSBmYWxzZSkge1xuICAgICAgcmVnZXggPSBuZXcgUmVnRXhwKHJlZ2V4KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlZ2V4LnRlc3QoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbCkpO1xuICB9XG59O1xuIl19
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/helpers.js","/")
},{"buffer":23,"pBGvAp":27}],49:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Promise = require('promise');

var _require = require('./constants'),
    URL_REGEX = _require.URL_REGEX,
    GEO_LIMIT_TYPES = _require.GEO_LIMIT_TYPES,
    ERRORS = _require.ERRORS;

var _require2 = require('./helpers'),
    checkType = _require2.checkType,
    clone = _require2.clone;

var _require3 = require('./../package.json'),
    VERSION = _require3.version;

module.exports = {
  wrapToken: function wrapToken(_config, requestFn) {
    return new Promise(function (resolve, reject) {
      if (_config.apiKey) {
        var headers = {
          Authorization: 'Key ' + _config.apiKey,
          'X-Clarifai-Client': 'js:' + VERSION
        };
        return requestFn(headers).then(resolve, reject);
      }
      if (_config.sessionToken) {
        var _headers = {
          'X-Clarifai-Session-Token': _config.sessionToken,
          'X-Clarifai-Client': 'js:' + VERSION
        };
        return requestFn(_headers).then(resolve, reject);
      }
      _config.token().then(function (token) {
        var headers = {
          Authorization: 'Bearer ' + token.accessToken,
          'X-Clarifai-Client': 'js:' + VERSION
        };
        requestFn(headers).then(resolve, reject);
      }, reject);
    });
  },
  formatModel: function formatModel() {
    var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var formatted = {};
    if (data.id === null || data.id === undefined) {
      throw ERRORS.paramsRequired('Model ID');
    }
    formatted.id = data.id;
    if (data.name) {
      formatted.name = data.name;
    }
    formatted.output_info = {};
    if (data.conceptsMutuallyExclusive !== undefined) {
      formatted.output_info.output_config = formatted.output_info.output_config || {};
      formatted.output_info.output_config.concepts_mutually_exclusive = !!data.conceptsMutuallyExclusive;
    }
    if (data.closedEnvironment !== undefined) {
      formatted.output_info.output_config = formatted.output_info.output_config || {};
      formatted.output_info.output_config.closed_environment = !!data.closedEnvironment;
    }
    if (data.concepts) {
      formatted.output_info.data = {
        concepts: data.concepts.map(module.exports.formatConcept)
      };
    }
    return formatted;
  },
  formatInput: function formatInput(data, includeImage) {
    var input = checkType(/String/, data) ? { url: data } : data;
    var formatted = {
      id: input.id || null,
      data: {}
    };
    if (input.concepts) {
      formatted.data.concepts = input.concepts;
    }
    if (input.metadata) {
      formatted.data.metadata = input.metadata;
    }
    if (input.geo) {
      formatted.data.geo = { geo_point: input.geo };
    }
    if (includeImage !== false) {
      formatted.data.image = {
        url: input.url,
        base64: input.base64,
        crop: input.crop
      };
      if (data.allowDuplicateUrl) {
        formatted.data.image.allow_duplicate_url = true;
      }
    }
    return formatted;
  },
  formatMediaPredict: function formatMediaPredict(data) {
    var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'image';

    var media = void 0;
    if (checkType(/String/, data)) {
      if (URL_REGEX.test(data) === true) {
        media = {
          url: data
        };
      } else {
        media = {
          base64: data
        };
      }
    } else {
      media = Object.assign({}, data);
    }

    // Users can specify their own id to distinguish batch results
    var id = void 0;
    if (media.id) {
      id = media.id;
      delete media.id;
    }

    var object = {
      data: _defineProperty({}, type, media)
    };

    if (id) {
      object.id = id;
    }

    return object;
  },
  formatImagesSearch: function formatImagesSearch(image) {
    var imageQuery = void 0;
    var input = { input: { data: {} } };
    var formatted = [];
    if (checkType(/String/, image)) {
      imageQuery = { url: image };
    } else {
      imageQuery = image.url || image.base64 ? {
        image: {
          url: image.url,
          base64: image.base64,
          crop: image.crop
        }
      } : {};
    }

    input.input.data = imageQuery;
    if (image.id) {
      input.input.id = image.id;
      input.input.data = { image: {} };
      if (image.crop) {
        input.input.data.image.crop = image.crop;
      }
    }
    if (image.metadata !== undefined) {
      input.input.data.metadata = image.metadata;
    }
    if (image.geo !== undefined) {
      if (checkType(/Array/, image.geo)) {
        input.input.data.geo = {
          geo_box: image.geo.map(function (p) {
            return { geo_point: p };
          })
        };
      } else if (checkType(/Object/, image.geo)) {
        if (GEO_LIMIT_TYPES.indexOf(image.geo.type) === -1) {
          throw ERRORS.INVALID_GEOLIMIT_TYPE;
        }
        input.input.data.geo = {
          geo_point: {
            latitude: image.geo.latitude,
            longitude: image.geo.longitude
          },
          geo_limit: {
            type: image.geo.type,
            value: image.geo.value
          }
        };
      }
    }
    if (image.type !== 'input' && input.input.data.image) {
      if (input.input.data.metadata || input.input.data.geo) {
        var dataCopy = { input: { data: clone(input.input.data) } };
        var imageCopy = { input: { data: clone(input.input.data) } };
        delete dataCopy.input.data.image;
        delete imageCopy.input.data.metadata;
        delete imageCopy.input.data.geo;
        input = [{ output: imageCopy }, dataCopy];
      } else {
        input = [{ output: input }];
      }
    }
    formatted = formatted.concat(input);
    return formatted;
  },
  formatConcept: function formatConcept(concept) {
    var formatted = concept;
    if (checkType(/String/, concept)) {
      formatted = {
        id: concept
      };
    }
    return formatted;
  },
  formatConceptsSearch: function formatConceptsSearch(query) {
    if (checkType(/String/, query)) {
      query = { id: query };
    }
    var v = {};
    var type = query.type === 'input' ? 'input' : 'output';
    delete query.type;
    v[type] = {
      data: {
        concepts: [query]
      }
    };
    return v;
  },
  formatObjectForSnakeCase: function formatObjectForSnakeCase(obj) {
    return Object.keys(obj).reduce(function (o, k) {
      o[k.replace(/([A-Z])/g, function (r) {
        return '_' + r.toLowerCase();
      })] = obj[k];
      return o;
    }, {});
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInV0aWxzLmpzIl0sIm5hbWVzIjpbIlByb21pc2UiLCJyZXF1aXJlIiwiVVJMX1JFR0VYIiwiR0VPX0xJTUlUX1RZUEVTIiwiRVJST1JTIiwiY2hlY2tUeXBlIiwiY2xvbmUiLCJWRVJTSU9OIiwidmVyc2lvbiIsIm1vZHVsZSIsImV4cG9ydHMiLCJ3cmFwVG9rZW4iLCJfY29uZmlnIiwicmVxdWVzdEZuIiwicmVzb2x2ZSIsInJlamVjdCIsImFwaUtleSIsImhlYWRlcnMiLCJBdXRob3JpemF0aW9uIiwidGhlbiIsInNlc3Npb25Ub2tlbiIsInRva2VuIiwiYWNjZXNzVG9rZW4iLCJmb3JtYXRNb2RlbCIsImRhdGEiLCJmb3JtYXR0ZWQiLCJpZCIsInVuZGVmaW5lZCIsInBhcmFtc1JlcXVpcmVkIiwibmFtZSIsIm91dHB1dF9pbmZvIiwiY29uY2VwdHNNdXR1YWxseUV4Y2x1c2l2ZSIsIm91dHB1dF9jb25maWciLCJjb25jZXB0c19tdXR1YWxseV9leGNsdXNpdmUiLCJjbG9zZWRFbnZpcm9ubWVudCIsImNsb3NlZF9lbnZpcm9ubWVudCIsImNvbmNlcHRzIiwibWFwIiwiZm9ybWF0Q29uY2VwdCIsImZvcm1hdElucHV0IiwiaW5jbHVkZUltYWdlIiwiaW5wdXQiLCJ1cmwiLCJtZXRhZGF0YSIsImdlbyIsImdlb19wb2ludCIsImltYWdlIiwiYmFzZTY0IiwiY3JvcCIsImFsbG93RHVwbGljYXRlVXJsIiwiYWxsb3dfZHVwbGljYXRlX3VybCIsImZvcm1hdE1lZGlhUHJlZGljdCIsInR5cGUiLCJtZWRpYSIsInRlc3QiLCJPYmplY3QiLCJhc3NpZ24iLCJvYmplY3QiLCJmb3JtYXRJbWFnZXNTZWFyY2giLCJpbWFnZVF1ZXJ5IiwiZ2VvX2JveCIsInAiLCJpbmRleE9mIiwiSU5WQUxJRF9HRU9MSU1JVF9UWVBFIiwibGF0aXR1ZGUiLCJsb25naXR1ZGUiLCJnZW9fbGltaXQiLCJ2YWx1ZSIsImRhdGFDb3B5IiwiaW1hZ2VDb3B5Iiwib3V0cHV0IiwiY29uY2F0IiwiY29uY2VwdCIsImZvcm1hdENvbmNlcHRzU2VhcmNoIiwicXVlcnkiLCJ2IiwiZm9ybWF0T2JqZWN0Rm9yU25ha2VDYXNlIiwib2JqIiwia2V5cyIsInJlZHVjZSIsIm8iLCJrIiwicmVwbGFjZSIsInIiLCJ0b0xvd2VyQ2FzZSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLElBQUlBLFVBQVVDLFFBQVEsU0FBUixDQUFkOztlQUMyQ0EsUUFBUSxhQUFSLEM7SUFBdENDLFMsWUFBQUEsUztJQUFXQyxlLFlBQUFBLGU7SUFBaUJDLE0sWUFBQUEsTTs7Z0JBQ1JILFFBQVEsV0FBUixDO0lBQXBCSSxTLGFBQUFBLFM7SUFBV0MsSyxhQUFBQSxLOztnQkFDU0wsUUFBUSxtQkFBUixDO0lBQVhNLE8sYUFBVEMsTzs7QUFFTEMsT0FBT0MsT0FBUCxHQUFpQjtBQUNmQyxhQUFXLG1CQUFDQyxPQUFELEVBQVVDLFNBQVYsRUFBd0I7QUFDakMsV0FBTyxJQUFJYixPQUFKLENBQVksVUFBQ2MsT0FBRCxFQUFVQyxNQUFWLEVBQXFCO0FBQ3RDLFVBQUlILFFBQVFJLE1BQVosRUFBb0I7QUFDbEIsWUFBSUMsVUFBVTtBQUNaQyxrQ0FBc0JOLFFBQVFJLE1BRGxCO0FBRVosdUNBQTJCVDtBQUZmLFNBQWQ7QUFJQSxlQUFPTSxVQUFVSSxPQUFWLEVBQW1CRSxJQUFuQixDQUF3QkwsT0FBeEIsRUFBaUNDLE1BQWpDLENBQVA7QUFDRDtBQUNELFVBQUlILFFBQVFRLFlBQVosRUFBMEI7QUFDeEIsWUFBSUgsV0FBVTtBQUNaLHNDQUE0QkwsUUFBUVEsWUFEeEI7QUFFWix1Q0FBMkJiO0FBRmYsU0FBZDtBQUlBLGVBQU9NLFVBQVVJLFFBQVYsRUFBbUJFLElBQW5CLENBQXdCTCxPQUF4QixFQUFpQ0MsTUFBakMsQ0FBUDtBQUNEO0FBQ0RILGNBQVFTLEtBQVIsR0FBZ0JGLElBQWhCLENBQXFCLFVBQUNFLEtBQUQsRUFBVztBQUM5QixZQUFJSixVQUFVO0FBQ1pDLHFDQUF5QkcsTUFBTUMsV0FEbkI7QUFFWix1Q0FBMkJm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LFNBQVA7QUFDRCxHQXRMYztBQXVMZmEsaUJBQWUsdUJBQUNrQyxPQUFELEVBQWE7QUFDMUIsUUFBSS9DLFlBQVkrQyxPQUFoQjtBQUNBLFFBQUluRSxVQUFVLFFBQVYsRUFBb0JtRSxPQUFwQixDQUFKLEVBQWtDO0FBQ2hDL0Msa0JBQVk7QUFDVkMsWUFBSThDO0FBRE0sT0FBWjtBQUdEO0FBQ0QsV0FBTy9DLFNBQVA7QUFDRCxHQS9MYztBQWdNZmdELHdCQUFzQiw4QkFBQ0MsS0FBRCxFQUFXO0FBQy9CLFFBQUlyRSxVQUFVLFFBQVYsRUFBb0JxRSxLQUFwQixDQUFKLEVBQWdDO0FBQzlCQSxjQUFRLEVBQUNoRCxJQUFJZ0QsS0FBTCxFQUFSO0FBQ0Q7QUFDRCxRQUFJQyxJQUFJLEVBQVI7QUFDQSxRQUFJdkIsT0FBT3NCLE1BQU10QixJQUFOLEtBQWUsT0FBZixHQUF5QixPQUF6QixHQUFtQyxRQUE5QztBQUNBLFdBQU9zQixNQUFNdEIsSUFBYjtBQUNBdUIsTUFBRXZCLElBQUYsSUFBVTtBQUNSNUIsWUFBTTtBQUNKWSxrQkFBVSxDQUFDc0MsS0FBRDtBQUROO0FBREUsS0FBVjtBQUtBLFdBQU9DLENBQVA7QUFDRCxHQTdNYztBQThNZkMsMEJBOU1lLG9DQThNVUMsR0E5TVYsRUE4TWU7QUFDNUIsV0FBT3RCLE9BQU91QixJQUFQLENBQVlELEdBQVosRUFBaUJFLE1BQWpCLENBQXdCLFVBQUNDLENBQUQsRUFBSUMsQ0FBSixFQUFVO0FBQ3ZDRCxRQUFFQyxFQUFFQyxPQUFGLENBQVUsVUFBVixFQUFzQjtBQUFBLGVBQUssTUFBSUMsRUFBRUMsV0FBRixFQUFUO0FBQUEsT0FBdEIsQ0FBRixJQUFxRFAsSUFBSUksQ0FBSixDQUFyRDtBQUNBLGFBQU9ELENBQVA7QUFDRCxLQUhNLEVBR0osRUFISSxDQUFQO0FBSUQ7QUFuTmMsQ0FBakIiLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgUHJvbWlzZSA9IHJlcXVpcmUoJ3Byb21pc2UnKTtcbmxldCB7VVJMX1JFR0VYLCBHRU9fTElNSVRfVFlQRVMsIEVSUk9SU30gPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xubGV0IHtjaGVja1R5cGUsIGNsb25lfSA9IHJlcXVpcmUoJy4vaGVscGVycycpO1xubGV0IHt2ZXJzaW9uOiBWRVJTSU9OfSA9IHJlcXVpcmUoJy4vLi4vcGFja2FnZS5qc29uJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB3cmFwVG9rZW46IChfY29uZmlnLCByZXF1ZXN0Rm4pID0+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaWYgKF9jb25maWcuYXBpS2V5KSB7XG4gICAgICAgIGxldCBoZWFkZXJzID0ge1xuICAgICAgICAgIEF1dGhvcml6YXRpb246IGBLZXkgJHtfY29uZmlnLmFwaUtleX1gLFxuICAgICAgICAgICdYLUNsYXJpZmFpLUNsaWVudCc6IGBqczoke1ZFUlNJT059YFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcmVxdWVzdEZuKGhlYWRlcnMpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgIH1cbiAgICAgIGlmIChfY29uZmlnLnNlc3Npb25Ub2tlbikge1xuICAgICAgICBsZXQgaGVhZGVycyA9IHtcbiAgICAgICAgICAnWC1DbGFyaWZhaS1TZXNzaW9uLVRva2VuJzogX2NvbmZpZy5zZXNzaW9uVG9rZW4sXG4gICAgICAgICAgJ1gtQ2xhcmlmYWktQ2xpZW50JzogYGpzOiR7VkVSU0lPTn1gXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiByZXF1ZXN0Rm4oaGVhZGVycykudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgfVxuICAgICAgX2NvbmZpZy50b2tlbigpLnRoZW4oKHRva2VuKSA9PiB7XG4gICAgICAgIGxldCBoZWFkZXJzID0ge1xuICAgICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0b2tlbi5hY2Nlc3NUb2tlbn1gLFxuICAgICAgICAgICdYLUNsYXJpZmFpLUNsaWVudCc6IGBqczoke1ZFUlNJT059YFxuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0Rm4oaGVhZGVycykudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgfSwgcmVqZWN0KTtcbiAgICB9KTtcbiAgfSxcbiAgZm9ybWF0TW9kZWw6IChkYXRhID0ge30pID0+IHtcbiAgICBsZXQgZm9ybWF0dGVkID0ge307XG4gICAgaWYgKGRhdGEuaWQgPT09IG51bGwgfHwgZGF0YS5pZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBFUlJPUlMucGFyYW1zUmVxdWlyZWQoJ01vZGVsIElEJyk7XG4gICAgfVxuICAgIGZvcm1hdHRlZC5pZCA9IGRhdGEuaWQ7XG4gICAgaWYgKGRhdGEubmFtZSkge1xuICAgICAgZm9ybWF0dGVkLm5hbWUgPSBkYXRhLm5hbWU7XG4gICAgfVxuICAgIGZvcm1hdHRlZC5vdXRwdXRfaW5mbyA9IHt9O1xuICAgIGlmIChkYXRhLmNvbmNlcHRzTXV0dWFsbHlFeGNsdXNpdmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZm9ybWF0dGVkLm91dHB1dF9pbmZvLm91dHB1dF9jb25maWcgPSBmb3JtYXR0ZWQub3V0cHV0X2luZm8ub3V0cHV0X2NvbmZpZyB8fCB7fTtcbiAgICAgIGZvcm1hdHRlZC5vdXRwdXRfaW5mby5vdXRwdXRfY29uZmlnLmNvbmNlcHRzX211dHVhbGx5X2V4Y2x1c2l2ZSA9ICEhZGF0YS5jb25jZXB0c011dHVhbGx5RXhjbHVzaXZlO1xuICAgIH1cbiAgICBpZiAoZGF0YS5jbG9zZWRFbnZpcm9ubWVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBmb3JtYXR0ZWQub3V0cHV0X2luZm8ub3V0cHV0X2NvbmZpZyA9IGZvcm1hdHRlZC5vdXRwdXRfaW5mby5vdXRwdXRfY29uZmlnIHx8IHt9O1xuICAgICAgZm9ybWF0dGVkLm91dHB1dF9pbmZvLm91dHB1dF9jb25maWcuY2xvc2VkX2Vudmlyb25tZW50ID0gISFkYXRhLmNsb3NlZEVudmlyb25tZW50O1xuICAgIH1cbiAgICBpZiAoZGF0YS5jb25jZXB0cykge1xuICAgICAgZm9ybWF0dGVkLm91dHB1dF9pbmZvLmRhdGEgPSB7XG4gICAgICAgIGNvbmNlcHRzOiBkYXRhLmNvbmNlcHRzLm1hcChtb2R1bGUuZXhwb3J0cy5mb3JtYXRDb25jZXB0KVxuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGZvcm1hdHRlZDtcbiAgfSxcbiAgZm9ybWF0SW5wdXQ6IChkYXRhLCBpbmNsdWRlSW1hZ2UpID0+IHtcbiAgICBsZXQgaW5wdXQgPSBjaGVja1R5cGUoL1N0cmluZy8sIGRhdGEpID9cbiAgICAgIHt1cmw6IGRhdGF9IDpcbiAgICAgIGRhdGE7XG4gICAgbGV0IGZvcm1hdHRlZCA9IHtcbiAgICAgIGlkOiBpbnB1dC5pZCB8fCBudWxsLFxuICAgICAgZGF0YToge31cbiAgICB9O1xuICAgIGlmIChpbnB1dC5jb25jZXB0cykge1xuICAgICAgZm9ybWF0dGVkLmRhdGEuY29uY2VwdHMgPSBpbnB1dC5jb25jZXB0cztcbiAgICB9XG4gICAgaWYgKGlucHV0Lm1ldGFkYXRhKSB7XG4gICAgICBmb3JtYXR0ZWQuZGF0YS5tZXRhZGF0YSA9IGlucHV0Lm1ldGFkYXRhO1xuICAgIH1cbiAgICBpZiAoaW5wdXQuZ2VvKSB7XG4gICAgICBmb3JtYXR0ZWQuZGF0YS5nZW8gPSB7Z2VvX3BvaW50OiBpbnB1dC5nZW99O1xuICAgIH1cbiAgICBpZiAoaW5jbHVkZUltYWdlICE9PSBmYWxzZSkge1xuICAgICAgZm9ybWF0dGVkLmRhdGEuaW1hZ2UgPSB7XG4gICAgICAgIHVybDogaW5wdXQudXJsLFxuICAgICAgICBiYXNlNjQ6IGlucHV0LmJhc2U2NCxcbiAgICAgICAgY3JvcDogaW5wdXQuY3JvcFxuICAgICAgfTtcbiAgICAgIGlmIChkYXRhLmFsbG93RHVwbGljYXRlVXJsKSB7XG4gICAgICAgIGZvcm1hdHRlZC5kYXRhLmltYWdlLmFsbG93X2R1cGxpY2F0ZV91cmwgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZm9ybWF0dGVkO1xuICB9LFxuICBmb3JtYXRNZWRpYVByZWRpY3Q6IChkYXRhLCB0eXBlID0gJ2ltYWdlJykgPT4ge1xuICAgIGxldCBtZWRpYTtcbiAgICBpZiAoY2hlY2tUeXBlKC9TdHJpbmcvLCBkYXRhKSkge1xuICAgICAgaWYgKFVSTF9SRUdFWC50ZXN0KGRhdGEpID09PSB0cnVlKSB7XG4gICAgICAgIG1lZGlhID0ge1xuICAgICAgICAgIHVybDogZGF0YVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVkaWEgPSB7XG4gICAgICAgICAgYmFzZTY0OiBkYXRhXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG1lZGlhID0gT2JqZWN0LmFzc2lnbih7fSwgZGF0YSk7XG4gICAgfVxuXG4gICAgLy8gVXNlcnMgY2FuIHNwZWNpZnkgdGhlaXIgb3duIGlkIHRvIGRpc3Rpbmd1aXNoIGJhdGNoIHJlc3VsdHNcbiAgICBsZXQgaWQ7XG4gICAgaWYgKG1lZGlhLmlkKSB7XG4gICAgICBpZCA9IG1lZGlhLmlkO1xuICAgICAgZGVsZXRlIG1lZGlhLmlkO1xuICAgIH1cblxuICAgIGxldCBvYmplY3QgPSB7XG4gICAgICBkYXRhOiB7XG4gICAgICAgIFt0eXBlXTogbWVkaWFcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGlkKSB7XG4gICAgICBvYmplY3QuaWQgPSBpZDtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqZWN0O1xuICB9LFxuICBmb3JtYXRJbWFnZXNTZWFyY2g6IChpbWFnZSkgPT4ge1xuICAgIGxldCBpbWFnZVF1ZXJ5O1xuICAgIGxldCBpbnB1dCA9IHtpbnB1dDoge2RhdGE6IHt9fX07XG4gICAgbGV0IGZvcm1hdHRlZCA9IFtdO1xuICAgIGlmIChjaGVja1R5cGUoL1N0cmluZy8sIGltYWdlKSkge1xuICAgICAgaW1hZ2VRdWVyeSA9IHt1cmw6IGltYWdlfTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW1hZ2VRdWVyeSA9IChpbWFnZS51cmwgfHwgaW1hZ2UuYmFzZTY0KSA/IHtcbiAgICAgICAgaW1hZ2U6IHtcbiAgICAgICAgICB1cmw6IGltYWdlLnVybCxcbiAgICAgICAgICBiYXNlNjQ6IGltYWdlLmJhc2U2NCxcbiAgICAgICAgICBjcm9wOiBpbWFnZS5jcm9wXG4gICAgICAgIH1cbiAgICAgIH0gOiB7fTtcbiAgICB9XG5cbiAgICBpbnB1dC5pbnB1dC5kYXRhID0gaW1hZ2VRdWVyeTtcbiAgICBpZiAoaW1hZ2UuaWQpIHtcbiAgICAgIGlucHV0LmlucHV0LmlkID0gaW1hZ2UuaWQ7XG4gICAgICBpbnB1dC5pbnB1dC5kYXRhID0ge2ltYWdlOiB7fX07XG4gICAgICBpZihpbWFnZS5jcm9wKSB7XG4gICAgICAgIGlucHV0LmlucHV0LmRhdGEuaW1hZ2UuY3JvcCA9IGltYWdlLmNyb3A7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpbWFnZS5tZXRhZGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpbnB1dC5pbnB1dC5kYXRhLm1ldGFkYXRhID0gaW1hZ2UubWV0YWRhdGE7XG4gICAgfVxuICAgIGlmIChpbWFnZS5nZW8gIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKGNoZWNrVHlwZSgvQXJyYXkvLCBpbWFnZS5nZW8pKSB7XG4gICAgICAgIGlucHV0LmlucHV0LmRhdGEuZ2VvID0ge1xuICAgICAgICAgIGdlb19ib3g6IGltYWdlLmdlby5tYXAocCA9PiB7XG4gICAgICAgICAgICByZXR1cm4ge2dlb19wb2ludDogcH07XG4gICAgICAgICAgfSlcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAoY2hlY2tUeXBlKC9PYmplY3QvLCBpbWFnZS5nZW8pKSB7XG4gICAgICAgIGlmIChHRU9fTElNSVRfVFlQRVMuaW5kZXhPZihpbWFnZS5nZW8udHlwZSkgPT09IC0xKSB7XG4gICAgICAgICAgdGhyb3cgRVJST1JTLklOVkFMSURfR0VPTElNSVRfVFlQRTtcbiAgICAgICAgfVxuICAgICAgICBpbnB1dC5pbnB1dC5kYXRhLmdlbyA9IHtcbiAgICAgICAgICBnZW9fcG9pbnQ6IHtcbiAgICAgICAgICAgIGxhdGl0dWRlOiBpbWFnZS5nZW8ubGF0aXR1ZGUsXG4gICAgICAgICAgICBsb25naXR1ZGU6IGltYWdlLmdlby5sb25naXR1ZGVcbiAgICAgICAgICB9LFxuICAgICAgICAgIGdlb19saW1pdDoge1xuICAgICAgICAgICAgdHlwZTogaW1hZ2UuZ2VvLnR5cGUsXG4gICAgICAgICAgICB2YWx1ZTogaW1hZ2UuZ2VvLnZhbHVlXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaW1hZ2UudHlwZSAhPT0gJ2lucHV0JyAmJiBpbnB1dC5pbnB1dC5kYXRhLmltYWdlKSB7XG4gICAgICBpZiAoaW5wdXQuaW5wdXQuZGF0YS5tZXRhZGF0YSB8fCBpbnB1dC5pbnB1dC5kYXRhLmdlbykge1xuICAgICAgICBsZXQgZGF0YUNvcHkgPSB7aW5wdXQ6IHtkYXRhOiBjbG9uZShpbnB1dC5pbnB1dC5kYXRhKX19O1xuICAgICAgICBsZXQgaW1hZ2VDb3B5ID0ge2lucHV0OiB7ZGF0YTogY2xvbmUoaW5wdXQuaW5wdXQuZGF0YSl9fTtcbiAgICAgICAgZGVsZXRlIGRhdGFDb3B5LmlucHV0LmRhdGEuaW1hZ2U7XG4gICAgICAgIGRlbGV0ZSBpbWFnZUNvcHkuaW5wdXQuZGF0YS5tZXRhZGF0YTtcbiAgICAgICAgZGVsZXRlIGltYWdlQ29weS5pbnB1dC5kYXRhLmdlbztcbiAgICAgICAgaW5wdXQgPSBbXG4gICAgICAgICAge291dHB1dDogaW1hZ2VDb3B5fSxcbiAgICAgICAgICBkYXRhQ29weVxuICAgICAgICBdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5wdXQgPSBbe291dHB1dDogaW5wdXR9XTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9ybWF0dGVkID0gZm9ybWF0dGVkLmNvbmNhdChpbnB1dCk7XG4gICAgcmV0dXJuIGZvcm1hdHRlZDtcbiAgfSxcbiAgZm9ybWF0Q29uY2VwdDogKGNvbmNlcHQpID0+IHtcbiAgICBsZXQgZm9ybWF0dGVkID0gY29uY2VwdDtcbiAgICBpZiAoY2hlY2tUeXBlKC9TdHJpbmcvLCBjb25jZXB0KSkge1xuICAgICAgZm9ybWF0dGVkID0ge1xuICAgICAgICBpZDogY29uY2VwdFxuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGZvcm1hdHRlZDtcbiAgfSxcbiAgZm9ybWF0Q29uY2VwdHNTZWFyY2g6IChxdWVyeSkgPT4ge1xuICAgIGlmIChjaGVja1R5cGUoL1N0cmluZy8sIHF1ZXJ5KSkge1xuICAgICAgcXVlcnkgPSB7aWQ6IHF1ZXJ5fTtcbiAgICB9XG4gICAgbGV0IHYgPSB7fTtcbiAgICBsZXQgdHlwZSA9IHF1ZXJ5LnR5cGUgPT09ICdpbnB1dCcgPyAnaW5wdXQnIDogJ291dHB1dCc7XG4gICAgZGVsZXRlIHF1ZXJ5LnR5cGU7XG4gICAgdlt0eXBlXSA9IHtcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgY29uY2VwdHM6IFtxdWVyeV1cbiAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiB2O1xuICB9LFxuICBmb3JtYXRPYmplY3RGb3JTbmFrZUNhc2Uob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iaikucmVkdWNlKChvLCBrKSA9PiB7XG4gICAgICBvW2sucmVwbGFjZSgvKFtBLVpdKS9nLCByID0+ICdfJytyLnRvTG93ZXJDYXNlKCkpXSA9IG9ialtrXTtcbiAgICAgIHJldHVybiBvO1xuICAgIH0sIHt9KTtcbiAgfVxufTtcbiJdfQ==
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/utils.js","/")
},{"./../package.json":36,"./constants":46,"./helpers":48,"buffer":23,"pBGvAp":27,"promise":28}]},{},[47])