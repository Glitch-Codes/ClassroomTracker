chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('main.html', {
    'id': 'ClassroomTracker',
    'width': 480,
    'height': 480
  });
});
