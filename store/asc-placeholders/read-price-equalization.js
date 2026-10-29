(function () {
  var t = document.body.innerText;
  function line(re) {
    var m = t.match(re);
    return m ? m[0] : null;
  }
  return JSON.stringify({
    url: location.href,
    base: line(/Base Country or Region[\s\S]{0,200}/) || line(/base country[\s\S]{0,120}/i),
    auto: /May Adjust Automatically|automatically adjust|equaliz|foreign exchange/i.test(t),
    autoSnippets: (t.match(/[^\n]*(May Adjust Automatically|automatically adjust|foreign exchange|Base Country)[^\n]*/gi) || []).slice(0, 10),
    us: line(/United States \(USD\)\t[^\n]+/) || line(/United States \(USD\)[\s\S]{0,50}/),
    uk: line(/United Kingdom \(GBP\)\t[^\n]+/) || line(/United Kingdom \(GBP\)[\s\S]{0,50}/),
    fr: line(/France \(EUR\)\t[^\n]+/) || line(/France \(EUR\)[\s\S]{0,50}/),
    de: line(/Germany \(EUR\)\t[^\n]+/) || line(/Germany \(EUR\)[\s\S]{0,50}/),
    hasDialog: /Starting Subscription Price|Current Price|In-App Purchase Price/i.test(t)
  });
})();
