(function () {

    'use strict';

    var view = {};

    var HTML = {
        CONTAINER: ' ' +
            '<div style="position:fixed;top:10px;right:10px;z-index:1000;"> ' +
            '<button class="btn-summarize" style="padding:10px;">clip</button> ' +
            '<button class="btn-clip" style="padding:10px;">cut</button> ' +
            '</div>'
    };

    var $;

    function loadScripts(srcList, callback) {

        var inx, scripts = [],
            script;

        if (typeof srcList == 'string') {
            srcList = [srcList];
        }

        for (inx = 0; inx < srcList.length; inx++) {

            script = document.createElement('SCRIPT');
            scripts.push(script);
            script.onload = function () {

                var ready = true,
                    inx;

                this.__ready = true;

                for (inx = 0; inx < scripts.length; inx++) {

                    if (!scripts[inx].__ready) {
                        ready = false;
                        break;
                    }

                }

                if (ready && callback && typeof callback == 'function') {
                    callback();
                }

                console.dir('ready = ' + ready);

                //console.log(this.complete);

                return;


                if (callback && typeof callback == 'function') {
                    callback();
                }
            };
            script.type = 'text/javascript';
            script.src = srcList[inx];
            document.body.appendChild(script);
        }










    }



    function initialize() {

        initView();

        console.log('initialize');

        rangy.init();

        // Enable multiple selections in IE
        try {
            document.execCommand("MultipleSelection", true, true);
        } catch (ex) {}


        $(document.body).on('mouseup', function () {


            console.log('mouseup');
            console.log(rangy);

            console.log(rangy.getSelection().getRangeAt(0).toString());
            console.log(rangy.getSelection().getRangeAt(0));

            console.log(rangy.getSelection().getRangeAt(0));

            var sel = rangy.getSelection().getRangeAt(0);

            console.log('>>> client rects');

            console.log(sel.nativeRange.getClientRects());

            var rectList = sel.nativeRange.getClientRects();
            var div;

            var scrollTop = $(window).scrollTop(),
                scrollLeft = $(window).scrollLeft();

            var rect;

            for (var inx = 0; inx < rectList.length; inx++) {

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

            console.log('>>> bounding rect');

            console.log(sel.nativeRange.getBoundingClientRect());

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

            //getClientRects

            return;

            console.log(rangy);

            var range = rangy.createRange();



            // All DOM Range methods and properties supported
            range.selectNodeContents(document.body);

            console.log(range);

            //console.log(rangy.getSelection().getRangeAt(0));

            return;

            // Selection object based on those in Mozilla, WebKit and Opera
            var sel = rangy.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

        });

        //attachEventHandler();




    }

    function initView() {

        view = {
            container: $(HTML.CONTAINER),
            button: {
                summarize: null,
                clip: null
            }

        };

        $(document.body).append(view.container);

        view.button.summarize = view.container.find('button.btn-summarize');
        view.button.clip = view.container.find('button.btn-clip');

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

    function searchElem(elem, selectors) {

        var search;


        do {
            search = elem.find(selectors.shift());
        } while (search && search.size() === 0);

        if (search.size() > 0) {
            return search.attr('content');
        } else {
            return '';
        }

    }

    function _title(elem) {

        var title = searchElem(elem, ['meta[property="og:title"]', 'meta[property="twitter:title"]', 'title']);

        console.log('>>> TITLE : ' + title);

    }

    function _desc(elem) {

        var desc = searchElem(elem, ['meta[property="og:description"]', 'meta[property="twitter:description"]', 'p']);

        console.log('>>> DESC : ' + desc);

    }

    function _thumb(elem) {

        var thumb = searchElem(elem, ['meta[property="og:image"]', 'meta[property="twitter:image:src"]', 'meta[property="twitter:image"]', 'image']);

        console.log('>>> DESC : ' + thumb);

    }


    function summarize() {

        alert('summarize');

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

    function initialize() {

    }

    function bootstrap() {

        var scripts = [],
            noConflict = false;

        if (window.jQuery === undefined) {
            scripts.push('http://10.64.51.102:2000/components/jquery/dist/jquery.min.js');
        } else if (window.$ && window.$ !== window.jQuery) {
            noConflict = true;
        }
        scripts.push('http://10.64.51.102:2000/components/html2canvas/build/html2canvas.min.js');
        scripts.push('http://10.64.51.102:2000/components/rangy-1.3/rangy-core.js');

        loadScripts(scripts, function () {

            if (noConflict) {
                window.$.noConflict();
            }
            $ = window.jQuery;

            initialize();
        });

    }

    setTimeout(function() {

        bootstrap();

    }, 100);

})();