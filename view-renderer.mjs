export function renderActiveView(activeView, renderers) {
    const render = renderers[activeView];
    if (typeof render === "function") render();
}
