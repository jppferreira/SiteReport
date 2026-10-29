(function(){
  var t=document.body.innerText;
  function grab(name){
    var re=new RegExp(name+'[\\s\\S]{0,60}');
    var m=t.match(re);
    return m?m[0].replace(/\\s+/g,' ').trim():null;
  }
  return JSON.stringify({
    url: location.href,
    us: grab('United States'),
    uk: grab('United Kingdom'),
    fr: grab('France'),
    de: grab('Germany'),
    hasDialog: /Starting Subscription Price|Current Price|In-App Purchase Price/i.test(t)
  });
})();
