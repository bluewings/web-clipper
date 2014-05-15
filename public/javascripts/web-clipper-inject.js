/*jslint browser: true, unparam: true, indent: 4 */
/*global rangy: true */
(function () {

    'use strict';

    var $, view, app, status, templates = {};

    var CONFIG, URL, HTML;

    var SUCCESS = 200;

    status = {
        useMarker: false
    };



    var ELEMENT_NODE = 1,
        TEXT_NODE = 3,
        COMMENT_NODE = 8;

    var SVR_ADDR = "http://127.0.0.1:2000";

    URL = {

        TEMPLATE: SVR_ADDR + '/template/widget'

    };

    CONFIG = {
        ARCHIVE_KEY: 'web-clip-pages'
    };



    var selections = [];

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

    function drawSelections() {


    }

    function initNgModule(elen) {

        var ngApp = {};

        app = angular.module('web-clipper-widget', []);

        app.factory('cache', ['$rootScope',
            function ($rootScope) {

                var service;

                service = {
                    set: function (key, value) {
                        localStorage.setItem(key, angular.toJson(value));
                    },
                    get: function (key) {
                        return angular.fromJson(localStorage.getItem(CONFIG.ARCHIVE_KEY));
                    }
                }

                //$rootScope.$on("savestate", service.SaveState);
                //$rootScope.$on("restorestate", service.RestoreState);

                return service;
            }
        ]);

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

        app.controller('clipper-main', function ($scope, $element, $http, clipper, cache) {



            ngApp.scope = $scope;
            ngApp.element = $element;

            var cacheData = cache.get(CONFIG.ARCHIVE_KEY);

            console.log('>>> CACHE');
            console.log(cacheData);

            //alert('done');return;
            $scope.data = {

                showWidget: true,
                //useMarker: status.useMarker,
                useMarker: true,
                data: clipper.summarize(),
                pages: cacheData || {},
                selections: []

                //,
                //__test: JSON.parse('{"start":{"nodePath":"div#articleBody >> [type=3,index=8]","offset":73},"end":{"nodePath":"div#articleBody >> [type=3,index=9]","offset":209}}')
            };

            if ($scope.data.pages[location.href]) {
                $scope.data.selections = $scope.data.pages[location.href].selections;
            }

            $http.jsonp('http://127.0.0.1:2000/proxy/image/test?callback=JSON_CALLBACK').success(function (data) {

                console.log(data);

                var img = document.createElement('img');

                img.src = data.result.image;

                $(document.body).append(img);

            });

            $(window).on('resize', function (event) {

                drawWOW($scope.data.selections);

            }).trigger('resize');

            setTimeout(function () {

                return;


                console.dir(getNode($scope.data.__test.start.nodePath));

                console.dir(getNode($scope.data.__test.start.nodePath, ELEMENT_NODE));

                var range = rangy.createRange();

                range.setStart(getNode($scope.data.__test.start.nodePath), $scope.data.__test.start.offset);
                range.setEnd(getNode($scope.data.__test.end.nodePath), $scope.data.__test.end.offset);
                //range.getNodeContents( getNode($scope.data.__test.start.nodePath) );  

                //alert('done')              ;

                //var range = rangy.createRange();

                // All DOM Range methods and properties supported
                //range.getNodeContents( getNode($scope.data.__test.start.nodePath) );

                // Selection object based on those in Mozilla, WebKit and Opera
                var sel = rangy.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);

            }, 100);

            $scope.$watch('data.useMarker', function (after, before) {

                status.useMarker = after;
                if (status.useMarker) {
                    $(document.body).addClass('use-marker');
                } else {
                    $(document.body).removeClass('use-marker');
                }
            });

            $scope.func = {
                toggleMarker: function () {

                    $scope.data.useMarker = $scope.data.useMarker ? false : true;
                },
                selTest: function () {

                },
                save: function () {

                    if (!$scope.data.pages[location.href]) {
                        $scope.data.pages[location.href] = {};
                    }


                    var sum = clipper.summarize();
                    $scope.data.pages[location.href].href = location.href;
                    $scope.data.pages[location.href].title = sum.title;
                    $scope.data.pages[location.href].desc = sum.desc;
                    $scope.data.pages[location.href].thumb = sum.thumb;

                    $scope.data.pages[location.href].selections = $scope.data.selections;


                    //refer.scope.data.selections

                    cache.set(CONFIG.ARCHIVE_KEY, $scope.data.pages);



                }
            };
        });

        angular.bootstrap(elen, ['web-clipper-widget']);

        return ngApp;
    }

    function getNode(nodePath, resultType) {

        var elem = $(document.body),
            nodePath = nodePath.split(' >> '),
            elemPath = nodePath[0].split(/\[nth-of-filtered=([0-9]+)\]/),
            selector, index, matches, nodeType, nodeIndex, inx, nth;

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
                            break;
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
                selector, childElems;

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
                    if ($(selector).size() == 1) {
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
                                selector += '[nth-of-filtered=' + (index) + ']';
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

    function drawWOW(selections, collapse) {



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

            range.setStart(getNode(selections[inx].start.nodePath), selections[inx].start.offset);
            range.setEnd(getNode(selections[inx].end.nodePath), selections[inx].end.offset);
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

        //range.getNodeContents( getNode($scope.data.__test.start.nodePath) );  

        //alert('done')              ;

        //var range = rangy.createRange();

        // All DOM Range methods and properties supported
        //range.getNodeContents( getNode($scope.data.__test.start.nodePath) );

        // Selection object based on those in Mozilla, WebKit and Opera



    }

    function attachEvtHandler(refer) {

        $(document.body).on('mouseup', function () {

            var range, inx;


            var scrollTop = $(window).scrollTop(),
                scrollLeft = $(window).scrollLeft();

            if (!refer.scope.data.useMarker) {
                return;

            }

            range = rangy.getSelection().getRangeAt(0);

            if (range.startContainer === range.endContainer && range.startOffset === range.endOffset) {
                return;
            }
            //console.log('>>> range toString');
            //console.log(rangy.getSelection().getRangeAt(0).toString());
            console.log('>>> range at 0');
            console.log(rangy.getSelection().getRangeAt(0));

            console.log('');
            console.log('>>> START, END');



            console.log(getNodePath(range.startContainer));

            //console.log(JSON.stringify(ret));

            //console.log(getNodePath(range.startContainer), range.startOffset);

            //console.log(getNodePath(range.endContainer), range.endOffset);



            function getGGG(textNode) {

                var range = document.createRange();
                range.getNodeContents(textNode);
                var rects = range.getClientRects();

                //var textNodeLeft = rects[0].left; 
                console.log(rects);
                var div = $('<div></div>');
                var rect = rects[0];
                var rectE = rects[rects.length - 1];



                $(document.body).append(div);
                div.css({
                    position: 'absolute',
                    zIndex: 20000,
                    top: rect.top + scrollTop,
                    left: rect.left + scrollLeft,
                    height: rectE.top + rectE.height - rect.top,
                    width: rectE.left + rectE.width - rect.left,
                    //width: rect.width,
                    //height: rect.height,
                    backgroundColor: 'rgba(0,255,0,0.1)'

                });
            }

            //getGGG(range.startContainer);

            /*
var range = document.createRange();
range.getNodeContents(someTextNode);
var rects = range.getClientRects();

var textNodeLeft = rects[0].left;            
*/

            //console.log(rangy.getSelection().getRangeAt(0));

            var sel = rangy.getSelection().getRangeAt(0);

            //console.log('>>> client rects');

            //console.log(sel.nativeRange.getClientRects());

            var rectList = sel.nativeRange.getClientRects();
            var div;


            var rect;



            var data = {
                text: range.toString(),
                fullText: $.trim(range.commonAncestorContainer.textContent),
                start: {
                    nodePath: getNodePath(range.startContainer),
                    offset: range.startOffset
                },
                end: {
                    nodePath: getNodePath(range.endContainer),
                    offset: range.endOffset
                }
                //startText: $.trim(range.startContainer.textContent),
                //endText: $.trim(range.endContainer.textContent),
                //rects: rectList

            };



            if (!refer.scope.data.selections) {

                refer.scope.data.selections = [];
            }

            refer.scope.$apply(function () {
                refer.scope.data.selections.push(JSON.parse(JSON.stringify(data)));
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



            drawWOW(refer.scope.data.selections);

            rangy.getSelection().collapseToEnd();



            //var sel = rangy.getSelection().getRangeAt(0);

            //console.log('>>> client rects');

            //console.log(sel.nativeRange.getClientRects());

            //var rectList = sel.nativeRange.getClientRects();



            return;

            console.log('>>> SELECTIONS');
            console.log(selections);



            //var rects = [];

            for (inx = 0; inx < rectList.length; inx++) {

                rect = rectList[inx];

                if (rect.width > 0 && rect.height) {
                    div = $('<div></div>');
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

            //console.log('>>> bounding rect');

            //console.log(sel.nativeRange.getBoundingClientRect());

            var rect = sel.nativeRange.getBoundingClientRect()


            if (rect.width > 0 && rect.height) {
                div = $('<div></div>');
                $(document.body).append(div);
                div.css({
                    position: 'absolute',
                    zIndex: 20000,
                    top: rect.top + scrollTop,
                    left: rect.left + scrollLeft,
                    width: rect.width,
                    height: rect.height,
                    backgroundColor: 'rgba(255,0,0,0.05)'

                });
            }

            /*
var range = document.createRange();
range.getNodeContents(someTextNode);
var rects = range.getClientRects();

var textNodeLeft = rects[0].left;            
*/
            rangy.getSelection().collapseToEnd();

            //alert('collapse');

            //getClientRects


        });


    }



    function initialize() {

        rangy.init();



        initView(function () {

            var refer;



            refer = initNgModule(view.container);


            attachEvtHandler(refer);
        });
    }

    function attachEventHandler() {


        view.button.summarize.on('click', function () {

            var html = $('html');


            //console.log(html.size());
            _title(html);
            _desc(html);
            _thumb(html);
        });

        view.button.clip.on('click', function () {

            var mask = $('<div class="clip_mask"></div>');

            var canvas = document.createElement('canvas'),
                ctx = canvas.getContext('2d');



            $(document.body).append(mask);

            mask.css({

                position: 'absolute',
                zIndex: 10000,
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,255,255,0.1)'

            });

            canvas.width = mask.outerWidth();
            canvas.height = mask.outerHeight();

            mask.append(canvas);



            var onclipping = false;

            mask.on('mousedown', function (event) {

                if (onclipping === false) {

                    ctx.moveTo(event.pageX, event.pageY);
                    onclipping = true;

                }



            }).on('mousemove', function (event) {

                if (onclipping) {


                    ctx.lineTo(event.pageX, event.pageY);
                    ctx.stroke();

                }



            }).on('mouseup', function (event) {



                if (onclipping) {
                    onclipping = false;
                }



            });



        });



        $(document.body).on('click', function (event) {

            return;

            html2canvas(document.body, {
                onrendered: function (canvas) {
                    document.body.appendChild(canvas);
                }
            });

            return;

            console.log(event);
            var div = $('<div>');

            $(document.body).append(div);

            console.log(document.all.length);

            var tags = {};

            var elems = document.querySelectorAll('div, p, td, th, img');
            var inx;

            var rect;
            //for (inx = 0; inx < 20; inx++) {

            for (inx = elems.length - 1; inx >= 0; inx--) {
                //for (inx = 0; inx < elems.length; inx++) {

                //console.log(elems[inx].tagName);


                rect = getAbsoluteBoundingRect(elems[inx]); //.getBoundingClientRect();

                if (rect.left <= event.pageX && event.pageX <= rect.right && rect.top <= event.pageY && event.pageY <= rect.bottom) {

                    console.log(event);
                    console.log(rect);

                    if (!tags[elems[inx].tagName]) {
                        tags[elems[inx].tagName] = 0;
                    }
                    tags[elems[inx].tagName]++;

                    $(elems[inx]).css('background-color', 'rgba(255,0,0,0.1)');

                    console.log(elems[inx].tagName);
                    console.log($(elems[inx].tagName).html());
                    console.log($(elems[inx].tagName).contents());
                    break;
                }


                //break;



            }

            console.log(tags);



            div.css({
                position: 'absolute',
                left: event.pageX,
                top: event.pageY,
                width: 5,
                height: 5,
                zIndex: 1000,
                backgroundColor: 'red'
            });

        });

    }


    function getAbsoluteBoundingRect(el) {
        var doc = document,
            win = window,
            body = doc.body,

            // pageXOffset and pageYOffset work everywhere except IE <9.
            offsetX = win.pageXOffset !== undefined ? win.pageXOffset : (doc.documentElement || body.parentNode || body).scrollLeft,
            offsetY = win.pageYOffset !== undefined ? win.pageYOffset : (doc.documentElement || body.parentNode || body).scrollTop,

            rect = el.getBoundingClientRect();

        if (el !== body) {
            var parent = el.parentNode;

            // The element's rect will be affected by the scroll positions of
            // *all* of its scrollable parents, not just the window, so we have
            // to walk up the tree and collect every scroll offset. Good times.
            while (parent !== body) {
                offsetX += parent.scrollLeft;
                offsetY += parent.scrollTop;
                parent = parent.parentNode;
            }
        }

        return {
            bottom: rect.bottom + offsetY,
            height: rect.height,
            left: rect.left + offsetX,
            right: rect.right + offsetX,
            top: rect.top + offsetY,
            width: rect.width
        };
    }

    //    return;


    //////////////////////////


    function bootstrap() {

        var resources = [],
            noConflict = false;

        if (window.jQuery === undefined) {
            //alert('111');
            resources.push(SVR_ADDR + '/components/jquery/dist/jquery.min.js');
        } else if (window.$ && window.$ !== window.jQuery) {
            //alert('222');
            noConflict = true;
        }

        resources.push(SVR_ADDR + '/components/angular/angular.min.js');
        resources.push(SVR_ADDR + '/components/html2canvas/build/html2canvas.min.js');
        resources.push(SVR_ADDR + '/components/rangy-1.3/rangy-core.js');
        resources.push(SVR_ADDR + '/stylesheets/web-clipper-inject.css');

        loadResources(resources, function () {


            rangy = window.rangy;


            if (noConflict) {
                window.$.noConflict();
            }
            $ = window.jQuery;


            initialize();
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

    }, 100);

})();