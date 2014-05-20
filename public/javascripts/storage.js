/*jslint browser: true, indent: 4 */
/*global top: true */
(function () {

    'use strict';

    var footPrint = {};

    function postMessage(message, key, origin) {

        origin = origin || document.referrer.replace(/(http[s]{0,1}:\/\/*?\/)*$/, '$1');

        message = message || {};
        message._key = key;
        delete message._origin;
        top.window.postMessage(JSON.stringify(message), origin);
    }

    function syncToFootPrint() {

        var inx, key;

        for (inx = 0, footPrint = {}; inx < localStorage.length; inx++) {
            key = localStorage.key(inx);
            footPrint[key] = localStorage.getItem(key);
        }
    }

    function inspect() {

        var inx, key,
            lKeys = {},
            hasChanges = false;

        for (inx = 0; inx < localStorage.length; inx++) {
            lKeys[localStorage.key(inx)] = true;
        }
        for (key in footPrint) {
            if (footPrint.hasOwnProperty(key)) {
                if (lKeys[key] === true) {
                    if (footPrint[key] !== localStorage[key]) {
                        // modified.
                        postMessage({
                            _type: 'modify',
                            key: key,
                            value: localStorage[key]
                        });
                        hasChanges = true;
                    }
                    delete lKeys[key];
                } else {
                    // removed.
                    postMessage({
                        _type: 'remove',
                        key: key
                    });
                    hasChanges = true;
                }
            }
        }
        for (key in lKeys) {
            if (lKeys.hasOwnProperty(key)) {
                // created.
                postMessage({
                    _type: 'create',
                    key: key,
                    value: localStorage[key]
                });
                hasChanges = true;
            }
        }
        if (hasChanges) {
            syncToFootPrint();
        }

        setTimeout(inspect, 50);
    }

    $(document).ready(function () {

        syncToFootPrint();

        $(window).on('message', function (event) {

            var data, value;

            try {
                data = JSON.parse(event.originalEvent.data);
            } catch (ignore) {
                // noop
            }

            if (data.method === 'get') {

                value = JSON.parse(localStorage.getItem(data.key)) || {};
                delete value._owner;    
                postMessage({
                    result: value
                }, data._key, data._origin);

            } else if (data.method === 'set') {

                localStorage.setItem(data.key, JSON.stringify(data.value));
                postMessage({
                    result: true
                }, data._key, data._origin);
                inspect();
                //syncToFootPrint();
            }
        });

        inspect();
    });

}());