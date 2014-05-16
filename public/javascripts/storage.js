/*jslint browser: true, indent: 4 */
/*global top: true */
(function () {

    'use strict';

    $(document).ready(function () {

        function postMessage(message, key, origin) {

            message = message || {};
            message._key = key;
            delete message._origin;
            top.window.postMessage(JSON.stringify(message), origin);
        }

        $(window).on('message', function (event) {

            var data;

            try {
                data = JSON.parse(event.originalEvent.data);
            } catch (ignore) {
                // noop
            }

            if (data.method === 'get') {

                postMessage({
                    result: JSON.parse(localStorage.getItem(data.key)) || {}
                }, data._key, data._origin);

            } else if (data.method === 'set') {

                localStorage.setItem(data.key, JSON.stringify(data.value));
                postMessage({
                    result: true
                }, data._key, data._origin);

            }

        });

    });

}());