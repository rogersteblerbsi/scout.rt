/*******************************************************************************
 * Copyright (c) 2014-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.Session = function() {
  this.$entryPoint;
  this.partId = 0;

  this.url = new scout.URL();
  this.userAgent = new scout.UserAgent({
    deviceType: scout.device.type,
    touch: scout.device.supportsTouch(),
    standalone: scout.device.isStandalone()
  });
  this.locale;
  this.textMap = new scout.TextMap();

  this.ready = false; // true after desktop has been completely rendered
  this.unloading = false; // true when 'beforeOnload' event has been triggered
  this.unloaded = false; // true after unload event has been received from the window
  this.loggedOut = false;
  this.inspector = false;
  this.persistent = false;
  this.desktop;
  this.layoutValidator = new scout.LayoutValidator();
  this.detachHelper = new scout.DetachHelper(this);
  this.focusManager;
  this.keyStrokeManager;

  // TODO [7.0] awe, cgu, bsh: Split in "RemoteSession" and "???" (maybe move to App)
  this.uiSessionId; // assigned by server on session startup (OWASP recommendation, see https://www.owasp.org/index.php/Cross-Site_Request_Forgery_%28CSRF%29_Prevention_Cheat_Sheet#General_Recommendation:_Synchronizer_Token_Pattern).
  this.clientSessionId = this._getClientSessionIdFromStorage();
  this.forceNewClientSession = false;
  this.remoteUrl = 'json';
  this.unloadUrl = 'unload';
  this.modelAdapterRegistry = {};
  this.ajaxCalls = [];
  this.asyncEvents = [];
  this.responseQueue = new scout.ResponseQueue(this);
  this.requestsPendingCounter = 0;
  this.suppressErrors = false;
  this.requestTimeoutCancel = 5000; // ms
  this.requestTimeoutPoll = 75000; // ms, depends on polling interval, will therefore be initialized on startup
  this.requestTimeoutPing = 5000; // ms
  this.backgroundJobPollingSupport = new scout.BackgroundJobPollingSupport(true);
  this.reconnector = new scout.Reconnector(this);

  // This property is enabled by URL parameter &adapterExportEnabled=1. Default is false
  this.adapterExportEnabled = false;
  this._adapterDataCache = {};
  this._busy = false;
  this._busyIndicator;
  this._busyIndicatorTimeoutId;
  this._$requestPending;
  this._deferred;
  this._fatalMessagesOnScreen = {};
  this._retryRequest;
  this._queuedRequest;
  this.requestSequenceNo = 0;

  this.rootAdapter = new scout.ModelAdapter();
  this.rootAdapter.init({
    session: this,
    id: '1',
    objectType: 'RootAdapter'
  });
  this.root = this.rootAdapter.createWidget({
    session: this,
    id: '1',
    objectType: 'NullWidget'
  }, new scout.NullWidget());
  this.events = this._createEventSupport();
};

// Corresponds to constants in JsonResponse
scout.Session.JsonResponseError = {
  STARTUP_FAILED: 5,
  SESSION_TIMEOUT: 10,
  UI_PROCESSING: 20,
  UNSAFE_UPLOAD: 30,
  VERSION_MISMATCH: 40
};

// Placeholder string for an empty filename
scout.Session.EMPTY_UPLOAD_FILENAME = '*empty*';

/**
 * $entryPoint is required to create a new session.
 *
 * The 'options' argument holds all optional values that may be used during
 * initialization (it is the same object passed to the scout.init() function).
 * The following 'options' properties are read by this constructor function:
 *   [portletPartId]
 *     Optional, default is 0. Necessary when multiple UI sessions are managed
 *     by the same window (portlet support). Each session's partId must be unique.
 *   [clientSessionId]
 *     Identifies the 'client instance' on the UI server. If the property is not set
 *     (which is the default case), the clientSessionId is taken from the browser's
 *     session storage (per browser window, survives F5 refresh of page). If no
 *     clientSessionId can be found, a new one is generated on the server.
 *   [userAgent]
 *     Default: DESKTOP
 *   [backgroundJobPollingEnabled]
 *     Unless websockets is used, this property turns on (default) or off background
 *     polling using an async ajax call together with setTimeout()
 *   [suppressErrors]
 *     Basically added because of Jasmine-tests. When working with async tests that
 *     use setTimeout(), sometimes the Jasmine-Maven plug-in fails and aborts the
 *     build because there were console errors. These errors always happen in this
 *     class. That's why we can skip suppress error handling with this flag.
 *   [focusManagerActive]
 *     Forces the focus manager to be active or not. If undefined, the value is
 *     auto detected by Device.js.
 *   [showTreeIcons]
 *     Optional, default is false. Whether or not tree and outline show the icon
 *     which is defined by the iconId property. Until Scout 6.1 trees did not have
 *     icons. With Scout 6.1 and later trees can have icons and this init property
 *     has been added to support the old behavior (no icons at all) without changing
 *     existing code. From Scout 7.0 showTreeIcons will be true by default, which
 *     means projects have to (potentially) migrate existing code. With 8.0 the flag will be removed.
 *   [reconnectorOptions]
 *     Optional, properties of this object are copied to the Session's reconnector
 *     instance (see Reconnector.js).
 *   [ajaxCallOptions]
 *     Optional, properties of this object are copied to all instances of AjaxCall.js.
 */
scout.Session.prototype.init = function(model) {
  var options = model || {};

  if (!options.$entryPoint) {
    throw new Error('$entryPoint is not defined');
  }
  this.$entryPoint = options.$entryPoint;
  this.partId = scout.nvl(options.portletPartId, this.partId);
  this.forceNewClientSession = scout.nvl(this.url.getParameter('forceNewClientSession'), options.forceNewClientSession);
  if (this.forceNewClientSession) {
    this.clientSessionId = null;
  } else {
    this.clientSessionId = scout.nvl(options.clientSessionId, this.clientSessionId);
  }
  this.userAgent = scout.nvl(options.userAgent, this.userAgent);
  this.suppressErrors = scout.nvl(options.suppressErrors, this.suppressErrors);
  if (options.locale) {
    this.locale = scout.Locale.ensure(options.locale);
    this.textMap = scout.texts.get(this.locale.languageTag);
  }
  if (options.backgroundJobPollingEnabled === false) {
    this.backgroundJobPollingSupport.enabled = false;
  }
  $.extend(this.reconnector, options.reconnectorOptions);
  this.ajaxCallOptions = options.ajaxCallOptions;

  // Set inspector flag by looking at URL params. This is required when running in offline mode.
  // In online mode, the server may override this flag again, see _processStartupResponse().
  if (this.url.getParameter('debug') === 'true' || this.url.getParameter('inspector') === 'true') {
    this.inspector = true;
  }

  if (this.url.getParameter('adapterExportEnabled') === 'true') {
    this.adapterExportEnabled = true;
  }

  // Install focus management for this session (cannot be created in constructor, because this.$entryPoint is required)
  this.focusManager = new scout.FocusManager({
    session: this,
    active: options.focusManagerActive
  });
  this.keyStrokeManager = new scout.KeyStrokeManager(this);

  this.showTreeIcons = scout.nvl(options.showTreeIcons, true); // TODO [awe] 8.0 remove this flag
};

scout.Session.prototype._throwError = function(message) {
  if (!this.suppressErrors) {
    throw new Error(message);
  }
};

scout.Session.prototype.unregisterModelAdapter = function(modelAdapter) {
  delete this.modelAdapterRegistry[modelAdapter.id];
};

scout.Session.prototype.registerModelAdapter = function(modelAdapter) {
  if (modelAdapter.id === undefined) {
    throw new Error('modelAdapter.id must be defined');
  }
  this.modelAdapterRegistry[modelAdapter.id] = modelAdapter;
};

scout.Session.prototype.getModelAdapter = function(id) {
  return this.modelAdapterRegistry[id];
};

scout.Session.prototype.getWidget = function(adapterId) {
  if (!adapterId) {
    return null;
  }
  if (typeof adapterId !== 'string') {
    throw new Error('typeof adapterId must be string');
  }
  var adapter = this.getModelAdapter(adapterId);
  if (!adapter) {
    return null;
  }
  var widget = adapter.widget;
  return widget;
};

scout.Session.prototype.getOrCreateWidget = function(adapterId, parent) {
  if (!adapterId) {
    return null;
  }
  if (typeof adapterId !== 'string') {
    throw new Error('typeof adapterId must be string');
  }
  var widget = this.getWidget(adapterId);
  if (widget) {
    return widget;
  }
  var adapterData = this._getAdapterData(adapterId);
  if (!adapterData) {
    throw new Error('no adapterData found for adapterId=' + adapterId);
  }
  var adapter = this.createModelAdapter(adapterData);
  return adapter.createWidget(adapterData, parent);
};

scout.Session.prototype.createModelAdapter = function(adapterData) {
  var objectType = adapterData.objectType;
  var createOpts = {};

  var objectInfo = scout.TypeDescriptor.parse(objectType);
  if (objectInfo.modelVariant) {
    objectType = objectInfo.objectType.toString() + 'Adapter' + scout.ObjectFactory.MODEL_VARIANT_SEPARATOR + objectInfo.modelVariant.toString();
    // If no adapter exists for the given variant then create an adapter without variant.
    // Mostly variant is only essential for the widget, not the adapter
    createOpts.variantLenient = true;
  } else {
    objectType = objectInfo.objectType.toString() + 'Adapter';
  }

  // TODO [7.0] bsh, cgu: Add classId/modelClass? Think about if IDs should be different for widgets (maybe prefix with 'w')
  var adapterModel = {
    id: adapterData.id,
    session: this
  };
  var adapter = scout.create(objectType, adapterModel, createOpts);
  $.log.isTraceEnabled() && $.log.trace('created new adapter ' + adapter);
  return adapter;
};

/**
 * Sends the request asynchronously and processes the response later.<br>
 * Furthermore, the request is sent delayed. If send is called multiple times
 * during the same user interaction, the events are collected and sent in one
 * request at the end of the user interaction
 */
scout.Session.prototype.sendEvent = function(event, delay) {
  delay = delay || 0;

  this.asyncEvents = this._coalesceEvents(this.asyncEvents, event);
  this.asyncEvents.push(event);
  // Use the specified delay, except another event is already scheduled. In that case, use the minimal delay.
  // This ensures that an event with a long delay doesn't hold back another event with a short delay.
  this._asyncDelay = Math.min(delay, scout.nvl(this._asyncDelay, delay));

  clearTimeout(this._sendTimeoutId);
  this._sendTimeoutId = setTimeout(function() {
    this._sendTimeoutId = null;
    this._asyncDelay = null;
    if (this.areRequestsPending()) {
      // do not send if there are any requests pending because the order matters -> prevents race conditions
      return;
    }
    this._sendNow();
  }.bind(this), this._asyncDelay);
};

scout.Session.prototype._sendStartupRequest = function() {
  // Build startup request (see JavaDoc for JsonStartupRequest.java for details)
  var request = this._newRequest({
    startup: true
  });
  if (this.partId) {
    request.partId = this.partId;
  }
  if (this.clientSessionId) {
    request.clientSessionId = this.clientSessionId;
  }
  if (scout.app.version) {
    request.version = scout.app.version;
  }
  request.userAgent = this.userAgent;
  request.sessionStartupParams = this._createSessionStartupParams();

  // Send request
  var ajaxOptions = this.defaultAjaxOptions(request);

  $.ajax(ajaxOptions)
    .done(onAjaxDone.bind(this))
    .fail(onAjaxFail.bind(this));

  // ----- Helper methods -----

  function onAjaxDone(data) {
    this._processStartupResponse(data);
  }

  function onAjaxFail(jqXHR, textStatus, errorThrown) {
    this._setApplicationLoading(false);
    this._processErrorResponse(jqXHR, textStatus, errorThrown, request);
  }
};

/**
 * Creates an object to send to the server as "startupParams".
 *
 * Default params:
 * "url":
 *   browser URL (without query and hash part)
 * "geolocationServiceAvailable":
 *   true if browser supports geo location services
 *
 * Additionally, all query parameters from the URL are put in the resulting object.
 */
scout.Session.prototype._createSessionStartupParams = function() {
  var params = {
    url: this.url.baseUrlRaw,
    geolocationServiceAvailable: scout.device.supportsGeolocation()
  };

  // Extract query parameters from URL and put them in the resulting object
  var urlParameterMap = this.url.parameterMap;
  for (var prop in urlParameterMap) {
    params[prop] = urlParameterMap[prop];
  }
  return params;
};

scout.Session.prototype._processStartupResponse = function(data) {
  // Handle errors from server
  if (data.error) {
    this._processErrorJsonResponse(data.error);
    return;
  }

  scout.webstorage.removeItem(sessionStorage, 'scout:versionMismatch');

  if (!data.startupData) {
    throw new Error('Missing startupData');
  }

  // Mark session as persistent (means a persistent session cookie is used and the client session will be restored after a browser restart)
  this.persistent = data.startupData.persistent;

  // Store clientSessionId in sessionStorage (to send the same ID again on page reload)
  this._storeClientSessionIdInStorage(data.startupData.clientSessionId);

  // Assign server generated uiSessionId. It must be sent along with all further requests.
  this.uiSessionId = data.startupData.uiSessionId;

  // Destroy UI session on server when page is closed or reloaded
  $(window)
    .on('beforeunload.' + this.uiSessionId, this._onWindowBeforeUnload.bind(this))
    .on('unload.' + this.uiSessionId, this._onWindowUnload.bind(this));

  // Special case: Page must be reloaded on startup (e.g. theme changed)
  if (data.startupData.reloadPage) {
    scout.reloadPage();
    return;
  }

  // Enable inspector mode if server requests it (e.g. when server is running in development mode)
  if (data.startupData.inspector) {
    this.inspector = true;
  }

  // Init request timeout for poller
  this.requestTimeoutPoll = (data.startupData.pollingInterval + 15) * 1000;

  // Register UI session
  this.modelAdapterRegistry[this.uiSessionId] = this; // TODO [7.0] cgu: maybe better separate session object from event processing, create ClientSession.js?. If yes, desktop should not have rootadapter as parent, see 406

  // Store adapters to adapter data cache
  if (data.adapterData) {
    this._copyAdapterData(data.adapterData);
  }

  this.locale = new scout.Locale(data.startupData.locale);
  this.textMap = scout.texts.get(this.locale.languageTag);
  this.textMap.addAll(data.startupData.textMap);

  // Create the desktop
  // Extract client session data without creating a model adapter for it. It is (currently) only used to transport the desktop's adapterId.
  var clientSessionData = this._getAdapterData(data.startupData.clientSession);
  this.desktop = this.getOrCreateWidget(clientSessionData.desktop, this.rootAdapter.widget);
  var renderDesktopImpl = function() {
    this._renderDesktop();

    // In case the server sent additional events, process them
    if (data.events) {
      this.processingEvents = true;
      try {
        this._processEvents(data.events);
      } finally {
        this.processingEvents = false;
      }
    }

    // Ensure layout is valid (explicitly layout immediately and don't wait for setTimeout to run to make layouting invisible to the user)
    this.layoutValidator.validate();
    this.focusManager.validateFocus();

    // Start poller
    this._resumeBackgroundJobPolling();

    this.ready = true;

    $.log.isInfoEnabled() && $.log.info('Session initialized. Detected ' + scout.device);
    if ($.log.isDebugEnabled()) {
      $.log.isDebugEnabled() && $.log.debug('size of _adapterDataCache after session has been initialized: ' + scout.objects.countOwnProperties(this._adapterDataCache));
      $.log.isDebugEnabled() && $.log.debug('size of modelAdapterRegistry after session has been initialized: ' + scout.objects.countOwnProperties(this.modelAdapterRegistry));
    }
  }.bind(this);

  this.render(renderDesktopImpl);
};

scout.Session.prototype._storeClientSessionIdInStorage = function(clientSessionId) {
  scout.webstorage.removeItem(sessionStorage, 'scout:clientSessionId');
  scout.webstorage.removeItem(localStorage, 'scout:clientSessionId');
  var storage = sessionStorage;
  if (this.persistent) {
    storage = localStorage;
  }
  scout.webstorage.setItem(storage, 'scout:clientSessionId', clientSessionId);
};

scout.Session.prototype._getClientSessionIdFromStorage = function() {
  var id = scout.webstorage.getItem(sessionStorage, 'scout:clientSessionId');
  if (!id) {
    // If the session is persistent it was stored in the local storage (cannot check for this.persistent here because it is not known yet)
    id = scout.webstorage.getItem(localStorage, 'scout:clientSessionId');
  }
  return id;
};

scout.Session.prototype.render = function(renderFunc) {
  // Render desktop after fonts have been preloaded (this fixes initial layouting issues when font icons are not yet ready)
  if (scout.fonts.loadingComplete) {
    renderFunc();
  } else {
    scout.fonts.preloader().then(renderFunc);
  }
};

scout.Session.prototype._sendUnloadRequest = function() {
  var request = this._newRequest({
    unload: true,
    showBusyIndicator: false
  });
  // Send request
  this._sendRequest(request);
};

scout.Session.prototype._sendNow = function() {
  if (this.asyncEvents.length === 0) {
    // Nothing to send -> return
    return;
  }
  var request = this._newRequest({
    events: this.asyncEvents
  });
  // Busy indicator required when at least one event requests it
  request.showBusyIndicator = request.events.some(function(event) {
    return scout.nvl(event.showBusyIndicator, true);
  });
  this.responseQueue.prepareRequest(request);
  // Send request
  this._sendRequest(request);
  this.asyncEvents = [];
};

scout.Session.prototype._coalesceEvents = function(previousEvents, event) {
  if (!event.coalesce) {
    return previousEvents;
  }
  var filter = $.negate(event.coalesce).bind(event);
  return previousEvents.filter(filter);
};

scout.Session.prototype._sendRequest = function(request) {
  if (!request) {
    return; // nothing to send
  }

  if (this.offline && !request.unload) { // In Firefox, "offline" is already true when page is unloaded
    this._handleSendWhenOffline(request);
    return;
  }

  if (request.unload && navigator.sendBeacon) {
    // The unload request must _not_ be sent asynchronously, because the browser would cancel
    // it when the page unload is completed. Because the support for synchronous AJAX request
    // will apparently be dropped eventually, we use the "sendBeacon" method to send the unload
    // request to the server (we don't expect an answer). Not all browsers support this method,
    // therefore we check for its existence and fall back to (legacy) synchronous AJAX call
    // when it is missing. More information:
    // - http://stackoverflow.com/questions/15479103/can-beforeunload-unload-be-used-to-send-xmlhttprequests-reliably
    // - https://groups.google.com/a/chromium.org/forum/#!topic/blink-dev/7nKMdg_ALcc
    // - https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon
    navigator.sendBeacon(this.unloadUrl + '/' + this.uiSessionId, '');
    return;
  }

  var ajaxOptions = this.defaultAjaxOptions(request);

  var busyHandling = scout.nvl(request.showBusyIndicator, true);
  if (request.unload) {
    ajaxOptions.async = false;
  }
  this._performUserAjaxRequest(ajaxOptions, busyHandling, request);
};

scout.Session.prototype._handleSendWhenOffline = function(request) {
  // No need to queue the request when request does not contain events (e.g. log request, unload request)
  if (!request.events) {
    return;
  }

  // Merge request with queued event
  if (this._queuedRequest) {
    if (this._queuedRequest.events) {
      // 1. Remove request events from queued events
      request.events.forEach(function(event) {
        this._queuedRequest.events = this._coalesceEvents(this._queuedRequest.events, event);
      }.bind(this));
      // 2. Add request events to end of queued events
      this._queuedRequest.events = this._queuedRequest.events.concat(request.events);
    } else {
      this._queuedRequest.events = request.events;
    }
  } else {
    this._queuedRequest = request;
  }
  this.layoutValidator.validate();
};

scout.Session.prototype.defaultAjaxOptions = function(request) {
  request = request || this._newRequest();
  var url = this._decorateUrl(this.remoteUrl, request);

  var ajaxOptions = {
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json; charset=UTF-8',
    cache: false,
    url: url,
    data: this._requestToJson(request)
  };

  // Ensure that certain request don't run forever. When a timeout occurs, the session
  // is put into offline mode. Note that normal requests should NOT be limited, because
  // the server processing might take very long (e.g. long running database query).
  ajaxOptions.timeout = 0; // "infinite"
  if (request.cancel) {
    ajaxOptions.timeout = this.requestTimeoutCancel;
  }
  if (request.ping) {
    ajaxOptions.timeout = this.requestTimeoutPing;
  }
  if (request.pollForBackgroundJobs) {
    ajaxOptions.timeout = this.requestTimeoutPoll;
  }
  return ajaxOptions;
};

scout.Session.prototype._decorateUrl = function(url, request) {
  var urlHint = null;
  // Add dummy URL parameter as marker (for debugging purposes)
  if (request.unload) {
    urlHint = 'unload';
  } else if (request.pollForBackgroundJobs) {
    urlHint = 'poll';
  } else if (request.ping) {
    urlHint = 'ping';
  } else if (request.cancel) {
    urlHint = 'cancel';
  } else if (request.log) {
    urlHint = 'log';
  } else if (request.syncResponseQueue) {
    urlHint = 'sync';
  }
  if (urlHint) {
    url = new scout.URL(url).addParameter(urlHint).toString();
  }
  return url;
};

scout.Session.prototype._getRequestName = function(request, defaultName) {
  if (request) {
    if (request.unload) {
      return 'unload';
    } else if (request.pollForBackgroundJobs) {
      return 'pollForBackgroundJobs';
    } else if (request.ping) {
      return 'ping';
    } else if (request.cancel) {
      return 'cancel';
    } else if (request.log) {
      return 'log';
    } else if (request.syncResponseQueue) {
      return 'syncResponseQueue';
    }
  }
  return defaultName;
};

scout.Session.prototype._requestToJson = function(request) {
  return JSON.stringify(request, function(key, value) {
    // Replacer function that filter certain properties from the resulting JSON string.
    // See https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
    var ignore =
      (this === request && key === 'showBusyIndicator') ||
      (this instanceof scout.RemoteEvent && scout.isOneOf(key, 'showBusyIndicator', 'coalesce'));
    return (ignore ? undefined : value);
  });
};

scout.Session.prototype._callAjax = function(callOptions) {
  var defaultOptions = {
    retryIntervals: [100, 500, 500, 500]
  };
  var ajaxCall = scout.create('AjaxCall', $.extend(defaultOptions, callOptions, this.ajaxCallOptions), {
    ensureUniqueId: false
  });
  this.registerAjaxCall(ajaxCall);
  return ajaxCall.call()
    .always(this.unregisterAjaxCall.bind(this, ajaxCall));
};

scout.Session.prototype._performUserAjaxRequest = function(ajaxOptions, busyHandling, request) {
  if (busyHandling) {
    this.setBusy(true);
  }
  this.setRequestPending(true);

  var jsError = null,
    success = false;

  this._callAjax({
      ajaxOptions: ajaxOptions,
      request: request,
      name: this._getRequestName(request, 'user request')
    })
    .done(onAjaxDone.bind(this))
    .fail(onAjaxFail.bind(this))
    .always(onAjaxAlways.bind(this));

  // ----- Helper methods -----

  function onAjaxDone(data) {
    try {
      // Busy handling is remove _before_ processing the response, otherwise the focus cannot be set
      // correctly, because the glasspane of the busy indicator is still visible.
      // The second check prevents flickering of the busy indicator if there is a scheduled request
      // that will be sent immediately afterwards (see onAjaxAlways).
      if (busyHandling && !this.areBusyIndicatedEventsQueued()) {
        this.setBusy(false);
      }
      success = this.responseQueue.process(data);
    } catch (err) {
      jsError = jsError || err;
    }
  }

  function onAjaxFail(jqXHR, textStatus, errorThrown) {
    try {
      if (busyHandling) {
        this.setBusy(false);
      }
      this._processErrorResponse(jqXHR, textStatus, errorThrown, request);
    } catch (err) {
      jsError = jsError || err;
    }
  }

  // Variable arguments:
  // "done" --> data, textStatus, jqXHR
  // "fail" --> jqXHR, textStatus, errorThrown
  function onAjaxAlways(data, textStatus, errorThrown) {
    this.setRequestPending(false);

    // "success" is false when either
    // a) an HTTP error occurred or
    // b) a JSON response with the error flag set (UI processing error) was returned
    if (success) {
      this._resumeBackgroundJobPolling();
      this._fireRequestFinished(data);

      if (this._retryRequest) {
        // Send retry request first
        var retryRequest = this._retryRequest;
        this._retryRequest = null;
        this.responseQueue.prepareRequest(retryRequest);
        this._sendRequest(retryRequest);
      } else if (this._queuedRequest) {
        // Send events that happened while being offline
        var queuedRequest = this._queuedRequest;
        this._queuedRequest = null;
        this.responseQueue.prepareRequest(queuedRequest);
        this._sendRequest(queuedRequest);
      }

      // If there already is a another request pending, send it now
      // But only if it should not be sent delayed
      if (!this._sendTimeoutId) {
        this._sendNow();
      }
    }
    this.layoutValidator.validate();

    // Throw previously caught error
    if (jsError) {
      throw jsError;
    }
  }
};

scout.Session.prototype.registerAjaxCall = function(ajaxCall) {
  this.ajaxCalls.push(ajaxCall);
};

scout.Session.prototype.unregisterAjaxCall = function(ajaxCall) {
  scout.arrays.remove(this.ajaxCalls, ajaxCall);
};

scout.Session.prototype.interruptAllAjaxCalls = function() {
  // Because the error handlers alter the "this.ajaxCalls" array,
  // the loop must operate on a copy of the original array!
  this.ajaxCalls.slice().forEach(function(ajaxCall) {
    ajaxCall.pendingCall && ajaxCall.pendingCall.abort();
  });
};

scout.Session.prototype.abortAllAjaxCalls = function() {
  // Because the error handlers alter the "this.ajaxCalls" array,
  // the loop must operate on a copy of the original array!
  this.ajaxCalls.slice().forEach(function(ajaxCall) {
    ajaxCall.abort();
  });
};

/**
 * (Re-)starts background job polling when not started yet or when an error occurred while polling.
 * In the latter case, polling is resumed when a user-initiated request has been successful.
 */
scout.Session.prototype._resumeBackgroundJobPolling = function() {
  if (this.backgroundJobPollingSupport.enabled && this.backgroundJobPollingSupport.status !== scout.BackgroundJobPollingStatus.RUNNING) {
    $.log.isInfoEnabled() && $.log.info('Resume background jobs polling request, status was=' + this.backgroundJobPollingSupport.status);
    this._pollForBackgroundJobs();
  }
};

/**
 * Polls the results of jobs running in the background. Note: we cannot use the _sendRequest method here
 * since we don't want any busy handling in case of background jobs. The request may take a while, since
 * the server doesn't return until either a time-out occurs or there's something in the response when
 * a model job is done and no request initiated by a user is running.
 */
scout.Session.prototype._pollForBackgroundJobs = function() {
  this.backgroundJobPollingSupport.setRunning();

  var request = this._newRequest({
    pollForBackgroundJobs: true
  });
  this.responseQueue.prepareRequest(request);

  var ajaxOptions = this.defaultAjaxOptions(request);

  this._callAjax({
      ajaxOptions: ajaxOptions,
      request: request,
      name: this._getRequestName(request, 'request')
    })
    .done(onAjaxDone.bind(this))
    .fail(onAjaxFail.bind(this));

  // --- Helper methods ---

  function onAjaxDone(data) {
    if (data.error) {
      // Don't schedule a new polling request, when an error occurs
      // when the next user-initiated request succeeds, we re-enable polling
      // otherwise the polling would ping the server to death in case of an error
      $.log.warn('Polling request failed. Interrupt polling until the next user-initiated request succeeds');
      this.backgroundJobPollingSupport.setFailed();
      if (this.areRequestsPending()) {
        // Add response to queue, handle later by _performUserAjaxRequest()
        this.responseQueue.add(data);
      } else {
        // No user request pending, handle immediately
        this.responseQueue.process(data);
      }
    } else if (data.sessionTerminated) {
      $.log.info('Session terminated, stopped polling for background jobs');
      this.backgroundJobPollingSupport.setStopped();
      // If were are not yet logged out, redirect to the logout URL (the session that initiated the
      // session invalidation will receive a dedicated logout event, redirect is handled there).
      if (!this.loggedOut && data.redirectUrl) {
        this.logout(data.redirectUrl);
      }
    } else {
      try {
        // No need to change backgroundJobPollingSupport state, it should still be RUNNING
        if (this.areRequestsPending()) {
          // Add response to queue, handle later by _performUserAjaxRequest()
          this.responseQueue.add(data);
        } else {
          // No user request pending, handle immediately
          this.responseQueue.process(data);
          this.layoutValidator.validate();
        }
        setTimeout(this._pollForBackgroundJobs.bind(this));
      } catch (error) {
        this.backgroundJobPollingSupport.setFailed();
        throw error;
      }
    }
  }

  function onAjaxFail(jqXHR, textStatus, errorThrown) {
    this.backgroundJobPollingSupport.setFailed();
    this._processErrorResponse(jqXHR, textStatus, errorThrown, request);
  }
};

/**
 * Do NOT call this method directly, always use the response queue:
 *
 *   session.responseQueue.process(data);
 *
 * Otherwise, the response queue's expected sequence number will get out of sync.
 */
scout.Session.prototype.processJsonResponseInternal = function(data) {
  var success = false;
  if (data.error) {
    this._processErrorJsonResponse(data.error);
  } else {
    this._processSuccessResponse(data);
    success = true;
  }
  return success;
};

scout.Session.prototype._processSuccessResponse = function(message) {
  if (message.adapterData) {
    this._copyAdapterData(message.adapterData);
  }

  if (message.events) {
    this.processingEvents = true;
    try {
      this._processEvents(message.events);
    } finally {
      this.processingEvents = false;
    }
  }

  if ($.log.isDebugEnabled()) {
    var cacheSize = scout.objects.countOwnProperties(this._adapterDataCache);
    $.log.trace('size of _adapterDataCache after response has been processed: ' + cacheSize);
    cacheSize = scout.objects.countOwnProperties(this.modelAdapterRegistry);
    $.log.trace('size of modelAdapterRegistry after response has been processed: ' + cacheSize);
  }
};

scout.Session.prototype._copyAdapterData = function(adapterData) {
  var count = 0;
  var prop;

  for (prop in adapterData) {
    this._adapterDataCache[prop] = adapterData[prop];
    count++;
  }
  if (count > 0) {
    $.log.isTraceEnabled() && $.log.trace('Stored ' + count + ' properties in adapterDataCache');
  }
};

/**
 * @param textStatus 'timeout', 'abort', 'error' or 'parseerror' (see http://api.jquery.com/jquery.ajax/)
 */
scout.Session.prototype._processErrorResponse = function(jqXHR, textStatus, errorThrown, request) {
  $.log.error('errorResponse: status=' + jqXHR.status + ', textStatus=' + textStatus + ', errorThrown=' + errorThrown);

  var offlineError = scout.AjaxCall.isOfflineError(jqXHR, textStatus, errorThrown, request);
  if (offlineError) {
    if (this.ready) {
      this.goOffline();
      if (request && !request.pollForBackgroundJobs && !this._retryRequest) {
        this._retryRequest = request;
      }
      return;
    }
    // Not ready yet (startup request)
    errorThrown = errorThrown || this.optText('ui.ConnectionInterrupted', 'Connection interrupted');
  }

  // Show error message
  var boxOptions = {
    header: this.optText('ui.NetworkError', 'Network error'),
    body: scout.strings.join(' ', (jqXHR.status || ''), errorThrown),
    yesButtonText: this.optText('ui.Reload', 'Reload'),
    yesButtonAction: function() {
      scout.reloadPage();
    },
    noButtonText: (this.ready ? this.optText('ui.Ignore', 'Ignore') : null)
  };
  this.showFatalMessage(boxOptions, jqXHR.status + '.net');
};

scout.Session.prototype._processErrorJsonResponse = function(jsonError) {
  if (jsonError.code === scout.Session.JsonResponseError.VERSION_MISMATCH) {
    var loopDetection = scout.webstorage.getItem(sessionStorage, 'scout:versionMismatch');
    if (!loopDetection) {
      scout.webstorage.setItem(sessionStorage, 'scout:versionMismatch', 'yes');
      // Reload page -> everything should then be up to date
      scout.reloadPage();
      return;
    }
    scout.webstorage.removeItem(sessionStorage, 'scout:versionMismatch');
  }

  // Default values for fatal message boxes
  var boxOptions = {
    header: this.optText('ui.ServerError', 'Server error') + ' (' + this.optText('ui.ErrorCodeX', 'Code ' + jsonError.code, jsonError.code) + ')',
    body: jsonError.message,
    yesButtonText: this.optText('ui.Reload', 'Reload'),
    yesButtonAction: function() {
      scout.reloadPage();
    }
  };

  // Customize for specific error codes
  if (jsonError.code === scout.Session.JsonResponseError.STARTUP_FAILED) {
    // there are no texts yet if session startup failed
    boxOptions.header = jsonError.message;
    boxOptions.body = null;
    boxOptions.yesButtonText = 'Retry';
  } else if (jsonError.code === scout.Session.JsonResponseError.SESSION_TIMEOUT) {
    boxOptions.header = this.optText('ui.SessionTimeout', boxOptions.header);
    boxOptions.body = this.optText('ui.SessionExpiredMsg', boxOptions.body);
  } else if (jsonError.code === scout.Session.JsonResponseError.UI_PROCESSING) {
    boxOptions.header = this.optText('ui.UnexpectedProblem', boxOptions.header);
    boxOptions.body = scout.strings.join('\n\n',
      this.optText('ui.InternalProcessingErrorMsg', boxOptions.body, ' (' + this.optText('ui.ErrorCodeX', 'Code 20', '20') + ')'),
      this.optText('ui.UiInconsistentMsg', ''));
    boxOptions.noButtonText = this.optText('ui.Ignore', 'Ignore');
  } else if (jsonError.code === scout.Session.JsonResponseError.UNSAFE_UPLOAD) {
    boxOptions.header = this.optText('ui.UnsafeUpload', boxOptions.header);
    boxOptions.body = this.optText('ui.UnsafeUploadMsg', boxOptions.body);
    boxOptions.yesButtonText = this.optText('ui.Ok', 'Ok');
    boxOptions.yesButtonAction = function() {};
  }
  this.showFatalMessage(boxOptions, jsonError.code);
};

scout.Session.prototype._fireRequestFinished = function(message) {
  if (!this._deferred) {
    return;
  }
  if (message.events) {
    for (var i = 0; i < message.events.length; i++) {
      this._deferredEventTypes.push(message.events[i].type);
    }
  }
  if (this.requestsPendingCounter === 0) {
    this._deferred.resolve(this._deferredEventTypes);
    this._deferred = null;
    this._deferredEventTypes = null;
  }
};

/**
 * Shows a UI-only message box.
 *
 * @param options
 *          Options for the message box, see scout.MessageBox
 * @param errorCode
 *          If defined, a second call to this method with the same errorCode will
 *          do nothing. Can be used to prevent double messages for the same error.
 */
scout.Session.prototype.showFatalMessage = function(options, errorCode) {
  if (errorCode) {
    if (this._fatalMessagesOnScreen[errorCode]) {
      return;
    }
    this._fatalMessagesOnScreen[errorCode] = true;
  }
  this._setApplicationLoading(false);

  options = options || {};
  var model = {
      session: this,
      parent: this.desktop || new scout.NullWidget(),
      iconId: options.iconId,
      severity: scout.nvl(options.severity, scout.Status.Severity.ERROR),
      header: options.header,
      body: options.body,
      hiddenText: options.hiddenText,
      yesButtonText: options.yesButtonText,
      noButtonText: options.noButtonText,
      cancelButtonText: options.cancelButtonText
    },
    messageBox = scout.create('MessageBox', model),
    $entryPoint = options.entryPoint || this.$entryPoint;

  messageBox.on('action', function(event) {
    delete this._fatalMessagesOnScreen[errorCode];
    messageBox.destroy();
    var option = event.option;
    if (option === 'yes' && options.yesButtonAction) {
      options.yesButtonAction.apply(this);
    } else if (option === 'no' && options.noButtonAction) {
      options.noButtonAction.apply(this);
    } else if (option === 'cancel' && options.cancelButtonAction) {
      options.cancelButtonAction.apply(this);
    }
  }.bind(this));
  messageBox.render($entryPoint);
};

scout.Session.prototype.uploadFiles = function(target, files, uploadProperties, maxTotalSize, allowedTypes) {
  var formData = new FormData(),
    totalSize = 0;

  if (uploadProperties) {
    $.each(uploadProperties, function(key, value) {
      formData.append(key, value);
    });
  }

  $.each(files, function(index, value) {
    if (!allowedTypes || allowedTypes.length === 0 || scout.isOneOf(value.type, allowedTypes)) {
      totalSize += value.size;
      /*
       * - see ClipboardField for comments on "scoutName"
       * - Some Browsers (e.g. Edge) handle an empty string as filename as if the filename is not set and therefore introduce a default filename like 'blob'.
       *   To counter this, we introduce a empty filename string. The string consists of characters that can not occur in regular filenames, to prevent collisions.
       */
      var filename = scout.nvl(value.scoutName, value.name, scout.Session.EMPTY_UPLOAD_FILENAME);
      formData.append('files', value, filename);
    }
  }.bind(this));

  // 50 MB as default maximum size
  maxTotalSize = scout.nvl(maxTotalSize, scout.FileInput.DEFAULT_MAXIMUM_UPLOAD_SIZE);

  // very large files must not be sent to server otherwise the whole system might crash (for all users).
  if (totalSize > maxTotalSize) {
    var boxOptions = {
      header: this.text('ui.FileSizeLimitTitle'),
      body: this.text('ui.FileSizeLimit', (maxTotalSize / 1024 / 1024)),
      yesButtonText: this.optText('Ok', 'Ok')
    };

    this.showFatalMessage(boxOptions);
    return false;
  }

  var uploadAjaxOptions = {
    type: 'POST',
    url: 'upload/' + this.uiSessionId + '/' + target.id,
    cache: false,
    // Don't touch the data (do not convert it to string)
    processData: false,
    // Do not automatically add content type (otherwise, multipart boundary would be missing)
    contentType: false,
    data: formData
  };
  // Special handling for FormData polyfill
  if (formData.polyfill) {
    formData.applyToAjaxOptions(uploadAjaxOptions);
  }
  this.responseQueue.prepareHttpRequest(uploadAjaxOptions);

  var busyHandling = !this.areRequestsPending();
  this._performUserAjaxRequest(uploadAjaxOptions, busyHandling);
  return true;
};

scout.Session.prototype.goOffline = function() {
  if (this.offline) {
    return; // already offline
  }
  this.offline = true;

  // Abort pending ajax requests.
  this.abortAllAjaxCalls();

  // In Firefox, the current async polling request is interrupted immediately when the page is unloaded. Therefore,
  // an offline message would appear at once on the desktop. When reloading the page, all elements are cleared anyway,
  // thus we wait some short period of time before displaying the message and starting the reconnector. If
  // we find that goOffline() was called because of request unloading, we skip the unnecessary part. Note that
  // FF doesn't guarantee that _onWindowUnload() is called before this setTimeout() function is called. Therefore,
  // we have to look at another property "unloading" that is set earlier in _onWindowBeforeUnload().
  setTimeout(function() {
    if (this.unloading || this.unloaded) {
      return;
    }
    this.rootAdapter.goOffline();
    this.reconnector.start();
  }.bind(this), 100);
};

scout.Session.prototype.goOnline = function() {
  this.offline = false;
  this.rootAdapter.goOnline();

  var request = this._newRequest({
    syncResponseQueue: true
  });
  this.responseQueue.prepareRequest(request);
  this._sendRequest(request); // implies "_resumeBackgroundJobPolling", and also sends queued request
};

scout.Session.prototype.onReconnecting = function() {
  if (this.desktop) {
    this.desktop.onReconnecting();
  }
};

scout.Session.prototype.onReconnectingSucceeded = function() {
  if (this.desktop) {
    this.desktop.onReconnectingSucceeded();
  }
  this.goOnline();
};

scout.Session.prototype.onReconnectingFailed = function() {
  if (this.desktop) {
    this.desktop.onReconnectingFailed();
  }
};

scout.Session.prototype.listen = function() {
  if (!this._deferred) {
    this._deferred = $.Deferred();
    this._deferredEventTypes = [];
  }
  return this._deferred;
};

/**
 * Executes the given callback when pending requests are finished, or immediately if there are no requests pending.
 * @param func callback function
 * @param vararg arguments to pass to the callback function
 */
scout.Session.prototype.onRequestsDone = function(func) {
  var argumentsArray = Array.prototype.slice.call(arguments);
  argumentsArray.shift(); // remove argument func, remainder: all other arguments

  if (this.areRequestsPending() || this.areEventsQueued()) {
    this.listen().done(onEventsProcessed);
  } else {
    func.apply(this, argumentsArray);
  }

  function onEventsProcessed() {
    func.apply(this, argumentsArray);
  }
};

scout.Session.prototype.areEventsQueued = function() {
  return this.asyncEvents.length > 0;
};

scout.Session.prototype.areBusyIndicatedEventsQueued = function() {
  return this.asyncEvents.some(function(event) {
    return scout.nvl(event.showBusyIndicator, true);
  });
};

scout.Session.prototype.areResponsesQueued = function() {
  return this.responseQueue.size() > 0;
};

scout.Session.prototype.areRequestsPending = function() {
  return this.requestsPendingCounter > 0;
};

scout.Session.prototype.setRequestPending = function(pending) {
  if (pending) {
    this.requestsPendingCounter++;
  } else {
    this.requestsPendingCounter--;
  }

  // In "inspector" mode, add/remove a marker attribute to the $entryPoint that
  // can be used to detect pending server calls by UI testing tools, e.g. Selenium
  if (this.inspector) {
    this.$entryPoint.toggleAttr('data-request-pending', pending, 'true');
  }
};

scout.Session.prototype.setBusy = function(busy) {
  if (busy) {
    if (!this._busy) {
      this._renderBusy();
    }
    this._busy = true;
  } else {
    if (this._busy) {
      this._removeBusy();
    }
    this._busy = false;
  }
};

scout.Session.prototype._renderBusy = function() {
  if (this._busyIndicatorTimeoutId !== null && this._busyIndicatorTimeoutId !== undefined) {
    // Do not schedule it twice
    return;
  }
  // Don't show the busy indicator immediately. Set a short timer instead (which may be
  // cancelled again if the busy state returns to false in the meantime).
  this._busyIndicatorTimeoutId = setTimeout(function() {
    if (this._busyIndicator) {
      // busy indicator is already showing
      return;
    }
    if (!this.desktop || !this.desktop.rendered) {
      return; // No busy indicator without desktop (e.g. during shutdown)
    }
    this._busyIndicator = scout.create('BusyIndicator', {
      parent: this.desktop
    });
    this._busyIndicator.on('cancel', this._onCancelProcessing.bind(this));
    this._busyIndicator.render(this.$entryPoint);
  }.bind(this), 500);
};

scout.Session.prototype._removeBusy = function() {
  // Clear pending timer
  clearTimeout(this._busyIndicatorTimeoutId);
  this._busyIndicatorTimeoutId = null;

  // Remove busy indicator (if it was already created)
  if (this._busyIndicator) {
    this._busyIndicator.destroy();
    this._busyIndicator = null;
  }
};

scout.Session.prototype._onCancelProcessing = function(event) {
  var busyIndicator = this._busyIndicator;
  if (!busyIndicator) {
    return; // removed in the mean time
  }
  busyIndicator.off('cancel');

  // Set "canceling" state in busy indicator (after 100ms, would not look good otherwise)
  setTimeout(function() {
    busyIndicator.cancelled();
  }.bind(this), 100);

  this._sendCancelRequest();
};

scout.Session.prototype._sendCancelRequest = function() {
  var request = this._newRequest({
    cancel: true,
    showBusyIndicator: false
  });
  this._sendRequest(request);
};

/**
 * Sends a request containing the error message for logging purpose.
 * The request is sent immediately (does not await pending requests)
 */
scout.Session.prototype.sendLogRequest = function(message) {
  var request = this._newRequest({
    log: true,
    message: message
  });
  if (this.currentEvent) {
    request.event = {
      target: this.currentEvent.target,
      type: this.currentEvent.type
    };
  }

  // Do not use _sendRequest to make sure a log request has no side effects and will be sent only once
  $.ajax(this.defaultAjaxOptions(request));
};

scout.Session.prototype._newRequest = function(requestData) {
  var request = $.extend({
    uiSessionId: this.uiSessionId
  }, requestData);

  // Certain requests do not require a sequence number
  if (!request.log && !request.syncResponseQueue) {
    request['#'] = this.requestSequenceNo++;
  }
  return request;
};

scout.Session.prototype._setApplicationLoading = function(applicationLoading) {
  if (applicationLoading) {
    this._applicationLoadingTimeoutId = setTimeout(function() {
      if (!this.desktop || !this.desktop.rendered) {
        this._renderApplicationLoading();
      }
    }.bind(this), 200);
  } else {
    clearTimeout(this._applicationLoadingTimeoutId);
    this._applicationLoadingTimeoutId = null;
    this._removeApplicationLoading();
  }
};

scout.Session.prototype._renderApplicationLoading = function() {
  var $loadingRoot = $('body').appendDiv('application-loading-root')
    .addClass('application-loading-root')
    .fadeIn();
  $loadingRoot.appendDiv('application-loading01').hide().fadeIn();
  $loadingRoot.appendDiv('application-loading02').hide().fadeIn();
};

scout.Session.prototype._removeApplicationLoading = function() {
  var $loadingRoot = $('body').children('.application-loading-root');
  $loadingRoot.addClass('application-loading-root-fadeout');
  if (scout.device.supportsCssAnimation()) {
    $loadingRoot.oneAnimationEnd(function() {
      $loadingRoot.remove();
    });
  } else {
    // fallback for old browsers that do not support the animation-end event
    $loadingRoot.remove();
  }
};

scout.Session.prototype._processEvents = function(events) {
  var i = 0;
  while (i < events.length) {
    var event = events[i];
    this.currentEvent = event;

    var adapter = this.getModelAdapter(event.target);
    if (!adapter) {
      // Sometimes events seem to happen "too early", e.g. when a "requestFocus" event for a field is
      // encountered before the "showForm" event has been processed. If the target adapter cannot be
      // resolved, we try the other events first, expecting them to trigger the creation of the event
      // adapter. As soon as a event could be processed successfully, we try our postponed event again.
      $.log.isDebugEnabled() && $.log.debug("Postponing '" + event.type + "' for adapter with ID " + event.target);
      i++;
      continue;
    }
    // Remove the successful event and reset the pointer to the start of the remaining events (to
    // retry previously postponed events).
    events.splice(i, 1);
    i = 0;

    $.log.isDebugEnabled() && $.log.debug("Processing event '" + event.type + "' for adapter with ID " + event.target);
    adapter.onModelEvent(event);
    adapter.resetEventFilters();
  }
  this.currentEvent = null;

  // If there are still events whose target could not be resolved, throw an error
  if (events.length) {
    throw new Error('Could not resolve event targets: [' + events.map(function(event) {
      return '"' + event.target + '"';
    }, this).join(', ') + ']');
  }
};

scout.Session.prototype.start = function() {
  $.log.isInfoEnabled() && $.log.info('Session starting...');

  // After a short time, display a loading animation (will be removed again in _renderDesktop)
  this._setApplicationLoading(true);

  // Send startup request
  this._sendStartupRequest();
};

// TODO [7.0] awe: discuss with C.GU. Session requires same methods as ModelAdapter, but it is NOT a ModelAdapter currently
// guess we need a SessionAdapter.js - I noticed this in a jasmine test where _processEvents is called an the adapter is the Session
// (event.type=disposeAdapter), also see resetEventFilters method
scout.Session.prototype.onModelEvent = function(event) {
  if (event.type === 'localeChanged') {
    this._onLocaleChanged(event);
  } else if (event.type === 'logout') {
    this._onLogout(event);
  } else if (event.type === 'disposeAdapter') {
    this._onDisposeAdapter(event);
  } else if (event.type === 'reloadPage') {
    this._onReloadPage(event);
  } else {
    $.log.warn('Model action "' + event.type + '" is not supported by UI session');
  }
};

scout.Session.prototype.resetEventFilters = function() {
  // NOP
};

scout.Session.prototype._onLocaleChanged = function(event) {
  var locale = new scout.Locale(event.locale);
  var textMap = new scout.TextMap(event.textMap);
  this.switchLocale(locale, textMap);
};

/**
 * @param {scout.Locale} the new locale
 * @param {scout.TextMap} [textMap] the new textMap. If not defined, the corresponding textMap for the new locale is used.
 */
scout.Session.prototype.switchLocale = function(locale, textMap) {
  scout.assertParameter('locale', locale, scout.Locale);
  this.locale = locale;
  this.textMap = scout.texts.get(locale.languageTag);
  if (textMap) {
    scout.objects.copyOwnProperties(textMap, this.textMap);
  }
  // TODO [7.0] bsh: inform components to reformat display text? also check Collator in scout.comparators.TEXT

  this.trigger('localeSwitch', {
    locale: this.locale
  });
};

scout.Session.prototype._renderDesktop = function() {
  this.desktop.render(this.$entryPoint);
  this.desktop.invalidateLayoutTree(false);
  this._setApplicationLoading(false);
};

scout.Session.prototype._onLogout = function(event) {
  this.logout(event.redirectUrl);
};

scout.Session.prototype.logout = function(logoutUrl) {
  this.loggedOut = true;
  // TODO [7.0] bsh: Check if there is a better solution (e.g. send a flag from server "action" = [ "redirect" | "closeWindow" ])
  if (this.forceNewClientSession) {
    this.desktop.$container.window(true).close();
  } else {
    // remember current url to not lose query parameters (such as debug; however, ignore deeplinks)
    var url = new scout.URL();
    url.removeParameter('dl'); //deeplink
    url.removeParameter('i'); //deeplink info
    scout.webstorage.setItem(sessionStorage, 'scout:loginUrl', url.toString());
    // Clear everything and reload the page. We wrap that in setTimeout() to allow other events to be executed normally before.
    setTimeout(function() {
      scout.reloadPage({
        redirectUrl: logoutUrl
      });
    }.bind(this));
  }
};

scout.Session.prototype._onDisposeAdapter = function(event) {
  // Model adapter was disposed on server -> dispose it on the UI, too
  var adapter = this.getModelAdapter(event.adapter);
  if (adapter) { // adapter may be null if it was never sent to the UI, e.g. a form that was opened and closed in the same request
    adapter.destroy();
  }
};

scout.Session.prototype._onReloadPage = function(event) {
  // Don't clear the body, because other events might be processed before the reload and
  // it could cause errors when all DOM elements are already removed.
  scout.reloadPage({
    clearBody: false
  });
};

scout.Session.prototype._onWindowBeforeUnload = function() {
  $.log.isInfoEnabled() && $.log.info('Session before unloading...');
  // TODO [7.0] bsh: Cancel pending requests

  // Set a flag that indicates unloading before _onWindowUnload() is called.
  // See goOffline() why this is necessary.
  this.unloading = true;
  setTimeout(function() {
    // Because there is no callback when the unloading was cancelled, we always
    // reset the flag after a short period of time.
    this.unloading = false;
  }.bind(this), 200);
};

scout.Session.prototype._onWindowUnload = function() {
  $.log.isInfoEnabled() && $.log.info('Session unloading...');
  this.unloaded = true;

  // Close popup windows
  if (this.desktop) {
    this.desktop.formController.closePopupWindows();
  }

  // Destroy UI session on server (only when the server did not not initiate the logout,
  // otherwise the UI session would already be disposed)
  if (!this.loggedOut) {
    this._sendUnloadRequest();
  }
  if (this.loggedOut && this.persistent) {
    scout.webstorage.removeItem(localStorage, 'scout:clientSessionId');
  }
};

/**
 * Returns the adapter-data sent with the JSON response from the adapter-data cache. Note that this operation
 * removes the requested element from the cache, thus you cannot request the same ID twice. Typically once
 * you've requested an element from this cache an adapter for that ID is created and stored in the adapter
 * registry which too exists on this session object.
 */
scout.Session.prototype._getAdapterData = function(id) {
  var adapterData = this._adapterDataCache[id];
  var deleteAdapterData = !this.adapterExportEnabled;
  if (deleteAdapterData) {
    delete this._adapterDataCache[id];
  }
  return adapterData;
};

scout.Session.prototype.getAdapterData = function(id) {
  return this._adapterDataCache[id];
};

scout.Session.prototype.text = function(textKey) {
  return scout.TextMap.prototype.get.apply(this.textMap, arguments);
};

scout.Session.prototype.optText = function(textKey, defaultValue) {
  return scout.TextMap.prototype.optGet.apply(this.textMap, arguments);
};

scout.Session.prototype.textExists = function(textKey) {
  return this.textMap.exists(textKey);
};

//--- Event handling methods ---
scout.Session.prototype._createEventSupport = function() {
  return new scout.EventSupport();
};

scout.Session.prototype.trigger = function(type, event) {
  event = event || {};
  event.source = this;
  this.events.trigger(type, event);
};

scout.Session.prototype.one = function(type, func) {
  this.events.one(type, func);
};

scout.Session.prototype.on = function(type, func) {
  return this.events.on(type, func);
};

scout.Session.prototype.off = function(type, func) {
  this.events.off(type, func);
};

scout.Session.prototype.addListener = function(listener) {
  this.events.addListener(listener);
};

scout.Session.prototype.removeListener = function(listener) {
  this.events.removeListener(listener);
};