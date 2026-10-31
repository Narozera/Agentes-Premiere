// Builds the "Dinheiro" Motion Graphics Template in After Effects: editable value + label (text, font, size in
// Premiere's Properties panel), value/label colors, Tamanho, Espaçamento (gap between the lines), Brilho (glow),
// Velocidade, Animação (Bounce/Pop/Stamp/Slide) and Atraso do rótulo (label appears when the 2nd value is spoken).
// Run: AfterFX.exe -r mogrt_dinheiro.jsx   (paths in CFG below; writes a log next to the .mogrt)
// After export, mogrt_ajustar.py sets the font-edit flags and slider ranges in definition.json.
var CFG = { out: "C:/Edi\u00e7\u00f5es/Videos Tony/Videos/animacoes/Dinheiro.mogrt", font: "Digital-7" };
(function () {
  // log reopened per line: if AE stops on a modal error, what ran so far is already on disk
  var log = new File(CFG.out.replace(/\.mogrt$/, "_ae.log")); log.encoding = "UTF-8"; log.open("w"); log.close();
  function L(s) { log.open("a"); log.writeln(String(s)); log.close(); }
  try {
    app.beginSuppressDialogs();
    if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);   // avoids the "save changes?" dialog
    var proj = app.newProject(); L("projeto novo");
    var comp = proj.items.addComp("Dinheiro", 1080, 1920, 1, 10, 60);
    var ctrl = comp.layers.addNull(); ctrl.name = "Controles"; ctrl.enabled = false;
    var fxs = ctrl.property("ADBE Effect Parade");
    function slider(name, v) { var e = fxs.addProperty("ADBE Slider Control"); e.name = name; e.property(1).setValue(v); return e; }
    function color(name, rgb) { var e = fxs.addProperty("ADBE Color Control"); e.name = name; e.property(1).setValue(rgb); return e; }
    color("Cor do valor", [0, 1, 18 / 255]);
    color("Cor do r\u00f3tulo", [0, 1, 18 / 255]);
    slider("Tamanho", 100); slider("Espa\u00e7amento", 20); slider("Brilho", 0); slider("Velocidade", 50);
    // setPropertyParameters recreates the dropdown effect and resets its name: rename it afterwards
    var dd = fxs.addProperty("ADBE Dropdown Control");
    dd.property(1).setPropertyParameters(["Bounce", "Pop", "Stamp", "Slide"]);
    fxs.property(fxs.numProperties).name = "Anima\u00e7\u00e3o";
    slider("Atraso do r\u00f3tulo", 0.1);
    var fxNames = []; for (var q = 1; q <= fxs.numProperties; q++) fxNames.push(fxs.property(q).name);
    L("controles: " + fxNames.join(", "));

    function textLayer(name, txt, size) {
      var l = comp.layers.addText(txt); l.name = name;
      var st = l.property("ADBE Text Properties").property("ADBE Text Document"), d = st.value;
      d.resetCharStyle(); d.font = CFG.font; d.fontSize = size; d.fillColor = [0, 1, 18 / 255];
      d.applyStroke = true; d.strokeColor = [0, 0, 0]; d.strokeWidth = 6; d.strokeOverFill = false;
      d.justification = ParagraphJustification.CENTER_JUSTIFY; st.setValue(d);
      return l;
    }
    var V = textLayer("Valor", "R$ 100", 200), R = textLayer("Rotulo", "A R$ 120", 100);

    // shared expressions: T = time since this line appears (Velocidade 50 = normal speed)
    function head(delay) {
      return 'var c=thisComp.layer("Controles");\n' +
        'var spd=Math.max(c.effect("Velocidade")(1),1)/50;\n' +
        'var mode=Math.round(c.effect("Anima\u00e7\u00e3o")(1));\n' +
        'var T=(time-inPoint-(' + delay + '))*spd;\n';
    }
    var layout = 'var S=c.effect("Tamanho")(1)/100, g=c.effect("Espa\u00e7amento")(1);\n' +
      'var rv=thisComp.layer("Valor").sourceRectAtTime(time,false), rr=thisComp.layer("Rotulo").sourceRectAtTime(time,false);\n' +
      'var vh=rv.height, rh=rr.height; if(rh<1){g=0;}\n' +
      'var H=(vh+g+rh)*S, cx=thisComp.width/2, cy=thisComp.height/2;\n';
    var offset = 'var dx=0, dy=0;\n' +
      'if(T<0){ dy=(mode==1)?-200:0; }\n' +
      'else if(mode==1){ dy=-200*Math.exp(-5.5*T)*Math.cos(9*T); }\n' +
      'else if(mode==3 && T>0.12 && T<0.32){ dx=12*Math.sin(T*110)*(0.32-T)/0.2; }\n' +
      'else if(mode==4){ var u=Math.min(Math.max(T/0.32,0),1); dy=140*Math.pow(1-u,3); }\n';
    var scale = 'var a=1;\n' +
      'if(T<0){a=0;}\n' +
      'else if(mode==2){ a=T<0.15?1.15*T/0.15:(T<0.25?1.15-0.15*(T-0.15)/0.1:1); }\n' +
      'else if(mode==3){ a=T<0.12?2.2-1.2*T/0.12:1; }\n' +
      'var s=c.effect("Tamanho")(1)*a; [s,s]';
    var delays = { Valor: '0', Rotulo: 'thisComp.layer("Controles").effect("Atraso do r\u00f3tulo")(1)' };
    var colors = { Valor: "Cor do valor", Rotulo: "Cor do r\u00f3tulo" };
    var layers = [V, R];
    for (var i = 0; i < 2; i++) {
      var l = layers[i], tr = l.property("ADBE Transform Group");
      tr.property("ADBE Anchor Point").expression = 'var r=sourceRectAtTime(time,false); [r.left+r.width/2, r.top+r.height/2]';
      tr.property("ADBE Position").expression = head(delays[l.name]) + layout + offset +
        (l.name == "Valor" ? '[cx+dx, cy-H/2+vh*S/2+dy]' : '[cx+dx, cy+H/2-rh*S/2+dy]');
      tr.property("ADBE Scale").expression = head(delays[l.name]) + scale;
      tr.property("ADBE Opacity").expression = head(delays[l.name]) + 'T<0?0:100';
      // fill color from the control (an animator changes only the fill, the black stroke stays)
      var an = l.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
      var fc = an.property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color");
      fc.expression = 'thisComp.layer("Controles").effect("' + colors[l.name] + '")(1)';
      var gl = l.property("ADBE Effect Parade").addProperty("ADBE Glo2");
      gl.property("ADBE Glo2-0003").setValue(25);
      gl.property("ADBE Glo2-0004").expression = 'thisComp.layer("Controles").effect("Brilho")(1)/50';
    }

    // Essential Graphics panel, in the order of the user's mock-up
    comp.motionGraphicsTemplateName = "Dinheiro";
    function eg(p, name) { if (!p.addToMotionGraphicsTemplateAs(comp, name)) L("falhou EG: " + name); }
    eg(V.property("ADBE Text Properties").property("ADBE Text Document"), "Valor");
    eg(R.property("ADBE Text Properties").property("ADBE Text Document"), "R\u00f3tulo");
    var names = ["Cor do valor", "Cor do r\u00f3tulo", "Tamanho", "Espa\u00e7amento", "Brilho", "Velocidade", "Anima\u00e7\u00e3o", "Atraso do r\u00f3tulo"];
    for (var k = 0; k < names.length; k++) eg(ctrl.property("ADBE Effect Parade").property(names[k]).property(1), names[k]);

    L("EG: " + comp.motionGraphicsTemplateControllerCount + " controles");
    var errs = [];
    function walk(g, path) {
      for (var k = 1; k <= g.numProperties; k++) {
        var p = g.property(k);
        if (p.propertyType == PropertyType.PROPERTY) { if (p.canSetExpression && p.expression != "" && p.expressionError != "") errs.push(path + "/" + p.name + ": " + p.expressionError); }
        else walk(p, path + "/" + p.name);
      }
    }
    for (var j = 1; j <= comp.numLayers; j++) walk(comp.layer(j), comp.layer(j).name);
    L(errs.length ? "ERROS DE EXPRESSAO:\n" + errs.join("\n") : "expressoes ok");
    var aep = new File(CFG.out.replace(/\.mogrt$/, ".aep"));
    proj.save(aep); L("aep: " + aep.fsName);
    try { comp.openInEssentialGraphics(); } catch (e) { L("openInEssentialGraphics: " + e); }
    var ok = comp.exportAsMotionGraphicsTemplate(true, CFG.out);
    L("export: " + ok + " -> " + CFG.out);
  } catch (e) { L("ERRO: " + e + " linha " + e.line); }
  L("FIM"); log.close();
  app.endSuppressDialogs(false);
})();
