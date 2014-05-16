/*jslint browser: true, regexp: true, indent: 4 */
(function () {

    'use strict';

    var app = angular.module('webClipper', []);

    app.service('clipCache', function ($q) {

        var DEFAULT_URL = 'http://bluewings.github.io/globalStorage.html',
            DEFAULT_ORIGIN = 'http://bluewings.github.io';

        var iframe, callback = {},
            resolves = [];

        function bootstrap() {

            var deferred = $q.defer();

            if (iframe && iframe.ready) {
                deferred.resolve(iframe);
            } else {
                resolves.push(deferred);
                if (!iframe) {
                    iframe = document.createElement('iframe');
                    iframe.frameBorder = 0;
                    iframe.width = 0;
                    iframe.height = 0;
                    iframe.style.display = 'none';
                    iframe.onload = function () {
                        var each;
                        iframe.ready = true;
                        while (each = resolves.shift()) {
                            each.resolve(iframe);
                        }
                    };
                    iframe.src = DEFAULT_URL;
                    document.body.appendChild(iframe);
                }
            }
            return deferred.promise;
        }

        $(window).on('message', function (event) {

            var data;

            try {
                data = JSON.parse(event.originalEvent.data);
            } catch (ignore) {
                // noop
            }

            if (data._key && callback[data._key]) {
                callback[data._key](data);
                delete callback[data._key];
            }
        });

        function postMessage(message, userCallback) {

            bootstrap().then(function (ifrm) {

                var key = 'cb' + parseInt(Math.random() * 100000, 10);
                callback[key] = userCallback;
                message._key = key;
                message._origin = location.origin;
                ifrm.contentWindow.postMessage(angular.toJson(message), DEFAULT_ORIGIN);
            });
        }

        bootstrap();

        return {
            get: function (key) {

                var deferred = $q.defer();
                postMessage({
                    method: 'get',
                    key: key
                }, function (data) {
                    deferred.resolve(data.result);
                });
                return deferred.promise;
            },
            set: function (key, value) {

                var deferred = $q.defer();
                postMessage({
                    method: 'set',
                    key: key,
                    value: value
                }, function (data) {
                    deferred.resolve(data.result);
                });
                return deferred.promise;
            }
        };
    });

    app.service('clipUtil', function () {

        var service;

        var ELEMENT_NODE = 1,
            TEXT_NODE = 3;

        function getInfo(elem, selectors) {

            var search;

            do {
                search = elem.find(selectors.shift());
            } while (search && search.size() === 0 && selectors.length > 0);

            if (search.size() > 0) {
                return $.trim(search.attr('content') || search.text());
            }
            return '';
        }

        function getNode(nodePath, resultType) {

            var elemPath, selector, index, matches, nodeType, nodeIndex, inx, nth, elem = $(document.body);

            nodePath = nodePath.split(' >> ');
            elemPath = nodePath[0].split(/\[nth-of-filtered=([0-9]+)\]/);
            nodePath = nodePath[1] || '';
            do {
                selector = $.trim(elemPath.shift());
                index = parseInt(elemPath.shift(), 10);
                if (selector) {
                    elem = elem.find(selector);
                    if (!isNaN(index)) {
                        elem = elem.eq(index);
                    }
                }
            } while (elemPath.length > 0);
            elem = elem.get(0);
            if (resultType !== ELEMENT_NODE && nodePath) {
                matches = nodePath.match(/\[type=([0-9]+)\s*,\s*index=([0-9]+)\]/);
                if (matches && matches.length > 2) {
                    nodeType = parseInt(matches[1], 10);
                    nodeIndex = parseInt(matches[2], 10);
                    for (inx = 0, nth = 0; inx < elem.childNodes.length; inx++) {

                        if (elem.childNodes[inx].nodeType === nodeType) {
                            if (nth === nodeIndex) {
                                return elem.childNodes[inx];
                            }
                            nth++;
                        }
                    }
                }
            }
            return elem;
        }

        function getNodePath(node) {

            var nodePath, inx, nth;

            function _getModSelector(elem, result) {

                var parent = elem.parent(),
                    elemNode = elem.get(0),
                    elemId = elemNode.id,
                    tagName = elemNode.tagName,
                    className = elemNode.className,
                    selector,
                    childElems;

                result = result || [];

                // ignore abnormal classname
                if (className) {
                    className = $.trim(className).replace(/\s+/g, '.');
                    if (className.search(/[^a-zA-Z0-9\_\-\.]/) !== -1) {
                        className = null;
                    }
                }

                // ignore abnormal element id
                if (elemId && elemId.search(/[^a-zA-Z0-9\_\-]/) !== -1) {
                    elemId = null;
                }

                if (tagName && tagName !== 'HTML') {
                    selector = tagName.toLowerCase();
                    if (elemId) {
                        selector += '#' + elemId;
                        if ($(selector).size() === 1) {
                            result.unshift(selector);
                            return result.join(' > ');
                        }
                    }
                    if (tagName !== 'BODY' && className) {
                        selector += '.' + className;
                    }
                    if (parent.size() > 0) {
                        childElems = parent.find('> ' + selector);
                        if (childElems.size() > 1) {
                            childElems.each(function (index, item) {
                                if (elemNode === item) {
                                    selector += '[nth-of-filtered=' + index + ']';
                                    return false;
                                }
                            });
                        }
                    }
                    result.unshift(selector);
                }

                if (parent.size() > 0) {
                    _getModSelector(parent, result);
                }
                return result.join(' > ');
            }

            if ($.inArray(node.nodeType, [ELEMENT_NODE, TEXT_NODE]) === -1) {
                throw 'Not supported node type.';
            }

            if (node.nodeType === ELEMENT_NODE) {
                return _getModSelector($(node));
            }
            nodePath = _getModSelector($(node.parentElement));
            for (inx = 0, nth = 0; inx < node.parentElement.childNodes.length; inx++) {
                if (node.parentElement.childNodes[inx] === node) {
                    nodePath += ' >> [type=' + node.nodeType + ',index=' + nth + ']';
                    break;
                }
                if (node.parentElement.childNodes[inx].nodeType === node.nodeType) {
                    nth++;
                }
            }

            return nodePath;
        }

        service = {
            summarize: function (elem) {

                elem = elem || $('html');
                return {
                    location: location.href,
                    title: getInfo(elem, ['meta[property="og:title"]', 'meta[property="twitter:title"]', 'title']),
                    desc: getInfo(elem, ['meta[property="og:description"]', 'meta[property="twitter:description"]', 'p']),
                    thumb: getInfo(elem, ['meta[property="og:image"]', 'meta[property="twitter:image:src"]', 'meta[property="twitter:image"]', 'image'])
                };
            },
            getNode: getNode,
            getNodePath: getNodePath
        };

        return service;
    });

}());