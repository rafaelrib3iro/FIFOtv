function isCurrentView(view, generation, currentView, currentGeneration) {
  return view === currentView
    && generation === currentGeneration
    && !view.webContents.isDestroyed();
}

module.exports = { isCurrentView };
