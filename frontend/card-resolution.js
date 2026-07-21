(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined') module.exports = api;
    root.FIFOtvCardResolution = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
    function resolveAppById(apps, id) {
        return apps.find((app) => app.id === id) || null;
    }

    return { resolveAppById };
});
