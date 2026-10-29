(function () {
  var dialog = document.querySelector('[role=dialog]');
  if (!dialog) return JSON.stringify({ error: 'no dialog' });

  var none = [].slice.call(dialog.querySelectorAll('a,button')).find(function (a) {
    return (a.innerText || '').trim() === 'None';
  });
  if (none) none.click();

  function setChecked(labelText, want) {
    var labels = [].slice.call(dialog.querySelectorAll('label, div, span, li'));
    var el = labels.find(function (n) {
      var t = (n.innerText || '').trim();
      return t === labelText || t.split('\n')[0] === labelText;
    });
    if (!el) return { label: labelText, found: false };
    var input = null;
    var row = el;
    for (var i = 0; i < 4 && row; i++) {
      input = row.querySelector && row.querySelector('input[type=checkbox]');
      if (input) break;
      row = row.parentElement;
    }
    if (input && !!input.checked !== want) input.click();
    return { label: labelText, found: !!input, checked: input && input.checked };
  }

  setChecked('United States', true);
  setChecked('Canada', false);
  var europe = [
    'Albania', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina', 'Bulgaria',
    'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France',
    'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo', 'Latvia',
    'Lithuania', 'Luxembourg', 'Malta', 'Moldova', 'Montenegro', 'Netherlands',
    'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia', 'Serbia',
    'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Türkiye', 'Ukraine',
    'United Kingdom'
  ];
  europe.forEach(function (c) { setChecked(c, true); });

  var selected = [].slice.call(dialog.querySelectorAll('input[type=checkbox]')).filter(function (c) {
    return c.checked;
  }).length;

  var next = [].slice.call(dialog.querySelectorAll('button')).find(function (b) {
    return (b.innerText || '').trim() === 'Next';
  });
  if (next) next.click();

  return JSON.stringify({ selected: selected, next: !!next });
})();
