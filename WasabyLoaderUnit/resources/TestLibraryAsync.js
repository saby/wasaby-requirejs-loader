define(['WasabyLoaderUnit/resources/TestControlAsync'], function (TestControlAsync) {
    return {
        exportFunction: function(echo) { return echo; },
        exportSyncFunction: function(echo) { return echo; },
        TestControlAsync: TestControlAsync
    };
});
