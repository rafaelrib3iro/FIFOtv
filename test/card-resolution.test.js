const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveAppById } = require('../frontend/card-resolution');

const apps = [
    { id: 1, name: 'Netflix' },
    { id: 2, name: 'YouTube' },
    { id: 3, name: 'Nuvio' },
    { id: 4, name: 'Max' },
];

test('resolves a main-grid card by its stable ID with no recents', () => {
    assert.equal(resolveAppById(apps, 2)?.name, 'YouTube');
});

test('resolves a card by its stable ID with one recent', () => {
    assert.equal(resolveAppById(apps, 4)?.name, 'Max');
});

test('resolves a card by its stable ID with four recents reordered', () => {
    assert.equal(resolveAppById(apps, 1)?.name, 'Netflix');
});

test('does not resolve a removed card', () => {
    assert.equal(resolveAppById(apps, 99), null);
});
