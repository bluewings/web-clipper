/*jslint browser: true, regexp: true, unparam: true, indent: 4 */
/*global jQuery: true */
(function () {

    'use strict';

    var $ = jQuery;

    var app = angular.module('webClipper', []);

    app.service('clipCache', ['$q',
        function ($q) {

            var DEFAULT_URL = 'http://bluewings.github.io/globalStorage.html',
                DEFAULT_ORIGIN = 'http://bluewings.github.io';

            var DEFAULT_URL = 'http://127.0.0.1:2000/globalStorage',
                DEFAULT_ORIGIN = 'http://127.0.0.1:2000';

            var iframe, callback = {},
                resolves = [],
                listener = {},
                myId = parseInt(Math.random() * 1000000, 10);

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

            $(window).bind('message', function (event) {

                var data, inx, owner;

                try {
                    data = JSON.parse(event.originalEvent.data);
                    data.value = JSON.parse(data.value);
                    if (data.value && data.value._owner) {
                        owner = data.value && data.value._owner;
                        delete data.value._owner;
                    }
                } catch (ignore) {
                    // noop
                }
                if (data) {
                    if (data._key && callback[data._key]) {
                        callback[data._key](data);
                        delete callback[data._key];
                    } else if (data._type) {
                        if (owner !== myId && listener[data._type]) {
                            for (inx = 0; inx < listener[data._type].length; inx++) {
                                listener[data._type][inx](data.key, data.value);
                            }
                        }
                    }    
                }
                
            });

            function postMessage(message, userCallback) {

                bootstrap().then(function (ifrm) {

                    var key = 'cb' + parseInt(Math.random() * 100000, 10);
                    callback[key] = userCallback;
                    message._key = key;
                    message._origin = location.origin;
                    if (message.value) {
                        message.value = JSON.parse(JSON.stringify(message.value));
                        message.value._owner = myId;
                    }
                    ifrm.contentWindow.postMessage(angular.toJson(message), DEFAULT_ORIGIN);
                });
            }

            function setData(scope, path, value) {

                var chunk, key;

                if (!path) {
                    return scope;
                }
                chunk = path.split('.');
                key = chunk.shift();
                if (scope && scope[key]) {
                    if (chunk.length === 0) {
                        scope[key] = value;
                        return true;
                    }
                    return setData(scope[key], chunk.join('.'), value);
                }
                return scope;
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
                },
                on: function (type, callback) {

                    if (!listener[type]) {
                        listener[type] = [];
                    }
                    listener[type].push(callback);
                },
                sync: function (scope, localVar, archiveKey) {

                    var deferred = $q.defer(),
                        that = this,
                        skip = true;

                    scope.$watch(localVar, function (newValue, oldValue) {

                        if (!skip) {
                            that.set(archiveKey, newValue);
                        }
                        skip = false;
                    }, true);

                    that.get(archiveKey).then(function (data) {

                        setData(scope, localVar, data);
                        deferred.resolve(data);
                    });

                    function handleCacheChanges(type, key, value) {

                        if (key === archiveKey) {
                            scope.$apply(function () {
                                switch (type) {
                                case 'create':
                                case 'modify':
                                    setData(scope, localVar, value);
                                    break;
                                case 'remove':
                                    setData(scope, localVar, {
                                        asideOpen: false,
                                        listType: 'tile'
                                    });
                                    break;
                                default:
                                    break;
                                }
                            });
                        }
                    }
                    that.on('create', function (key, value) {
                        handleCacheChanges('create', key, value);
                    });
                    that.on('modify', function (key, value) {
                        handleCacheChanges('modify', key, value);
                    });
                    that.on('remove', function (key, value) {
                        handleCacheChanges('remove', key, value);
                    });
                    return deferred.promise;
                }
            };
        }
    ]);

    app.service('clipUtil', ['$q',
        function ($q) {

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

                    var data, img, deferred = $q.defer();
                    elem = elem || $('html');
                    data = {
                        href: location.href,
                        title: getInfo(elem, ['meta[property="og:title"]', 'meta[property="twitter:title"]', 'title']),
                        desc: getInfo(elem, ['meta[property="og:description"]', 'meta[property="twitter:description"]', 'p']),
                        thumb: {
                            src: getInfo(elem, ['meta[property="og:image"]', 'meta[property="twitter:image:src"]', 'meta[property="twitter:image"]', 'image']),
                            width: 0,
                            height: 0
                        }
                    };
                    if (data.thumb.src === 'http://static.news.naver.net/image/navernews_200x200_new.jpg') {
                        data.thumb.src = '';
                    }
                    if (data.desc && data.desc.length > 200) {
                        data.desc = data.desc.substr(0, 200) + '...';
                    }
                    if (data.thumb.src) {
                        img = document.createElement('img');
                        img.onload = function () {
                            data.thumb.width = img.width;
                            data.thumb.height = img.height;
                            deferred.resolve(data);
                        };
                        img.src = data.thumb.src;
                    } else {
                        delete data.thumb;
                        deferred.resolve(data);
                    }
                    return deferred.promise;
                },
                getNode: getNode,
                getNodePath: getNodePath
            };

            return service;
        }
    ]);

}());