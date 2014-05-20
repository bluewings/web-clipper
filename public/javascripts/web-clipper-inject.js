/*jslint browser: true, unparam: true, indent: 4 */
/*global rangy: true */
(function () {

    'use strict';

    var $, view, app, body;

    var CONFIG, URL;

    var SUCCESS = 200,
        ELEMENT_NODE = 1,
        TEXT_NODE = 3;

    CONFIG = {
        ARCHIVE_PAGES_KEY: 'web-clip-pages',
        ARCHIVE_STATUS_KEY: 'web-clip-status',
        REMOTE_HOST: 'http://127.0.0.1:2000'
    };

    URL = {
        TEMPLATE: CONFIG.REMOTE_HOST + '/template/widget'
    };

    function initView(callback) {

        body = $(document.body);

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

        app = angular.module('web-clipper-widget', ['webClipper', 'ngAnimate']);

        app.directive("masonry", function () {
            var NGREPEAT_SOURCE_RE = '<!-- ngRepeat: ((.*) in ((.*?)( track by (.*))?)) -->';
            return {
                compile: function(element, attrs) {
                    // auto add animation to brick element
                    var animation = attrs.ngAnimate || "'masonry'";
                    var $brick = element.children();
                    $brick.attr("ng-animate", animation);
                    
                    // generate item selector (exclude leaving items)
                    var type = $brick.prop('tagName');
                    var itemSelector = type+":not([class$='-leave-active'])";
                    
                    return function (scope, element, attrs) {
                        var options = angular.extend({
                            itemSelector: itemSelector
                        }, scope.$eval(attrs.masonry));
                        
                        // try to infer model from ngRepeat
                        if (!options.model) { 
                            var ngRepeatMatch = element.html().match(NGREPEAT_SOURCE_RE);
                            if (ngRepeatMatch) {
                                options.model = ngRepeatMatch[4];
                            }
                        }
                        
                        // initial animation
                        element.addClass('masonry');
                        
                        // Wait inside directives to render
                        setTimeout(function () {
                            element.masonry(options);
                            
                            element.on("$destroy", function () {
                                element.masonry('destroy')
                            });
                            
                            if (options.model) {
                                scope.$apply(function() {
                                    scope.$watchCollection(options.model, function (_new, _old) {
                                        if(_new == _old) return;
                                        
                                        // Wait inside directives to render
                                        setTimeout(function () {
                                            element.masonry("reload");
                                        });
                                        setTimeout(function () {
                                            element.masonry("reload");
                                        }, 100);
                                    });
                                });
                            }
                        });
                    };
                }
            };
        });

        app.controller('clipper-main', function ($scope, $element, $http, $timeout, clipUtil, clipCache) {

            var timer, syncStatus = true;

            $scope.data = {
                status: {
                    asideOpen: false,
                    mode: null,
                    listType: 'tile'
                },
                pages: {},
                _pages: [],
                _this: null // current page reference
            };

            if (syncStatus) {
                clipCache.sync($scope, 'data.status', CONFIG.ARCHIVE_STATUS_KEY);
            } else {
                $scope.$watch('data.status', function (newValue, oldValue) {
                    if (newValue) {
                        clipCache.set(CONFIG.ARCHIVE_STATUS_KEY, newValue);
                        if (newValue.asideOpen === true) {
                            body.addClass('web-clipper-open');
                        } else {
                            body.removeClass('web-clipper-open');
                        }
                    }
                }, true);
                clipCache.get(CONFIG.ARCHIVE_STATUS_KEY).then(function (value) {
                    if (value && value.asideOpen !== undefined) {
                        $scope.data.status = value;
                    }
                });
            }

            $scope.$watch('data.status.asideOpen', function (newValue, oldValue) {

                if (newValue === true) {
                    body.addClass('web-clipper-open');
                } else {
                    body.removeClass('web-clipper-open');
                }
            });

            $scope.$watchCollection('data.pages', function (newValue, oldValue) {

                var key, inx;

                if (newValue) {

                    newValue = JSON.parse(JSON.stringify(newValue));

                    var newList = [];
                    


                    
                    angular.forEach($scope.data._pages, function(value, key) {
                        if (newValue[value.href]) {
                            newList.push(value);
                            delete newValue[value.href];
                        }
                    });

                    angular.forEach(newValue, function(value, key) {
                        //if (!$scope.data._pages[value.href]) {
                            newList.push(value);
                        //}
                    });                    

                    console.log(newList);

                    $scope.data._pages = newList;
                    /*

                    //$scope.data._pages = [];
                    for (key in $scope.data.pages) {
                        if ($scope.data.pages.hasOwnProperty(key)) {
                            $scope.data._pages.push($scope.data.pages[key]);
                        }
                    }*/
                }
            }, false);

            $scope.$watch('data._this', function (newValue, oldValue) {

                if (!newValue || !newValue.href) {
                    return;
                }
                if (newValue.favorite || (newValue.selections && newValue.selections.length > 0)) {
                    if (!$scope.data.pages[newValue.href]) {
                        newValue.created = (new Date()).toISOString();
                        $scope.data.pages[newValue.href] = newValue;
                    }
                } else if ($scope.data.pages[newValue.href]) {
                    delete $scope.data.pages[newValue.href];
                }
                $scope.func.renderSelection(newValue.selections);

            }, true);

            clipUtil.summarize().then(function (summary) {

                $scope.data._this = {
                    href: summary.href,
                    title: summary.title,
                    desc: summary.desc,
                    thumb: summary.thumb
                };
                clipCache.sync($scope, 'data.pages', CONFIG.ARCHIVE_PAGES_KEY).then(function (pages) {
                    pages = pages || {};

                    if (pages && pages[$scope.data._this.href]) {
                        console.log('first set 1');
                        $scope.data._this = pages[$scope.data._this.href];
                    }
                });
            });

            $(document.body).bind('mouseup', function () {

                var range, inx;

                console.log('>>');

                if ($scope.data.status.mode !== 'underline') {
                    return;
                }
                try {
                    range = rangy.getSelection().getRangeAt(0);
                    
                } catch (ignore) {
                    return;
                }
                if (range.startContainer === range.endContainer && range.startOffset === range.endOffset) {
                    return;
                }
                if (!$scope.data._this.selections) {
                    $scope.data._this.selections = [];
                }
                $scope.$apply(function () {
                    $scope.data._this.selections.push(JSON.parse(JSON.stringify({
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
                    })));
                    rangy.getSelection().collapseToEnd();
                });
            });

            $scope.func = {
                renderSelection: function (selections, collapse) {

                    var inx, jnx, rectList, rect, div,
                        range = rangy.createRange(),
                        sel = rangy.getSelection(),
                        scrollTop = $(window).scrollTop(),
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

                $scope.func.renderSelection($scope.data._this.selections);
            });
            body.delegate('.web-clipper-widget', 'transitionend', function (event) {

                clearTimeout(timer);
                timer = setTimeout(function () {
                    $scope.func.renderSelection($scope.data._this.selections);
                });
            });
            return;



            /*$scope.data = {
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

            clipCache.get(CONFIG.ARCHIVE_PAGES_KEY).then(function (data) {

                if (!data || typeof data !== 'object') {
                    data = {};
                }
                $scope.data._pages = data;
                if ($scope.data._pages[location.href]) {
                    $scope.data._this.selections = $scope.data._pages[location.href].selections;

                    $(window).trigger('resize');
                }
            });

            console.log('get exec');*/



            /* 이미지 프록시 테스트
            $http.jsonp('http://127.0.0.1:2000/proxy/image/test?callback=JSON_CALLBACK').success(function (data) {

                var img = document.createElement('img');

                img.src = data.result.image;
                $(document.body).append(img);
            });
            */


            /*$scope.$watch('data.status.mode', function (after, before) {

                if (after === 'underline') {
                    $(document.body).addClass('use-marker');
                } else {
                    $(document.body).removeClass('use-marker');
                }
            });

            var focused;

            $scope.func = {
                toggleReveal: function () {

                    var body = $(document.body);
                    if (body.hasClass('web-clipper-open')) {

                        body.removeClass('web-clipper-open');

                    } else {

                        body.addClass('web-clipper-open');

                    }

                },
                toggleFavorite: function () {

                    $scope.data._this.favorite = $scope.data._this.favorite ? false : true;

                },
                toggleMarker: function () {

                    $scope.data.status.mode = $scope.data.status.mode === 'underline' ? null : 'underline';
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
                    clipCache.set(CONFIG.ARCHIVE_PAGES_KEY, $scope.data._pages).then(function (data) {

                        //alert('저장되었습니다.');
                    });
                },
                save: function () {

                    var sum = clipUtil.summarize();

                    if (!$scope.data._pages[location.href]) {
                        $scope.data._pages[location.href] = {
                            created: (new Date()).toISOString()
                        };
                    }




                    $scope.data._pages[location.href].href = location.href;
                    $scope.data._pages[location.href].title = sum.title;
                    $scope.data._pages[location.href].desc = sum.desc;
                    $scope.data._pages[location.href].thumb = sum.thumb;
                    $scope.data._pages[location.href].selections = $scope.data._this.selections;

                    //cache.set(CONFIG.ARCHIVE_PAGES_KEY, $scope.data._pages);


                    clipCache.set(CONFIG.ARCHIVE_PAGES_KEY, $scope.data._pages).then(function (data) {

                        alert('저장되었습니다.');
                    });

                },

            };

            $(window).bind('resize', function (event) {

                $scope.func.renderSelection($scope.data._this.selections);

            });
*/
        });

        angular.bootstrap(elen, ['web-clipper-widget']);
    }

    function initialize() {

        rangy.init();

        initView(function () {

            initNgModule(view.container);
        });
    }

    function loadResources(srcList, callback) {

        var inx, element, type, elements = [];

        if (typeof srcList === 'string') {
            srcList = [srcList];
        }

        function cb_onload() {

            var jnx, ready = true;
            this.__ready = true;
            for (jnx = 0; jnx < elements.length; jnx++) {
                if (!elements[jnx].__ready) {
                    ready = false;
                    break;
                }
            }
            if (ready && callback && typeof callback === 'function') {
                callback();
            }
        }

        for (inx = 0; inx < srcList.length; inx++) {
            type = srcList[inx].match(/\.js$/) ? 'script' : 'css';
            element = document.createElement(type === 'script' ? 'SCRIPT' : 'LINK');
            elements.push(element);
            element.onload = cb_onload;
            if (type === 'script') {
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

    function bootstrap() {

        var resources = [],
            noConflict = false;

        if (window.jQuery === undefined) {
            resources.push(CONFIG.REMOTE_HOST + '/components/jquery/dist/jquery.min.js');
        } else if (window.$ && !window.$.fx) {
            noConflict = true;
        }

        resources.push(CONFIG.REMOTE_HOST + '/components/angular/angular.min.js');
        //resources.push(CONFIG.REMOTE_HOST + '/components/angular-animate/angular-animate.min.js');
        resources.push(CONFIG.REMOTE_HOST + '/components/html2canvas/build/html2canvas.min.js');
        resources.push(CONFIG.REMOTE_HOST + '/components/rangy-1.3/rangy-core.js');
        resources.push(CONFIG.REMOTE_HOST + '/stylesheets/web-clipper-inject.css');

        loadResources(resources, function () {

            loadResources([
                //CONFIG.REMOTE_HOST + '/components/isotope/dist/isotope.pkgd.min.js',
                //CONFIG.REMOTE_HOST + '/components/jquery-masonry/dist/masonry.pkgd.min.js',
                'http://cdnjs.cloudflare.com/ajax/libs/masonry/2.1.08/jquery.masonry.min.js',
                CONFIG.REMOTE_HOST + '/components/angular-animate/angular-animate.min.js',

                
               CONFIG.REMOTE_HOST +  '/javascripts/web-clipper.util.js'], function() {

                if (noConflict) {
                    window.jQuery.noConflict();
                }
                $ = window.jQuery;
                initialize();
            });
        });
    }

    setTimeout(function () {

        bootstrap();

    }, 0);

}());