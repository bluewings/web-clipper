/*jslint browser: true, unparam: true, indent: 4 */
/*global rangy: true */
(function () {

    'use strict';

    var $, view, app;

    var CONFIG, URL;

    var SUCCESS = 200,
        ELEMENT_NODE = 1,
        TEXT_NODE = 3,
        COMMENT_NODE = 8;

    CONFIG = {
        ARCHIVE_KEY: 'web-clip-pages',
        REMOTE_HOST: 'http://127.0.0.1:2000'
    };

    URL = {
        TEMPLATE: CONFIG.REMOTE_HOST + '/template/widget'
    };

    function initView(callback) {

        view = {
            container: null
        };

        $.ajax({
            url: URL.TEMPLATE,
            dataType: 'jsonp',
            jsonp: 'callback',
            success: function (data) {

                if (data.code === SUCCESS) {
                    view.container = document.createElement('div');
                    view.container.innerHTML = data.result.template;
                    document.body.appendChild(view.container);
                    if (callback && typeof callback === 'function') {
                        callback(view.container);
                    }
                }
            }
        });
    }

    function initNgModule(elen) {

        var ngApp = {};

        app = angular.module('web-clipper-widget', ['webClipper']);

        app.factory('cache', function () {

            return {
                set: function (key, value) {
                    localStorage.setItem(key, angular.toJson(value));
                },
                get: function (key) {
                    return angular.fromJson(localStorage.getItem(CONFIG.ARCHIVE_KEY));
                }
            };
        });

        app.service('clipper', function () {

            var service;

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

            service = {
                summarize: function (elem) {

                    elem = elem || $('html');
                    return {
                        location: location.href,
                        title: getInfo(elem, ['meta[property="og:title"]', 'meta[property="twitter:title"]', 'title']),
                        desc: getInfo(elem, ['meta[property="og:description"]', 'meta[property="twitter:description"]', 'p']),
                        thumb: getInfo(elem, ['meta[property="og:image"]', 'meta[property="twitter:image:src"]', 'meta[property="twitter:image"]', 'image'])
                    };
                }
            };

            return service;
        });

        app.controller('clipper-main', function ($scope, $element, $http, clipper, cache, clipUtil, clipCache) {

            var cacheData = cache.get(CONFIG.ARCHIVE_KEY);

            ngApp.scope = $scope;
            ngApp.element = $element;

            $scope.data = {
                showWidget: true,
                useMarker: true,
                data: clipUtil.summarize(),
                pages: cacheData || {},
                selections: []
            };

            console.log('>>> CACHE <<<');
            console.log(clipCache);



            clipCache.get(CONFIG.ARCHIVE_KEY).then(function(data) {


                console.log('promoseget result : ' + data);
                console.log(data);

            });
            console.log('get exec');

            if ($scope.data.pages[location.href]) {
                $scope.data.selections = $scope.data.pages[location.href].selections;
            }

            /* 이미지 프록시 테스트
            $http.jsonp('http://127.0.0.1:2000/proxy/image/test?callback=JSON_CALLBACK').success(function (data) {

                var img = document.createElement('img');

                img.src = data.result.image;
                $(document.body).append(img);
            });
            */


            $scope.$watch('data.useMarker', function (after, before) {

                if (after) {
                    $(document.body).addClass('use-marker');
                } else {
                    $(document.body).removeClass('use-marker');
                }
            });

            $scope.func = {
                toggleMarker: function () {

                    $scope.data.useMarker = $scope.data.useMarker ? false : true;
                },
                save: function () {

                    var sum = clipUtil.summarize();

                    if (!$scope.data.pages[location.href]) {
                        $scope.data.pages[location.href] = {};
                    }
                    $scope.data.pages[location.href].href = location.href;
                    $scope.data.pages[location.href].title = sum.title;
                    $scope.data.pages[location.href].desc = sum.desc;
                    $scope.data.pages[location.href].thumb = sum.thumb;
                    $scope.data.pages[location.href].selections = $scope.data.selections;

                    cache.set(CONFIG.ARCHIVE_KEY, $scope.data.pages);
                },
                renderSelection: function (selections, collapse) {



                    var range = rangy.createRange();
                    var sel = rangy.getSelection();

                    var inx, jnx, rectList, rect, div;
                    var scrollTop = $(window).scrollTop(),
                        scrollLeft = $(window).scrollLeft();

                    $('.selection').remove();

                    if (!selections || selections.length === 0) {
                        return;
                    }

                    for (inx = 0; inx < selections.length; inx++) {

                        range.setStart(clipUtil.getNode(selections[inx].start.nodePath), selections[inx].start.offset);
                        range.setEnd(clipUtil.getNode(selections[inx].end.nodePath), selections[inx].end.offset);
                        sel = rangy.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);

                        console.log(range);

                        rectList = range.nativeRange.getClientRects();

                        for (jnx = 0; jnx < rectList.length; jnx++) {

                            rect = rectList[jnx];

                            if (rect.width > 0 && rect.height) {
                                div = $('<div class="selection"></div>');
                                $(document.body).append(div);
                                div.css({
                                    position: 'absolute',
                                    zIndex: 20000,
                                    top: rect.top + scrollTop,
                                    left: rect.left + scrollLeft,
                                    width: rect.width,
                                    height: rect.height,
                                    backgroundColor: 'rgba(255,0,0,0.1)'

                                });



                            }



                        }

                    }
                    rangy.getSelection().collapseToEnd();
                }
            };

            $(window).on('resize', function (event) {

                $scope.func.renderSelection($scope.data.selections);

            }).trigger('resize');

            $(document.body).on('mouseup', function () {

                var range, inx;


                var scrollTop = $(window).scrollTop(),
                    scrollLeft = $(window).scrollLeft();

                if (!$scope.data.useMarker) {
                    return;

                }

                range = rangy.getSelection().getRangeAt(0);

                if (range.startContainer === range.endContainer && range.startOffset === range.endOffset) {
                    return;
                }



                var sel = rangy.getSelection().getRangeAt(0);


                var rectList = sel.nativeRange.getClientRects();
                var div;


                var rect;



                var data = {
                    text: range.toString(),
                    fullText: $.trim(range.commonAncestorContainer.textContent),
                    start: {
                        nodePath: clipUtil.getNodePath(range.startContainer),
                        offset: range.startOffset
                    },
                    end: {
                        nodePath: clipUtil.getNodePath(range.endContainer),
                        offset: range.endOffset
                    }
                    //startText: $.trim(range.startContainer.textContent),
                    //endText: $.trim(range.endContainer.textContent),
                    //rects: rectList

                };



                if (!$scope.data.selections) {

                    $scope.data.selections = [];
                }

                $scope.$apply(function () {
                    $scope.data.selections.push(JSON.parse(JSON.stringify(data)));
                });



                /*data.fullText = data.fullText.split(data.startText);
            //console.log();
            data.fullText.shift();
            data.fullText = data.startText + data.fullText.join('');
            data.fullText = data.fullText.split(data.endText);
            data.fullText.pop();
            data.fullText = data.fullText.join('') + data.endText;*/

                //selections.push(data);

                rangy.getSelection().collapseToEnd();



                $scope.func.renderSelection($scope.data.selections);

                rangy.getSelection().collapseToEnd();



            });
        });

        angular.bootstrap(elen, ['web-clipper-widget']);

        return ngApp;
    }




    function initialize() {

        rangy.init();

        initView(function () {

            initNgModule(view.container);
        });
    }


    //    return;


    //////////////////////////


    function bootstrap() {

        var resources = [],
            noConflict = false;

        if (window.jQuery === undefined) {
            resources.push(CONFIG.REMOTE_HOST + '/components/jquery/dist/jquery.min.js');
        } else if (window.$ && window.$ !== window.jQuery) {
            noConflict = true;
        }

        resources.push(CONFIG.REMOTE_HOST + '/components/angular/angular.min.js');
        resources.push(CONFIG.REMOTE_HOST + '/components/html2canvas/build/html2canvas.min.js');
        resources.push(CONFIG.REMOTE_HOST + '/components/rangy-1.3/rangy-core.js');
        resources.push(CONFIG.REMOTE_HOST + '/stylesheets/web-clipper-inject.css');

        loadResources(resources, function () {

            loadResources([CONFIG.REMOTE_HOST + '/javascripts/web-clipper.util.js'], function () {

                if (noConflict) {
                    window.$.noConflict();
                }
                $ = window.jQuery;
                initialize();
            });
        });
    }

    function loadResources(srcList, callback) {

        var inx, element, type, elements = [];

        if (typeof srcList == 'string') {
            srcList = [srcList];
        }

        for (inx = 0; inx < srcList.length; inx++) {
            type = srcList[inx].match(/\.js$/) ? 'script' : 'css';
            element = document.createElement(type == 'script' ? 'SCRIPT' : 'LINK');
            elements.push(element);
            element.onload = function () {
                var inx, ready = true;
                this.__ready = true;
                for (inx = 0; inx < elements.length; inx++) {
                    if (!elements[inx].__ready) {
                        ready = false;
                        break;
                    }
                }
                if (ready && callback && typeof callback == 'function') {
                    callback();
                }
            };
            if (type == 'script') {
                element.type = 'text/javascript';
                element.src = srcList[inx];
            } else {
                element.rel = 'stylesheet';
                element.type = 'text/css';
                element.href = srcList[inx];
            }

            document.body.appendChild(element);
        }
    }

    setTimeout(function () {

        bootstrap();

    }, 1);

})();