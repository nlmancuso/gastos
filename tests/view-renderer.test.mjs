import test from "node:test";
import assert from "node:assert/strict";
import { renderActiveView } from "../view-renderer.mjs";

test("renders only the selected view", () => {
    const calls = [];
    const views = ["planilla", "analisis", "saldos", "mensual", "hormiga"];
    const renderers = Object.fromEntries(
        views.map(view => [
            view,
            () => calls.push(view)
        ])
    );

    for (const view of views) {
        calls.length = 0;
        renderActiveView(view, renderers);
        assert.deepEqual(calls, [view]);
    }
});

test("does nothing for an unknown or missing view", () => {
    let calls = 0;
    const renderers = { planilla: () => calls++ };

    renderActiveView("unknown", renderers);
    renderActiveView(undefined, renderers);

    assert.equal(calls, 0);
});
