(function () {

    'use strict';

    var app;

    var CONFIG;

    CONFIG = {
    };

    app = angular.module('web-clipper', ['ngSanitize', 'ui.bootstrap', function ($provide) {

        return $provide.decorator('$rootScope', [
            '$delegate', function ($delegate) {
            $delegate.safeApply = function (fn) {
                var phase = $delegate.$$phase;
                if (phase === "$apply" || phase === "$digest") {
                    if (fn && typeof fn === 'function') {
                        fn();
                    }
                } else {
                    $delegate.$apply(fn);
                }
            };
            return $delegate;
        }]);
    }]);

    app.controller('main', function ($scope, $element, $http, $timeout, $location, $filter, $modal) {

        console.log('aaa');
    });

})();