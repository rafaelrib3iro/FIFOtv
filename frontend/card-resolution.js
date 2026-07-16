(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined') module.exports = api;
    root.FIFOtvCardResolution = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
    function resolveStreamingById(streamings, id) {
        return streamings.find((streaming) => streaming.id === id) || null;
    }

    return { resolveStreamingById };
});
