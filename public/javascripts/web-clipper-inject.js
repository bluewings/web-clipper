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

        app.controller('clipper-main', function ($scope, $element, $http, clipUtil, clipCache) {

            ngApp.scope = $scope;
            ngApp.element = $element;

            $scope.data = {
                showWidget: true,
                useMarker: true,
                data: clipUtil.summarize(),
                _pages: {},
                pages: [],
                selections: [],
                current: {
                    favorite: false,
                    selections: []
                }
            };

            $scope.$watch('data._pages', function (newValue, oldValue) {


                $scope.data.pages = [];

                angular.forEach(newValue, function (value, key) {

                    $scope.data.pages.push(value);
                });



            }, true);

            clipCache.get(CONFIG.ARCHIVE_KEY).then(function (data) {

                if (!data || typeof data !== 'object') {
                    data = {};
                }
                $scope.data._pages = data;
                if ($scope.data._pages[location.href]) {
                    $scope.data.current.selections = $scope.data._pages[location.href].selections;

                    $(window).trigger('resize');
                }
            });

            console.log('get exec');



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

            var focused;

            $scope.func = {
                toggleReveal: function() {

                    var body = $(document.body);
                    if (body.hasClass('web-clipper-open')) {

                        body.removeClass('web-clipper-open');

                    } else {

                        body.addClass('web-clipper-open');

                    }

                },
                toggleFavorite: function() {

                    $scope.data.current.favorite = $scope.data.current.favorite ? false : true;

                },
                toggleMarker: function () {

                    $scope.data.useMarker = $scope.data.useMarker ? false : true;
                },
                forus: function (target) {


                    if (focused) {
                        delete focused._focus;
                    }
                    target._focus = true;
                    focused = target;
                },
                forusout: function (target) {

                    delete target._focus;
                    focused = null;
                },
                remove: function (target) {

                    if (!target) {
                        $scope.data._pages = {};
                    } else if ($scope.data._pages[target.href]) {
                        delete $scope.data._pages[target.href];
                    }
                    clipCache.set(CONFIG.ARCHIVE_KEY, $scope.data._pages).then(function (data) {

                        //alert('저장되었습니다.');
                    });
                },
                save: function () {

                    var sum = clipUtil.summarize();

                    if (!$scope.data._pages[location.href]) {
                        $scope.data._pages[location.href] = {
                            created: (new Date()).toString()
                        };
                    }
                    $scope.data._pages[location.href].href = location.href;
                    $scope.data._pages[location.href].title = sum.title;
                    $scope.data._pages[location.href].desc = sum.desc;
                    $scope.data._pages[location.href].thumb = sum.thumb;
                    $scope.data._pages[location.href].selections = $scope.data.current.selections;

                    //cache.set(CONFIG.ARCHIVE_KEY, $scope.data._pages);


                    clipCache.set(CONFIG.ARCHIVE_KEY, $scope.data._pages).then(function (data) {

                        alert('저장되었습니다.');
                    });

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

            $(window).bind('resize', function (event) {

                $scope.func.renderSelection($scope.data.current.selections);

            });

            $(document.body).bind('mouseup', function () {

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



                if (!$scope.data.current.selections) {

                    $scope.data.current.selections = [];
                }

                $scope.$apply(function () {
                    $scope.data.current.selections.push(JSON.parse(JSON.stringify(data)));
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



                $scope.func.renderSelection($scope.data.current.selections);

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

        //alert($)   ;
        //alert(jindo);

        //alert(window.$ === window.jindo);



        if (window.jQuery === undefined) {
            resources.push(CONFIG.REMOTE_HOST + '/components/jquery/dist/jquery.min.js');
        } else if (window.$ && !window.$.fx) {
            noConflict = true;
        }

        //alert(noConflict);
        //alert(window.jQuery);

        //alert(window.$);

        resources.push(CONFIG.REMOTE_HOST + '/components/angular/angular.min.js');
        resources.push(CONFIG.REMOTE_HOST + '/components/html2canvas/build/html2canvas.min.js');
        resources.push(CONFIG.REMOTE_HOST + '/components/rangy-1.3/rangy-core.js');
        resources.push(CONFIG.REMOTE_HOST + '/stylesheets/web-clipper-inject.css');

        loadResources(resources, function () {

            loadResources([CONFIG.REMOTE_HOST + '/javascripts/web-clipper.util.js'], function () {

                if (noConflict) {
                    window.jQuery.noConflict();
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

    }, 0);

})();