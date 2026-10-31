# Adjusts a .mogrt exported by mogrt_dinheiro.jsx. After Effects scripting cannot turn on font editing (font, faux
# style, font size) of a text control nor set the slider ranges shown in Premiere, so this rewrites the .mogrt (a zip):
#  - definition.json: font-edit flags, slider ranges, control order;
#  - project.aegraphic (zip with the .aep, which is what Premiere really reads): the 3 one-byte RIFX chunks
#    CFEd/CSEd/CFEd before each text-control JSON, and the JSON flags themselves (mogrt_rifx fixes the chunk sizes);
#  - a new capsuleID, because Premiere keeps a template in memory by its ID for the whole session.
# Run it only on a fresh export (the AE script re-exports in seconds).
# Usage: python mogrt_ajustar.py "C:/.../Dinheiro.mogrt"
import io, json, os, shutil, sys, uuid, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mogrt_rifx

RANGES = {"Tamanho": (0, 300), "Espaçamento": (0, 200), "Brilho": (0, 100), "Velocidade": (1, 100),
          "Atraso do rótulo": (0, 5)}
FONT_EDIT = {"Valor", "Rótulo"}
# AE writes the controls in reverse order; definition.json follows the panel order of the user's mock-up
ORDER = ["Valor", "Rótulo", "Cor do valor", "Cor do rótulo", "Tamanho", "Espaçamento", "Brilho", "Velocidade",
         "Animação", "Atraso do rótulo"]

def ui_name(c):
    try:
        return c["uiName"]["strDB"][0]["str"]
    except (KeyError, IndexError, TypeError):
        return ""

path = sys.argv[1]
with zipfile.ZipFile(path) as z:
    files = {n: z.read(n) for n in z.namelist()}
d = json.loads(files["definition.json"].decode("utf-8"))
done = []
for c in d.get("clientControls", []):
    n = ui_name(c)
    if n in FONT_EDIT and "fonteditinfo" in c:
        for k in ("capPropFontEdit", "capPropFontFauxStyleEdit", "capPropFontSizeEdit"):
            c["fonteditinfo"][k] = True
        done.append(n + ": fonte editavel")
    if n in RANGES and str(c.get("type")) == "2":
        c["min"], c["max"] = RANGES[n]
        done.append("%s: %s-%s" % (n, RANGES[n][0], RANGES[n][1]))
d["clientControls"] = sorted(d.get("clientControls", []),
                             key=lambda c: ORDER.index(ui_name(c)) if ui_name(c) in ORDER else len(ORDER))

old_id = d["capsuleID"].encode(); new_id = str(uuid.uuid4()).encode(); d["capsuleID"] = new_id.decode()
OFF = b"CFEd\x00\x00\x00\x01\x00\x00CSEd\x00\x00\x00\x01\x00\x00CFEd\x00\x00\x00\x01\x00"
with zipfile.ZipFile(io.BytesIO(files["project.aegraphic"])) as zi:
    inner = [(i, zi.read(i.filename)) for i in zi.infolist()]
buf = io.BytesIO()
with zipfile.ZipFile(buf, "w") as zo:
    for info, data in inner:
        if info.filename.lower().endswith(".aep"):
            nb = data.count(OFF)
            data = data.replace(OFF, OFF.replace(b"\x01\x00", b"\x01\x01"))
            data, nj = mogrt_rifx.set_font_flags(data)
            done.append("aep: %d blocos binarios e %d JSON de fonte ligados" % (nb, nj))
        zo.writestr(info, data.replace(old_id, new_id))
files["project.aegraphic"] = buf.getvalue()
done.append("capsuleID novo: " + new_id.decode())

files["definition.json"] = json.dumps(d, ensure_ascii=False, indent=1).encode("utf-8")
tmp = path + ".tmp"
with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
    for n, b in files.items():
        z.writestr(n, b)
shutil.move(tmp, path)
print("\n".join(done) or "nada alterado")
print("controles:", [ui_name(c) for c in d.get("clientControls", [])])
