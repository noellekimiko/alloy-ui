AUI.add('aui-resize-iframe', function(A) {
var Lang = A.Lang,
	isString = Lang.isString,

	RESIZE_IFRAME = 'resizeiframe',

	getClassName = A.getClassName,

	HEIGHT = 'height',
	HIDDEN = 'hidden',
	NO = 'no',
	SCROLLING = 'scrolling',
	WIDTH = 'width',

	CSS_RESIZE_IFRAME_MONITORED_HEIGHT = getClassName(RESIZE_IFRAME, 'monitored', HEIGHT);

ResizeIframe = A.Component.create(
	{
		NAME: RESIZE_IFRAME,
		NS: RESIZE_IFRAME,

		EXTENDS: A.Plugin.Base,

		ATTRS: {
			height: {
				value: 0
			},
			monitorHeight: {
				value: true
			},
			width: {
				value: null
			}
		},

		prototype: {
			initializer: function(config) {
				var instance = this;

				var frame = instance.get('host');

				instance.node = frame;
				instance._iframeEl = frame.getDOM();

				instance._defaultHeight = config.height;

				instance.bindUI();
				instance.syncUI();
			},

			bindUI: function() {
				var instance = this;

				instance.after('heightChange', instance._afterHeightChange);
				instance.after('monitorHeightChange', instance._afterMonitorHeightChange);
				instance.after('widthChange', instance._afterWidthChange);
			},

			syncUI: function() {
				var instance = this;

				instance._uiSetMonitorHeight(instance.get('monitorHeight'));
			},

			destructor: function() {
				var instance = this;

				instance._uiSetMonitorHeight(false);
			},

			pauseMonitor: function() {
				var instance = this;

				instance._clearInterval();
			},

			restartMonitor: function() {
				var instance = this;

				if (instance.get('monitorHeight')) {
					instance._setInterval();
				}
			},

			_afterHeightChange: function(event) {
				var instance = this;

				instance.set('monitorHeight', false);

				instance._uiSetHeight(event.newVal);
			},

			_afterMonitorHeightChange: function(event) {
				var instance = this;

				instance._uiSetMonitorHeight(event.newVal);
			},

			_afterWidthChange: function(event) {
				var instance = this;

				instance._uiSetWidth(event.newVal);
			},

			_clearInterval: function() {
				var instance = this;

				var iframeDoc = instance._iframeDoc;

				if (iframeDoc) {
					var docEl = iframeDoc.documentElement;

					if (docEl) {
						docEl.style.overflowY = '';
					}
				}

				if (instance._intervalId) {
					A.clearInterval(instance._intervalId);

					instance._intervalId = null;
				}
			},

			_onResize: function() {
				var instance = this;

				instance._iframeDoc = null;

				var newHeight = instance._iframeHeight;

				var iframeDoc;
				var iframeWin;

				try {
					iframeWin = instance._iframeEl.contentWindow;
					console.log('iframeWin: ', iframeWin);

					iframeDoc = iframeWin.document;
					console.log('iframeDoc: ', iframeDoc);

					instance._iframeDoc = iframeDoc;
				}
				catch (e) {
					console.log('catch');
				}

				if (iframeDoc && iframeWin) {
					console.log('inside if');
					newHeight = ResizeIframe._getContentHeight(iframeWin, iframeDoc, instance._iframeHeight);

					console.log('newHeight: ', newHeight);

					instance._uiSetHeight(newHeight);
				}
				else if (!iframeDoc) {
					console.log('inside else if');
					instance._clearInterval();

					console.log('instance._defaultHeight: ', instance._defaultHeight);

					instance._uiSetHeight(instance._defaultHeight);
				}
			},

			_setInterval: function(event) {
				var instance = this;

				if (!instance._intervalId) {
					instance._onResize();

					instance._intervalId = A.setInterval(instance._onResize, 100, instance);
				}
			},

			_uiSetHeight: function(value) {
				var instance = this;

				if (instance._iframeHeight != value) {
					instance._iframeHeight = value;

					instance.node.setStyle(HEIGHT, value);
				}
			},

			_uiSetMonitorHeight: function(monitorHeight) {
				var instance = this;

				var iframe = instance.node;

				if (monitorHeight) {
					instance._setInterval();

					instance._loadHandle = iframe.on('load', instance._setInterval, instance);

					iframe.addClass(CSS_RESIZE_IFRAME_MONITORED_HEIGHT);
				}
				else {
					instance._clearInterval();

					if (instance._loadHandle) {
						instance._loadHandle.detach();
					}

					iframe.removeClass(CSS_RESIZE_IFRAME_MONITORED_HEIGHT);
				}
			},

			_uiSetWidth: function(value) {
				var instance = this;

				instance.node.setStyle(WIDTH, value);
			},

			_iframeHeight: 0
		}
	}
);

A.mix(
	ResizeIframe,
	{
		getContentHeight: function(iframeWin) {
			var contentHeight = null;

			try {
				var iframeDoc;

				if (iframeWin.nodeName && iframeWin.nodeName.toLowerCase() == 'iframe') {
					iframeWin = iframeWin.contentWindow;
				}
				else if (A.instanceOf(iframeWin, A.Node)) {
					iframeWin = iframeWin.getDOM().contentWindow;
				}

				iframeDoc = iframeWin.document;

				contentHeight = ResizeIframe._getContentHeight(iframeWin, iframeDoc);
			}
			catch (e) {
			}

			return contentHeight;
		},

		_getContentHeight: function(iframeWin, iframeDoc, fallbackHeight) {
			console.log('_getContentHeight');
			var contentHeight = null;

			if (iframeDoc && iframeWin.location.href != 'about:blank') {
				var docEl = iframeDoc.documentElement;
				var iframeBody = iframeDoc.body;

				if (docEl) {
					docEl.style.overflowY = HIDDEN;
				}

				var visibleDialogNodes = [];
				var dialogEl = null;
				var dialogElOffsetHeight = 0;
				var dialogElTopPosition = 0;
				var dialogElTotalHeight = 0;
				var BOTTOM_MARGIN = 30;

				A.one(iframeDoc).all('.aui-dialog').each(function(node) {
					if (node.getAttribute('aria-hidden') === 'false') {
						visibleDialogNodes.push(node);
					}
				});

				visibleDialogNodes = A.all(visibleDialogNodes);

				if (visibleDialogNodes.size() > 1) {
					var maxHeight = 0;
					var tallestVisibleDialog = [];

					visibleDialogNodes.each(function(node) {
						var elementHeight = node.get('offsetHeight');

						if (elementHeight > maxHeight) {
							maxHeight = elementHeight;
						}
					});

					visibleDialogNodes.each(function(node) {
						var elementHeight = node.get('offsetHeight');

						if (elementHeight === maxHeight) {
							tallestVisibleDialog.push(node);
						}
					});

					tallestVisibleDialog = A.all(tallestVisibleDialog);
					dialogEl = tallestVisibleDialog.item(0);
				}
				else {
					dialogEl = visibleDialogNodes.item(0);
				}

				if (dialogEl != null) {
					dialogElOffsetHeight = dialogEl.get('offsetHeight');
					dialogElTopPosition = parseInt(dialogEl.getStyle('top'), 10);
					dialogElTotalHeight = dialogElOffsetHeight + dialogElTopPosition + BOTTOM_MARGIN;
				}

				var docOffsetHeight = (iframeBody && iframeBody.offsetHeight) || 0;

				var standardsMode = (iframeDoc.compatMode == 'CSS1Compat');

				if (standardsMode && docOffsetHeight) {
					if (docOffsetHeight > dialogElTotalHeight) {
						contentHeight = docOffsetHeight;
					}
					else {
						contentHeight = dialogElTotalHeight;
					}
				}
				else {
					contentHeight = ResizeIframe._getQuirksHeight(iframeWin) || fallbackHeight;
				}
			}

			return contentHeight;
		},

		_getQuirksHeight: function(iframeWin) {
			var contentHeight = 0;

			var iframeDoc = iframeWin.document;
			var docEl = iframeDoc && iframeDoc.documentElement;
			var iframeBody = iframeDoc && iframeDoc.body;

			var viewPortHeight = 0;

			if (iframeWin.innerHeight) {
				viewPortHeight = iframeWin.innerHeight;
			}
			else if (docEl && docEl.clientHeight) {
				viewPortHeight = docEl.clientHeight;
			}
			else if (iframeBody) {
				viewPortHeight = iframeBody.clientHeight;
			}

			if (iframeDoc) {
				var docClientHeight;
				var docScrollHeight;
				var docOffsetHeight = (iframeBody && iframeBody.offsetHeight);

				if (docEl) {
					docClientHeight = docEl.clientHeight;
					docScrollHeight = docEl.scrollHeight;
					docOffsetHeight = docEl.offsetHeight;
				}

				if (docClientHeight != docOffsetHeight && iframeBody) {
					docOffsetHeight = iframeBody.offsetHeight;
					docScrollHeight = iframeBody.scrollHeight;
				}

				var compareNum;

				if (docScrollHeight > viewPortHeight) {
					compareNum = Math.max;
				}
				else {
					compareNum = Math.min;
				}

				contentHeight = compareNum(docScrollHeight, docOffsetHeight);
			}

			return contentHeight;
		}
	}
);

A.Plugin.ResizeIframe = ResizeIframe;

}, '@VERSION@' ,{requires:['aui-base','aui-task-manager','plugin'], skinnable:true});
