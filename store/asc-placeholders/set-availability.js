(function () {
  var all = [].slice.call(document.querySelectorAll('*'));
  var heading = all.find(function (el) {
    return (el.innerText || '').trim() === 'Availability';
  });
  if (!heading) return JSON.stringify({ error: 'no Availability' });
  var root = heading.parentElement;
  var edit = null;
  for (var i = 0; i < 5 && root; i++) {
    edit = [].slice.call(root.querySelectorAll('a,button')).find(function (el) {
      return (el.innerText || '').trim() === 'Edit';
    });
    if (edit) break;
    root = root.parentElement;
  }
  if (!edit) return JSON.stringify({ error: 'no Edit' });
  edit.click();
  return JSON.stringify({ opened: true });
})();
