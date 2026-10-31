// Builds the editable text-animation templates (.mogrt) in After Effects and saves the source project.
// Run: AfterFX.exe -r "<this file>"   (AE needs Preferences > Scripting & Expressions > "Allow Scripts to Write
// Files and Access Network"). Log: %TEMP%\build_mogrts.log. ARGS (optional, set before $.evalFile):
//   {style:"dinheiro", out:"<folder>"}   style = key of STYLES below; out = where .mogrt/.aep go (default: this folder)
// Each template: 1080x1920 60 fps 10 s; layers CONTROLES (null at the caption line y=1138), VALOR, ROTULO.
// Essential properties (editable in Premiere > Essential Graphics / Effect Controls): Valor, Rotulo, Cor do valor,
// Cor do rotulo, Tamanho, Espacamento (50 = normal), Brilho,
// Velocidade (30 = normal, 60 = twice as fast, 15 = half; the slider goes to 100 = 3.3x).
// The animations are expressions (springs measured from the Remotion presets in ../motion), so Valor can be any text.
(function () {
  var A = (typeof ARGS !== "undefined" && ARGS) ? ARGS : {};
  var here = new File($.fileName).parent;
  var outDir = new Folder(A.out || here.fsName);
  var log = new File(Folder.temp.fsName + "/build_mogrts.log"), lines = [];
  function say(s) { lines.push(s); log.encoding = "UTF-8"; log.open("w"); log.write(lines.join("\n")); log.close(); }

  var STYLES = {
    dinheiro: {font: "Digital-7", color: [0, 1, 0], valor: "R$ 80", size: 200, labelSize: 100, prefix: "Dinheiro"},
    quantidade: {font: "DKLongreach-Regular", color: [1, 1, 1], valor: "146", size: 220, labelSize: 110, prefix: "Quantidade"},
    anos: {font: "DKLongreach-Regular", color: [1, 0.102, 0.102], valor: "40 ANOS", size: 220, labelSize: 110, prefix: "Anos"}
  };
  var st = STYLES[A.style || "dinheiro"];
  var LINE_Y = 1138, GAP = 18, REF = "thisComp.duration-0.05", SPEED_NORMAL = 30;

  // spring (damped oscillator), same shape as Remotion's spring(): f = natural frequency Hz, z = damping ratio
  var SPR = "function spr(t,f,z){if(t<=0)return 0;var w=2*Math.PI*f,wd=w*Math.sqrt(1-z*z);" +
            "return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z*w/wd*Math.sin(wd*t));}\n";
  var SRC = "var src=(typeof value==='string')?value:value.text;\n";   // inside a Source Text expression
  var SRC_T = "var sv=text.sourceText.value;var src=(typeof sv==='string')?sv:sv.text;\n";   // from another property
  // landing punch after a count/scramble ends at time e: 1 -> 1.13 -> 1
  var PUNCH = "function punch(t,e){return t<e?1:(t<e+0.07?linear(t,e,e+0.07,1,1.13):linear(t,e+0.07,e+0.25,1.13,1));}\n";
  var COUNT_END = "0.6", SCRAMBLE_END = "function scrEnd(src){var n=(src.match(/\\d/g)||[]).length;return 0.25+Math.max(0,n-1)*0.12;}\n";

  // per animation: expressions for the value line (delay 0) and the label (delay 0.1 s, or 0 for "queda")
  // pos(L) = extra [x,y] offset, scale(L) = %, rot(L) = deg, text(L) = Source Text, chars = per-letter selector amount
  function anims(name) {
    // t = animation time; Velocidade scales it (delays included). Premiere's slider stops at 100, so normal speed is
    // SPEED_NORMAL (30) and the user has room up to 3.3x: 60 = 2x, 15 = half.
    var D = function (L) { return "var t=(time-inPoint)*thisComp.layer('CONTROLES').effect('Velocidade')(1)/" + SPEED_NORMAL + "-" + (L == "ROTULO" && name != "queda" ? "0.1" : "0") + ";\n"; };
    var popS = function (L) { return D(L) + SPR + "var s=spr(t,2.32,0.47);"; };
    switch (name) {
      case "pop": return {
        scale: function (L) { return popS(L) + "[100*s,100*s]"; },
        rot: function (L) { return popS(L) + "(1-s)*-8"; }};
      case "queda": return {
        scale: function (L) { return D(L) + "t<0?[0,0]:[100,100]"; },
        pos: function (L) { return D(L) + SPR + "[0,-(1-spr(t,1.84,0.43))*420]"; }};
      case "impacto": return {
        scale: function (L) { return L == "VALOR" ? D(L) + "var p=Math.min(Math.max(t/0.1,0),1);var s=t<0?0:260-160*p*p*p;[s,s]" : popS(L) + "[100*s,100*s]"; },
        pos: function (L) { return L == "VALOR" ? D(L) + "var k=t>0.1?Math.exp(-(t-0.1)/0.1):0;[Math.sin(t*114)*16*k,Math.cos(t*138)*10*k]" : "[0,0]"; }};
      case "cascata": return {
        scale: function (L) { return D(L) + "t<0?[0,0]:[100,100]"; },
        chars: function (L) { return D(L) + SPR + "var a=100*(1-spr(t-(textIndex-1)*0.035,1.95,0.49));[a,a,a]"; }};
      case "contador": return {
        scale: function (L) { return L == "VALOR" ? popS(L) + PUNCH + "var k=100*s*punch(t," + COUNT_END + ");[k,k]" : popS(L) + "[100*s,100*s]"; },
        text: function (L) { return L != "VALOR" ? null : D(L) + SRC +
          "var m=src.match(/^(\\D*)([\\d.]+)([\\s\\S]*)$/);if(!m||t>=" + COUNT_END + "){src}else{" +
          "var dec=m[2].indexOf('.')>=0&&m[2].split('.').pop().length!=3;var num=parseFloat(dec?m[2]:m[2].replace(/\\./g,''));" +
          "var p=Math.min(Math.max(t/" + COUNT_END + ",0),1);p=1-Math.pow(1-p,3);var v=Math.round(num*p);" +
          "var s=String(v).replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.');m[1]+s+m[3]}"; }};
      case "roleta": return {   // slot machine: every digit spins (random) and lands one after the other
        scale: function (L) { return L == "VALOR" ? popS(L) + SRC_T + SCRAMBLE_END + PUNCH + "var k=(60+40*s)*punch(t,scrEnd(src));[k,k]" : popS(L) + "[100*s,100*s]"; },
        text: function (L) { return L != "VALOR" ? null : D(L) + SRC + SCRAMBLE_END +
          "var o='',k=0;for(var i=0;i<src.length;i++){var c=src.charAt(i);if(/\\d/.test(c)){if(t<0.25+k*0.12){" +
          "seedRandom(Math.floor(t*40)*7+i,true);o+=Math.floor(random(10));}else o+=c;k++;}else o+=c;}o"; }};
    }
    throw new Error("anim " + name);
  }

  function textLayer(comp, L, txt, size) {
    var lay = comp.layers.addText(txt);
    lay.name = L;
    var sp = lay.property("ADBE Text Properties").property("ADBE Text Document");
    var td = sp.value;
    try { td.resetCharStyle(); td.resetParagraphStyle(); } catch (e) {}
    td.font = st.font; td.fontSize = size; td.applyFill = true; td.fillColor = st.color;
    td.applyStroke = true; td.strokeColor = [0, 0, 0]; td.strokeWidth = 12; td.strokeOverFill = false;
    td.justification = ParagraphJustification.CENTER_JUSTIFY; td.tracking = 0;
    sp.setValue(td);
    // colour from the CONTROLES null (a text animator recolours the fill only; the black outline stays)
    var anims_ = lay.property("ADBE Text Properties").property("ADBE Text Animators");
    // each line has its own colour control (the user colours the value and the label differently)
    var an = anims_.addProperty("ADBE Text Animator"); an.name = "Cor";
    an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
    an.property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color").expression =
      'thisComp.layer("CONTROLES").effect("' + (L == "VALOR" ? "CorValor" : "CorRotulo") + '")(1)';
    // glow (LED look), intensity from Brilho
    var g = lay.property("ADBE Effect Parade").addProperty("ADBE Glo2");
    g.property("ADBE Glo2-0002").setValue(40);   // threshold %
    g.property("ADBE Glo2-0003").setValue(size * 0.15);   // radius
    g.property("ADBE Glo2-0004").expression = 'thisComp.layer("CONTROLES").effect("Brilho")(1)/100*1.2';
    lay.motionBlur = true;
    // anchor on the middle of the FINAL text (not the animated one, or it would jitter while counting/spinning)
    lay.property("ADBE Transform Group").property("ADBE Anchor Point").expression =
      "var r=sourceRectAtTime(" + REF + ",false);[r.left+r.width/2,r.top+r.height/2]";
    return lay;
  }

  function build(name, title) {
    var comp = app.project.items.addComp(st.prefix + " - " + title, 1080, 1920, 1, 10, 60);
    comp.motionBlur = true; comp.shutterAngle = 180; comp.shutterPhase = -90;
    var ctl = comp.layers.addNull(); ctl.name = "CONTROLES";
    var fx = ctl.property("ADBE Effect Parade");
    // effect names stay ASCII (they go into expressions); the names the user sees are set in the EGP below
    fx.addProperty("ADBE Color Control").name = "CorValor"; fx.property("CorValor").property(1).setValue(st.color);
    fx.addProperty("ADBE Color Control").name = "CorRotulo"; fx.property("CorRotulo").property(1).setValue(st.color);
    fx.addProperty("ADBE Slider Control").name = "Tamanho"; fx.property("Tamanho").property(1).setValue(100);
    fx.addProperty("ADBE Slider Control").name = "Espacamento"; fx.property("Espacamento").property(1).setValue(50);
    fx.addProperty("ADBE Slider Control").name = "Brilho"; fx.property("Brilho").property(1).setValue(50);
    fx.addProperty("ADBE Slider Control").name = "Velocidade"; fx.property("Velocidade").property(1).setValue(SPEED_NORMAL);
    var tr = ctl.property("ADBE Transform Group");
    // children sit at the null's anchor: anchor 0,0 + position = the caption line in the middle of the frame
    tr.property("ADBE Anchor Point").setValue([0, 0]);
    tr.property("ADBE Position").setValue([540, LINE_Y]);
    tr.property("ADBE Scale").expression = 'var k=effect("Tamanho")(1);[k,k]';
    var lab = textLayer(comp, "ROTULO", "", st.labelSize);
    var val = textLayer(comp, "VALOR", st.valor, st.size);
    // null's anchor is its own top-left: put children relative to its centre
    val.parent = ctl; lab.parent = ctl;
    var a = anims(name);
    // split "statements; lastExpression" so the base place and the animated offset can be combined
    var lastExpr = function (code) { var i = Math.max(code.lastIndexOf(";"), code.lastIndexOf("\n")); return [code.substring(0, i + 1), code.substring(i + 1)]; };
    var setL = function (lay, L) {
      var T = lay.property("ADBE Transform Group");
      var base = lastExpr(L == "VALOR" ? "[0,0]" : "var v=thisComp.layer('VALOR').sourceRectAtTime(" + REF + ",false);var r=sourceRectAtTime(" + REF + ",false);" +
        // Espacamento: 50 = normal gap, each step 2 px closer/farther
        "var g=" + GAP + "+(thisComp.layer('CONTROLES').effect('Espacamento')(1)-50)*2;[0,v.height/2+g+r.height/2]");
      var off = lastExpr(a.pos ? a.pos(L) : "[0,0]");
      T.property("ADBE Position").expression = base[0] + "var b=" + base[1] + ";\n" + off[0] + "add(b," + off[1] + ")";
      if (a.scale) T.property("ADBE Scale").expression = a.scale(L);
      if (a.rot) T.property("ADBE Rotate Z").expression = a.rot(L);
      if (a.text && a.text(L)) lay.property("ADBE Text Properties").property("ADBE Text Document").expression = a.text(L);
      if (a.chars) {
        var an = lay.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); an.name = "Cascata";
        var props = an.property("ADBE Text Animator Properties");
        props.addProperty("ADBE Text Position 3D").setValue([0, 90, 0]);
        props.addProperty("ADBE Text Scale 3D").setValue([0, 0, 0]);
        var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
        sel.property("ADBE Text Expressible Amount").expression = a.chars(L);
      }
    };
    setL(val, "VALOR"); setL(lab, "ROTULO");
    // digits that change every frame (count/scramble) turn into ghosts with motion blur
    if (name == "contador" || name == "roleta") val.motionBlur = false;
    // essential properties: Premiere lists them in REVERSE order of adding, so add from the bottom up
    // (property objects go stale when siblings are added: look the effects up again)
    fx = comp.layer("CONTROLES").property("ADBE Effect Parade");
    fx.property("Velocidade").property(1).addToMotionGraphicsTemplateAs(comp, "Velocidade");
    fx.property("Brilho").property(1).addToMotionGraphicsTemplateAs(comp, "Brilho");
    fx.property("Espacamento").property(1).addToMotionGraphicsTemplateAs(comp, "Espa\u00e7amento");
    fx.property("Tamanho").property(1).addToMotionGraphicsTemplateAs(comp, "Tamanho");
    fx.property("CorRotulo").property(1).addToMotionGraphicsTemplateAs(comp, "Cor do r\u00f3tulo");
    fx.property("CorValor").property(1).addToMotionGraphicsTemplateAs(comp, "Cor do valor");
    comp.layer("ROTULO").property("ADBE Text Properties").property("ADBE Text Document").addToMotionGraphicsTemplateAs(comp, "R\u00f3tulo");
    comp.layer("VALOR").property("ADBE Text Properties").property("ADBE Text Document").addToMotionGraphicsTemplateAs(comp, "Valor");
    comp.motionGraphicsTemplateName = comp.name;
    // the 2nd argument is the FOLDER; the file is named after motionGraphicsTemplateName. The export invalidates the
    // comp object, so look it up again by id.
    var id = comp.id, f = new File(outDir.fsName + "/" + comp.name + ".mogrt");
    app.project.save();   // every export needs the project saved, or AE opens a "save first?" dialog
    var ok = comp.exportAsMotionGraphicsTemplate(true, outDir.fsName);
    comp = app.project.itemByID(id);
    // expression errors would make the template render wrong: check every expression now
    var errs = [];
    for (var i = 1; i <= comp.numLayers; i++) collectErrs(comp.layer(i), comp.layer(i).name, errs);
    say((ok ? "ok   " : "FAIL ") + f.fsName + (errs.length ? "\n  expr errors: " + errs.join(" | ") : ""));
    return comp;
  }
  function collectErrs(p, path, errs) {
    try {
      if (p.propertyType == PropertyType.PROPERTY) { if (p.canSetExpression && p.expression && p.expressionError) errs.push(path + ": " + p.expressionError); return; }
      for (var i = 1; i <= p.numProperties; i++) collectErrs(p.property(i), path + "/" + p.property(i).name, errs);
    } catch (e) {}   // some internal groups are not readable from scripts
  }

  try {
    // rebuild: drop comps of this style from a previous run (and the solids of their nulls); anything else = user work
    for (var i = app.project.numItems; i >= 1; i--) {
      var it = app.project.item(i);
      if (it instanceof CompItem && it.name.indexOf(st.prefix + " - ") == 0) it.remove();
    }
    for (var i = app.project.numItems; i >= 1; i--) {
      var it = app.project.item(i);
      if (it instanceof FootageItem && it.mainSource instanceof SolidSource && it.usedIn.length == 0) it.remove();
      else if (it instanceof FolderItem && it.numItems == 0) it.remove();
    }
    if (app.project.numItems > 0) { say("ERRO: o projeto aberto no AE tem outros itens; abra um projeto vazio"); return; }
    // MOGRT export needs a saved project (otherwise AE opens a Save dialog and the script stops there)
    app.project.save(new File(outDir.fsName + "/" + st.prefix + " - animacoes.aep"));
    app.beginUndoGroup("build mogrts");
    var list = A.only ? A.only : ["pop", "queda", "impacto", "cascata", "contador", "roleta"];
    var titles = {pop: "Pop", queda: "Queda", impacto: "Impacto", cascata: "Cascata", contador: "Contador", roleta: "Roleta"};
    for (var i = 0; i < list.length; i++) build(list[i], titles[list[i]]);
    app.endUndoGroup();
    app.project.save(new File(outDir.fsName + "/" + st.prefix + " - animacoes.aep"));
    say("aep: " + outDir.fsName + "/" + st.prefix + " - animacoes.aep");
  } catch (e) { say("ERRO linha " + e.line + ": " + e.toString()); }
})();
